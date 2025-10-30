use anchor_lang::prelude::*;
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

pub fn create_campaign(
    ctx: Context<CreateCampaign>,
    name: String,
    nickname: String,
    brand_name: String,
    hashtag: String,
    target_likes: u64,
    target_comments: u64,
    target_views: u64,
    target_shares: u64,
    amount_usdc: u64,
    deadline: i64,
) -> Result<()> {
    // Validações de segurança
    require!(name.len() <= 50, ErrorCode::NameTooLong);
    require!(nickname.len() <= 50, ErrorCode::NicknameTooLong);
    require!(brand_name.len() <= 50, ErrorCode::BrandNameTooLong);
    require!(hashtag.len() <= 50, ErrorCode::HashtagTooLong);
    require!(amount_usdc > 0, ErrorCode::InvalidAmount);
    require!(deadline > Clock::get()?.unix_timestamp, ErrorCode::InvalidDeadline);
    require!(
        target_likes > 0 || target_comments > 0 || target_views > 0 || target_shares > 0,
        ErrorCode::NoTargetsSet
    );

    let campaign = &mut ctx.accounts.campaign;
    campaign.influencer = ctx.accounts.influencer.key();
    campaign.brand = ctx.accounts.brand.key();
    campaign.name = name;
    campaign.nickname = nickname;
    campaign.brand_name = brand_name;
    campaign.hashtag = hashtag;
    campaign.target_likes = target_likes;
    campaign.target_comments = target_comments;
    campaign.target_views = target_views;
    campaign.target_shares = target_shares;
    campaign.amount_usdc = amount_usdc;
    campaign.deadline = deadline;
    campaign.current_likes = 0;
    campaign.current_comments = 0;
    campaign.current_views = 0;
    campaign.current_shares = 0;
    campaign.status = CampaignStatus::Draft;
    campaign.paid_amount = 0;
    campaign.oracle = ctx.accounts.oracle.key();
    campaign.created_at = Clock::get()?.unix_timestamp;
    campaign.last_updated = Clock::get()?.unix_timestamp;
    campaign.payment_milestones = [false; 10];

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = influencer,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [b"campaign", influencer.key().as_ref(), brand.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub influencer: Signer<'info>,
    pub brand: SystemAccount<'info>,
    /// CHECK: Oracle account is verified through signature validation in the instruction handler
    pub oracle: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
