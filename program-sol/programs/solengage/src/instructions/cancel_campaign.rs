use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

pub fn cancel_campaign(ctx: Context<CancelCampaign>) -> Result<()> {
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

#[derive(Accounts)]
pub struct CancelCampaign<'info> {
    #[account(
        mut,
        has_one = brand,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub brand: Signer<'info>,
    #[account(mut)]
    pub brand_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
