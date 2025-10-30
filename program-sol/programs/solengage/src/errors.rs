use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("You are not the authorized oracle for this campaign.")]
    UnauthorizedOracle,
    #[msg("Campaign name is too long (max 50 characters).")]
    NameTooLong,
    #[msg("Nickname is too long (max 50 characters).")]
    NicknameTooLong,
    #[msg("Brand name is too long (max 50 characters).")]
    BrandNameTooLong,
    #[msg("Hashtag is too long (max 50 characters).")]
    HashtagTooLong,
    #[msg("Amount must be greater than 0.")]
    InvalidAmount,
    #[msg("Deadline must be in the future.")]
    InvalidDeadline,
    #[msg("At least one target metric must be set.")]
    NoTargetsSet,
    #[msg("Campaign is not in draft status.")]
    CampaignNotDraft,
    #[msg("Campaign has expired.")]
    CampaignExpired,
    #[msg("Campaign is not active.")]
    CampaignNotActive,
    #[msg("You are not the authorized brand for this campaign.")]
    UnauthorizedBrand,
    #[msg("Campaign is already completed.")]
    CampaignAlreadyCompleted,
    #[msg("Math overflow occurred.")]
    MathOverflow,
    #[msg("Invalid payment milestone.")]
    InvalidMilestone,
    #[msg("Payment already processed for this milestone.")]
    PaymentAlreadyProcessed,
    #[msg("Insufficient funds for payment.")]
    InsufficientFunds,
    #[msg("Payment amount exceeds campaign budget.")]
    PaymentExceedsBudget,
    #[msg("Campaign must be in Completed or Cancelled status.")]
    CampaignNotInTerminalState,
}
