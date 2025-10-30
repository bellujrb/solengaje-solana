//! # Update Campaign Metrics Instruction
//! 
//! This module defines the instruction for updating campaign metrics and triggering milestone payments.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Updates campaign metrics and triggers automatic milestone payments.
///
/// This function is callable only by the authorized oracle. It calculates the progress
/// based on the updated metrics and pays out any newly achieved milestones (10%, 20%, ..., 100%).
/// The campaign is automatically closed when 100% progress is reached.
///
/// # Arguments
///
/// * `ctx` - The context for the `UpdateCampaignMetrics` instruction.
/// * `likes` - The current number of likes.
/// * `comments` - The current number of comments.
/// * `views` - The current number of views.
/// * `shares` - The current number of shares.
///
/// # Errors
///
/// This function will return an `ErrorCode` if any of the following conditions are met:
/// * `CampaignNotActive` - If the campaign is not in `Active` status.
/// * `CampaignExpired` - If the campaign deadline has passed.
/// * `MathOverflow` - If an arithmetic operation results in an overflow during payment calculation.
pub fn update_campaign_metrics(
    ctx: Context<UpdateCampaignMetrics>,
    likes: u64,
    comments: u64,
    views: u64,
    shares: u64,
) -> Result<()> {
    // Validate campaign status and deadline
    require_eq!(ctx.accounts.campaign.status, CampaignStatus::Active, ErrorCode::CampaignNotActive);
    require!(Clock::get()?.unix_timestamp < ctx.accounts.campaign.deadline, ErrorCode::CampaignExpired);

    let old_progress = ctx.accounts.campaign.get_progress_percentage();

    // Update current metrics and last updated timestamp
    ctx.accounts.campaign.current_likes = likes;
    ctx.accounts.campaign.current_comments = comments;
    ctx.accounts.campaign.current_views = views;
    ctx.accounts.campaign.current_shares = shares;
    ctx.accounts.campaign.last_updated = Clock::get()?.unix_timestamp;

    let new_progress = ctx.accounts.campaign.get_progress_percentage();

    let old_milestones_achieved = (old_progress / 10) as usize;
    let new_milestones_achieved = (new_progress / 10) as usize;

    // Iterate through newly achieved milestones and process payments
    for milestone_index in old_milestones_achieved..new_milestones_achieved {
        let amount_to_transfer = ctx.accounts.campaign.calculate_safe_payment(milestone_index)?;

        if amount_to_transfer > 0 {
            if let Ok(_) = ctx.accounts.campaign.validate_payment_safety(milestone_index, amount_to_transfer) {
                let bump = ctx.bumps.campaign;
                let seeds = &[
                    b"campaign".as_ref(),
                    ctx.accounts.campaign.influencer.as_ref(),
                    ctx.accounts.campaign.brand.as_ref(),
                    ctx.accounts.campaign.name.as_bytes(),
                    &[bump],
                ];
                let signer = &[&seeds[..]];

                // CPI to transfer USDC from campaign vault to influencer
                let cpi_accounts = Transfer {
                    from: ctx.accounts.campaign_usdc_account.to_account_info(),
                    to: ctx.accounts.influencer_usdc_account.to_account_info(),
                    authority: ctx.accounts.campaign.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

                match token::transfer(cpi_ctx, amount_to_transfer) {
                    Ok(_) => {
                        ctx.accounts.campaign.paid_amount = ctx.accounts.campaign.paid_amount.checked_add(amount_to_transfer).ok_or(ErrorCode::MathOverflow)?;
                        ctx.accounts.campaign.payment_milestones[milestone_index] = true;
                    },
                    Err(e) => {
                        msg!("Payment failed for milestone {}: {:?}", milestone_index, e);
                    }
                }
            } else {
                msg!("Payment validation failed for milestone {}", milestone_index);
            }
        }
    }

    // If 100% progress is reached, complete the campaign and refund rent
    if new_progress >= 100 {
        ctx.accounts.campaign.status = CampaignStatus::Completed;

        // Close the campaign account and refund rent to oracle
        let campaign_lamports = ctx.accounts.campaign.to_account_info().lamports();

        **ctx.accounts.campaign.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.oracle.to_account_info().try_borrow_mut_lamports()? = ctx
            .accounts
            .oracle
            .to_account_info()
            .lamports()
            .checked_add(campaign_lamports)
            .ok_or(ErrorCode::MathOverflow)?;
    }

    Ok(())
}

/// Accounts for the `update_campaign_metrics` instruction.
#[derive(Accounts)]
pub struct UpdateCampaignMetrics<'info> {
    /// The campaign account.
    ///
    /// Must be mutable, have the correct oracle, and be a PDA derived from
    /// `["campaign", campaign.influencer, campaign.brand, campaign.name]`.
    #[account(
        mut,
        has_one = oracle,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// The oracle's signer account.
    #[account(mut)]
    pub oracle: Signer<'info>,
    /// The campaign's USDC vault token account (source for payments).
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    /// The influencer's USDC token account (destination for payments).
    #[account(mut)]
    pub influencer_usdc_account: Account<'info, TokenAccount>,
    /// The SPL Token program.
    pub token_program: Program<'info, Token>,
    /// The Solana system program.
    pub system_program: Program<'info, System>,
}
