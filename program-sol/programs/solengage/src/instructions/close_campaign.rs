//! # Close Campaign Instruction
//! 
//! This module defines the instruction for closing a completed campaign.

use anchor_lang::prelude::*;
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Closes a completed campaign account.
///
/// This function can only be called when the campaign is in the `Completed` status.
/// It closes the campaign account and refunds the remaining rent to the oracle.
///
/// # Arguments
///
/// * `ctx` - The context for the `CloseCampaign` instruction.
///
/// # Errors
///
/// This function will return an `ErrorCode` if the campaign is not in `Completed` status.
pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
    // Security validation: Ensure campaign is completed before closing.
    require_eq!(ctx.accounts.campaign.status, CampaignStatus::Completed, ErrorCode::CampaignNotInTerminalState);
    Ok(())
}

/// Accounts for the `close_campaign` instruction.
#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    /// The campaign account to be closed.
    ///
    /// Must be mutable, have the correct oracle, and be a PDA derived from
    /// `["campaign", campaign.influencer, campaign.brand, campaign.name]`.
    /// The `close` constraint ensures the account is closed and rent refunded to the oracle.
    #[account(
        mut,
        close = oracle,
        has_one = oracle,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// The oracle account that receives the rent refund from the closed campaign account.
    #[account(mut)]
    /// CHECK: Oracle receives the rent refund
    pub oracle: AccountInfo<'info>,
}
