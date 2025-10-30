//! # Create Campaign Instruction
//! 
//! This module defines the instruction for creating a new influencer marketing campaign.

use anchor_lang::prelude::*;
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Creates a new influencer marketing campaign in Draft status.
///
/// This function initializes a new `Campaign` account with the provided details.
/// It performs several validations to ensure the integrity of the campaign data.
///
/// # Arguments
///
/// * `ctx` - The context for the `CreateCampaign` instruction.
/// * `name` - The unique name of the campaign (max 50 characters).
/// * `nickname` - The influencer's handle or nickname (max 50 characters).
/// * `brand_name` - The name of the brand (max 50 characters).
/// * `hashtag` - The campaign's hashtag (max 50 characters).
/// * `target_likes` - The target number of likes for the campaign.
/// * `target_comments` - The target number of comments for the campaign.
/// * `target_views` - The target number of views for the campaign.
/// * `target_shares` - The target number of shares for the campaign.
/// * `amount_usdc` - The total campaign budget in USDC (6 decimals).
/// * `deadline` - The Unix timestamp when the campaign expires.
///
/// # Errors
///
/// This function will return an `ErrorCode` if any of the following conditions are met:
/// * `NameTooLong` - If the campaign name exceeds 50 characters.
/// * `NicknameTooLong` - If the influencer nickname exceeds 50 characters.
/// * `BrandNameTooLong` - If the brand name exceeds 50 characters.
/// * `HashtagTooLong` - If the hashtag exceeds 50 characters.
/// * `InvalidAmount` - If `amount_usdc` is zero.
/// * `InvalidDeadline` - If the `deadline` is in the past.
/// * `NoTargetsSet` - If all target metrics (likes, comments, views, shares) are zero.
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
    // Input validations
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

/// Accounts for the `create_campaign` instruction.
#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCampaign<'info> {
    /// The campaign account to be initialized.
    ///
    /// This PDA is derived from `["campaign", influencer, brand, name]`.
    #[account(
        init,
        payer = influencer,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [b"campaign", influencer.key().as_ref(), brand.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// The influencer's account, who is also the payer for the campaign initialization.
    #[account(mut)]
    pub influencer: Signer<'info>,
    /// The brand's system account.
    pub brand: SystemAccount<'info>,
    /// The oracle's account info.
    /// CHECK: The oracle account is verified through signature validation in the instruction handler.
    pub oracle: AccountInfo<'info>,
    /// The Solana system program.
    pub system_program: Program<'info, System>,
}
