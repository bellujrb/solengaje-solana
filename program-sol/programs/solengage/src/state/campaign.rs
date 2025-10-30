use anchor_lang::prelude::*;
use super::campaign_status::CampaignStatus;
use crate::errors::ErrorCode;

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub influencer: Pubkey,
    pub brand: Pubkey,
    #[max_len(50)]
    pub name: String,
    #[max_len(50)]
    pub nickname: String,
    #[max_len(50)]
    pub brand_name: String,
    #[max_len(50)]
    pub hashtag: String,
    pub target_likes: u64,
    pub target_comments: u64,
    pub target_views: u64,
    pub target_shares: u64,
    pub current_likes: u64,
    pub current_comments: u64,
    pub current_views: u64,
    pub current_shares: u64,
    pub amount_usdc: u64,
    pub deadline: i64,
    pub status: CampaignStatus,
    pub paid_amount: u64,
    /// CHECK: This is safe because we are only storing the oracle's key and not performing any direct operations on it.
    pub oracle: Pubkey,
    pub created_at: i64,
    pub last_updated: i64,
    pub payment_milestones: [bool; 10],
}

impl Campaign {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + (4 + 50) + (4 + 50) + (4 + 50) + (4 + 50) + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + (1 + 1) + 8 + 32 + 8 + 8 + (1 * 10);

    pub fn get_progress_percentage(&self) -> u64 {
        let mut total_target = 0;
        let mut total_current = 0;

        if self.target_likes > 0 {
            total_target += self.target_likes;
            total_current += self.current_likes.min(self.target_likes);
        }
        if self.target_comments > 0 {
            total_target += self.target_comments;
            total_current += self.current_comments.min(self.target_comments);
        }
        if self.target_views > 0 {
            total_target += self.target_views;
            total_current += self.current_views.min(self.target_views);
        }
        if self.target_shares > 0 {
            total_target += self.target_shares;
            total_current += self.current_shares.min(self.target_shares);
        }

        if total_target == 0 {
            return 0;
        }

        ((total_current * 100) / total_target).min(100)
    }

    pub fn validate_payment_safety(&self, milestone: usize, amount_to_transfer: u64) -> Result<()> {
        require!(milestone < 10, ErrorCode::InvalidMilestone);
        require!(!self.payment_milestones[milestone], ErrorCode::PaymentAlreadyProcessed);
        require!(amount_to_transfer > 0, ErrorCode::InsufficientFunds);
        require!(
            self.paid_amount.saturating_add(amount_to_transfer) <= self.amount_usdc,
            ErrorCode::PaymentExceedsBudget
        );

        let current_progress = self.get_progress_percentage();
        let required_progress = ((milestone + 1) * 10) as u64;

        require!(current_progress >= required_progress, ErrorCode::InsufficientFunds);

        Ok(())
    }

    pub fn calculate_safe_payment(&self, milestone: usize) -> Result<u64> {
        require!(milestone < 10, ErrorCode::InvalidMilestone);

        let percentage = ((milestone + 1) * 10) as u64;
        let total_to_pay = self.amount_usdc
            .checked_mul(percentage)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)?;

        let amount_to_transfer = total_to_pay
            .checked_sub(self.paid_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        let safe_amount = amount_to_transfer.min(
            self.amount_usdc.saturating_sub(self.paid_amount)
        );

        Ok(safe_amount)
    }
}
