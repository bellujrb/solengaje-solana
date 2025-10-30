//! # Cancel Campaign Instruction
//! 
//! This module defines the instruction for canceling an active or pending campaign.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Cancels an active or pending campaign and refunds any remaining USDC to the brand.
///
/// This function can only be called by the brand that created the campaign.
/// If the campaign is `Active`, any remaining USDC in the campaign's vault
/// (total amount minus paid amount) is transferred back to the brand's USDC account.
/// The campaign status is then set to `Cancelled`.
///
/// # Arguments
///
/// * `ctx` - The context for the `CancelCampaign` instruction.
///
/// # Errors
///
/// This function will return an `ErrorCode` if any of the following conditions are met:
/// * `CampaignAlreadyCompleted` - If the campaign is already in `Completed` status.
/// * `UnauthorizedBrand` - If the calling brand does not match the campaign's brand.
/// * `MathOverflow` - If an arithmetic operation results in an overflow during refund calculation.
pub fn cancel_campaign(ctx: Context<CancelCampaign>) -> Result<()> {
    // Security validations
    require!(ctx.accounts.campaign.status != CampaignStatus::Completed, ErrorCode::CampaignAlreadyCompleted);
    require_keys_eq!(ctx.accounts.brand.key(), ctx.accounts.campaign.brand, ErrorCode::UnauthorizedBrand);

    if ctx.accounts.campaign.status == CampaignStatus::Active {
        let remaining_amount = ctx.accounts.campaign.amount_usdc.checked_sub(ctx.accounts.campaign.paid_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        if remaining_amount > 0 {
            let bump = ctx.bumps.campaign;
            let seeds = &[
                b"campaign".as_ref(),
                ctx.accounts.campaign.influencer.as_ref(),
                ctx.accounts.campaign.brand.as_ref(),
                ctx.accounts.campaign.name.as_bytes(),
                &[bump],
            ];
            let signer = &[&seeds[..]];

            // CPI to transfer remaining USDC from campaign vault to brand
            let cpi_accounts = Transfer {
                from: ctx.accounts.campaign_usdc_account.to_account_info(),
                to: ctx.accounts.brand_usdc_account.to_account_info(),
                authority: ctx.accounts.campaign.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, remaining_amount)?;
        }
    }

    ctx.accounts.campaign.status = CampaignStatus::Cancelled;
    ctx.accounts.campaign.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}

/// Accounts for the `cancel_campaign` instruction.
#[derive(Accounts)]
pub struct CancelCampaign<'info> {
    /// The campaign account.
    ///
    /// Must be mutable, have the correct brand, and be a PDA derived from
    /// `["campaign", campaign.influencer, campaign.brand, campaign.name]`.
    #[account(
        mut,
        has_one = brand,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// The brand's signer account.
    #[account(mut)]
    pub brand: Signer<'info>,
    /// The brand's USDC token account (destination for refund).
    #[account(mut)]
    pub brand_usdc_account: Account<'info, TokenAccount>,
    /// The campaign's USDC vault token account (source for refund).
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    /// The SPL Token program.
    pub token_program: Program<'info, Token>,
}
