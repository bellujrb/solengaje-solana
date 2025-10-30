use anchor_lang::prelude::*;
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
    require_eq!(ctx.accounts.campaign.status, CampaignStatus::Completed, ErrorCode::CampaignNotInTerminalState);
    Ok(())
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(
        mut,
        close = oracle,
        has_one = oracle,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    /// CHECK: Oracle receives the rent refund
    pub oracle: AccountInfo<'info>,
}
