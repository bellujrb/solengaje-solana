//! # Brand Pay Campaign Instruction
//! 
//! This module defines the instruction for a brand to fund an influencer marketing campaign.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Activates a campaign by transferring USDC from the brand to the campaign vault.
///
/// This function transitions a campaign from `Draft` to `Active` status.
/// The full campaign amount must be transferred at once (no partial funding).
/// It performs validations to ensure the campaign is in the correct state and not expired.
///
/// # Arguments
///
/// * `ctx` - The context for the `BrandPayCampaign` instruction.
///
/// # Errors
///
/// This function will return an `ErrorCode` if any of the following conditions are met:
/// * `CampaignNotDraft` - If the campaign is not in `Draft` status.
/// * `CampaignExpired` - If the campaign deadline has passed.
pub fn brand_pay_campaign(ctx: Context<BrandPayCampaign>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // Security validations
    require_eq!(campaign.status, CampaignStatus::Draft, ErrorCode::CampaignNotDraft);
    require!(Clock::get()?.unix_timestamp < campaign.deadline, ErrorCode::CampaignExpired);

    // CPI to transfer USDC from brand to campaign vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.brand_usdc_account.to_account_info(),
        to: ctx.accounts.campaign_usdc_account.to_account_info(),
        authority: ctx.accounts.brand.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, campaign.amount_usdc)?;

    // Update campaign status and last updated timestamp
    campaign.status = CampaignStatus::Active;
    campaign.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}

/// Accounts for the `brand_pay_campaign` instruction.
#[derive(Accounts)]
pub struct BrandPayCampaign<'info> {
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
    /// The brand's USDC token account (source for the transfer).
    #[account(mut)]
    pub brand_usdc_account: Account<'info, TokenAccount>,
    /// The campaign's USDC vault token account (destination for the transfer).
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    /// The SPL Token program.
    pub token_program: Program<'info, Token>,
}
