//! # Error Codes
//!
//! All custom error codes for the Solengage program.
//! Error codes range from 6000-6018 (Anchor custom error space).
//!
//! ## Error Categories
//!
//! - **Validation Errors** (6001-6007): Input validation failures
//! - **Authorization Errors** (6000, 6011): Access control violations
//! - **State Errors** (6008-6010, 6018): Invalid state transitions
//! - **Payment Errors** (6013-6017): Payment processing failures

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // ============= Authorization Errors (6000, 6011) =============

    /// Caller is not the authorized oracle for this campaign.
    ///
    /// # Security
    /// Prevents unauthorized metric updates that could trigger fraudulent payments.
    #[msg("You are not the authorized oracle for this campaign.")]
    UnauthorizedOracle, // 6000

    // ============= Validation Errors (6001-6007) =============

    /// Campaign name exceeds 50 character limit.
    #[msg("Campaign name is too long (max 50 characters).")]
    NameTooLong, // 6001

    /// Influencer nickname exceeds 50 character limit.
    #[msg("Nickname is too long (max 50 characters).")]
    NicknameTooLong, // 6002

    /// Brand name exceeds 50 character limit.
    #[msg("Brand name is too long (max 50 characters).")]
    BrandNameTooLong, // 6003

    /// Campaign hashtag exceeds 50 character limit.
    #[msg("Hashtag is too long (max 50 characters).")]
    HashtagTooLong, // 6004

    /// Campaign budget amount is zero or negative.
    #[msg("Amount must be greater than 0.")]
    InvalidAmount, // 6005

    /// Campaign deadline is in the past.
    #[msg("Deadline must be in the future.")]
    InvalidDeadline, // 6006

    /// All target metrics (likes, comments, views, shares) are zero.
    /// At least one target must be non-zero for progress calculation.
    #[msg("At least one target metric must be set.")]
    NoTargetsSet, // 6007

    // ============= State Errors (6008-6010, 6018) =============

    /// Attempted to activate campaign that is not in Draft status.
    #[msg("Campaign is not in draft status.")]
    CampaignNotDraft, // 6008

    /// Campaign deadline has passed, operation not allowed.
    #[msg("Campaign has expired.")]
    CampaignExpired, // 6009

    /// Attempted to update metrics on non-Active campaign.
    #[msg("Campaign is not active.")]
    CampaignNotActive, // 6010

    /// Caller is not the authorized brand for this campaign.
    ///
    /// # Security
    /// Prevents unauthorized cancellations. Only brand can cancel.
    #[msg("You are not the authorized brand for this campaign.")]
    UnauthorizedBrand, // 6011

    /// Cannot cancel an already completed campaign.
    #[msg("Campaign is already completed.")]
    CampaignAlreadyCompleted, // 6012

    // ============= Payment Errors (6013-6017) =============

    /// Arithmetic operation resulted in overflow.
    ///
    /// # Security
    /// Prevents overflow attacks in payment calculations.
    #[msg("Math overflow occurred.")]
    MathOverflow, // 6013

    /// Milestone index is >= 10 (valid range: 0-9).
    #[msg("Invalid payment milestone.")]
    InvalidMilestone, // 6014

    /// Attempted to pay a milestone that was already paid.
    ///
    /// # Security
    /// Prevents double-payment attack via payment_milestones tracking.
    #[msg("Payment already processed for this milestone.")]
    PaymentAlreadyProcessed, // 6015

    /// Payment amount is zero or progress doesn't justify milestone.
    #[msg("Insufficient funds for payment.")]
    InsufficientFunds, // 6016

    /// Payment would cause total paid to exceed campaign budget.
    ///
    /// # Security
    /// Prevents overpayment beyond amount_usdc.
    #[msg("Payment amount exceeds campaign budget.")]
    PaymentExceedsBudget, // 6017

    /// Campaign must be in Completed status to close.
    #[msg("Campaign must be in Completed or Cancelled status.")]
    CampaignNotInTerminalState, // 6018
}
