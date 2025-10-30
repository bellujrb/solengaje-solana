use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

pub fn brand_pay_campaign(ctx: Context<BrandPayCampaign>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // Validações de segurança
    require_eq!(campaign.status, CampaignStatus::Draft, ErrorCode::CampaignNotDraft);
    require!(Clock::get()?.unix_timestamp < campaign.deadline, ErrorCode::CampaignExpired);

    let cpi_accounts = Transfer {
        from: ctx.accounts.brand_usdc_account.to_account_info(),
        to: ctx.accounts.campaign_usdc_account.to_account_info(),
        authority: ctx.accounts.brand.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, campaign.amount_usdc)?;

    campaign.status = CampaignStatus::Active;
    campaign.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct BrandPayCampaign<'info> {
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
