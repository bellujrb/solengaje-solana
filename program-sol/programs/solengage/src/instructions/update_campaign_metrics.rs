use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

pub fn update_campaign_metrics(
    ctx: Context<UpdateCampaignMetrics>,
    likes: u64,
    comments: u64,
    views: u64,
    shares: u64,
) -> Result<()> {
    require_eq!(ctx.accounts.campaign.status, CampaignStatus::Active, ErrorCode::CampaignNotActive);
    require!(Clock::get()?.unix_timestamp < ctx.accounts.campaign.deadline, ErrorCode::CampaignExpired);

    let old_progress = ctx.accounts.campaign.get_progress_percentage();

    // Update metrics
    ctx.accounts.campaign.current_likes = likes;
    ctx.accounts.campaign.current_comments = comments;
    ctx.accounts.campaign.current_views = views;
    ctx.accounts.campaign.current_shares = shares;
    ctx.accounts.campaign.last_updated = Clock::get()?.unix_timestamp;

    let new_progress = ctx.accounts.campaign.get_progress_percentage();

    let old_milestones_achieved = (old_progress / 10) as usize;
    let new_milestones_achieved = (new_progress / 10) as usize;

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

#[derive(Accounts)]
pub struct UpdateCampaignMetrics<'info> {
    #[account(
        mut,
        has_one = oracle,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub oracle: Signer<'info>,
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub influencer_usdc_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
