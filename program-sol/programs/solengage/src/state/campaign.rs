use anchor_lang::prelude::*;
use super::campaign_status::CampaignStatus;
use crate::errors::ErrorCode;

/// Campaign account storing all campaign state.
///
/// # PDA Derivation
///
/// Seeds: `["campaign", influencer_pubkey, brand_pubkey, campaign_name]`
///
/// # Invariants
///
/// The following must always hold:
/// - `paid_amount <= amount_usdc` (never overpay)
/// - `payment_milestones[i] == true` implies at least `(i+1)*10%` paid
/// - `status` transitions are one-way (no reverse)
/// - `oracle` never changes after creation
/// - At least one target metric > 0
///
/// # Space Calculation
///
/// Total: 474 bytes
/// - Account discriminator: 8 bytes
/// - influencer: 32 bytes (Pubkey)
/// - brand: 32 bytes (Pubkey)
/// - name: 4 + 50 bytes (String with length prefix)
/// - nickname: 4 + 50 bytes
/// - brand_name: 4 + 50 bytes
/// - hashtag: 4 + 50 bytes
/// - Metrics (8 fields): 8 * 8 = 64 bytes (u64 each)
/// - amount_usdc: 8 bytes (u64)
/// - deadline: 8 bytes (i64)
/// - status: 1 + 1 = 2 bytes (enum discriminator + variant)
/// - paid_amount: 8 bytes (u64)
/// - oracle: 32 bytes (Pubkey)
/// - created_at: 8 bytes (i64)
/// - last_updated: 8 bytes (i64)
/// - payment_milestones: 10 bytes (array of 10 bools)
#[account]
#[derive(InitSpace)]
pub struct Campaign {
    /// Influencer who created the campaign (receives payments)
    pub influencer: Pubkey,

    /// Brand funding the campaign (pays upfront)
    pub brand: Pubkey,

    /// Unique campaign name (max 50 chars, part of PDA seed)
    #[max_len(50)]
    pub name: String,

    /// Influencer's handle/nickname (max 50 chars)
    #[max_len(50)]
    pub nickname: String,

    /// Brand's name (max 50 chars)
    #[max_len(50)]
    pub brand_name: String,

    /// Campaign hashtag (max 50 chars, e.g., "#summer2024")
    #[max_len(50)]
    pub hashtag: String,

    // ===== Target Metrics (set at creation) =====

    /// Target number of likes to achieve
    pub target_likes: u64,

    /// Target number of comments to achieve
    pub target_comments: u64,

    /// Target number of views to achieve
    pub target_views: u64,

    /// Target number of shares to achieve
    pub target_shares: u64,

    // ===== Current Metrics (updated by oracle) =====

    /// Current number of likes (updated via update_campaign_metrics)
    pub current_likes: u64,

    /// Current number of comments
    pub current_comments: u64,

    /// Current number of views
    pub current_views: u64,

    /// Current number of shares
    pub current_shares: u64,

    // ===== Financial Fields =====

    /// Total campaign budget in USDC (6 decimals, e.g., 100_000_000 = 100 USDC)
    pub amount_usdc: u64,

    /// Cumulative amount paid to influencer so far
    pub paid_amount: u64,

    /// Milestone payment tracking (prevents double-payment)
    /// Index i = true means (i+1)*10% milestone has been paid
    /// [0] = 10%, [1] = 20%, ..., [9] = 100%
    pub payment_milestones: [bool; 10],

    // ===== Campaign Metadata =====

    /// Campaign deadline (Unix timestamp, UTC)
    pub deadline: i64,

    /// Current campaign status (Draft/Active/Completed/Cancelled)
    pub status: CampaignStatus,

    /// Authorized oracle pubkey (validates via has_one constraint)
    /// This is the only account that can call update_campaign_metrics
    pub oracle: Pubkey,

    /// Campaign creation timestamp (Unix timestamp)
    pub created_at: i64,

    /// Last update timestamp (updated on any state change)
    pub last_updated: i64,
}

impl Campaign {
    /// Space required to initialize a Campaign account.
    ///
    /// See struct doc comment for detailed breakdown.
    pub const INIT_SPACE: usize = 8 + 32 + 32 + (4 + 50) + (4 + 50) + (4 + 50) + (4 + 50) + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + (1 + 1) + 8 + 32 + 8 + 8 + (1 * 10);

    /// Calculates current campaign progress as a percentage (0-100).
    ///
    /// # Algorithm
    ///
    /// Progress = (sum of current metrics / sum of target metrics) * 100
    ///
    /// Only metrics with non-zero targets are included in the calculation.
    /// Current values are **capped at their targets** to prevent any single
    /// metric from pushing progress above 100%.
    ///
    /// # Returns
    ///
    /// * `u64` - Progress percentage, capped at 100
    /// * `0` - If all targets are zero (handled gracefully, no panic)
    ///
    /// # Examples
    ///
    /// ```ignore
    /// // Example 1: Single metric
    /// // Target: 1000 likes, Current: 500 likes
    /// // Progress: (500 / 1000) * 100 = 50%
    ///
    /// // Example 2: Multi-metric average
    /// // Targets: 1000 likes, 100 comments
    /// // Current: 500 likes, 50 comments
    /// // Progress: ((500 + 50) / (1000 + 100)) * 100 = 50%
    ///
    /// // Example 3: Capping at target
    /// // Target: 1000 likes, Current: 1500 likes (over-performed)
    /// // Progress: (1000 / 1000) * 100 = 100% (not 150%)
    ///
    /// // Example 4: Mixed progress
    /// // Targets: 1000 likes, 100 comments, Current: 1000 likes, 50 comments
    /// // Progress: ((1000 + 50) / (1000 + 100)) * 100 = 95%
    /// ```
    ///
    /// # Safety
    ///
    /// - Returns 0 if all targets are zero (prevents division by zero)
    /// - Final result capped at 100 (prevents overflow from rounding)
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
