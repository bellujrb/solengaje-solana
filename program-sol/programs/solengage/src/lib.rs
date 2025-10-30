//! # Solengage - Decentralized Influencer Marketing Platform
//!
//! Solengage is a Solana program that connects influencers with brands for social media
//! campaigns, featuring automatic progressive payments based on verified engagement metrics.
//!
//! ## Architecture
//!
//! - **Campaign PDA**: Stores campaign state, derived from `["campaign", influencer, brand, name]`
//! - **Oracle**: Authorized signer that updates campaign metrics and triggers payments
//! - **Progressive Payments**: Automatic 10% milestone payments (10%, 20%, ..., 100%)
//! - **USDC Integration**: All payments handled via SPL Token (USDC)
//!
//! ## Campaign Lifecycle
//!
//! 1. **Draft** → Influencer creates campaign via `create_campaign`
//! 2. **Active** → Brand funds campaign via `brand_pay_campaign`
//! 3. **Completed** → Auto-closes when metrics reach 100% via `update_campaign_metrics`
//! 4. **Cancelled** → Brand can cancel anytime via `cancel_campaign`
//!
//! ## Security Features
//!
//! - Double-payment prevention (milestone tracking)
//! - Overpayment prevention (multiple validation layers)
//! - Arithmetic overflow protection (checked operations)
//! - PDA-based vault authority (only program can transfer)

use anchor_lang::prelude::*;

/// Declares the program ID for the Solengage program.
declare_id!("2e3n681eydMY7t35bHD53eLfaifH3yQzQEsmgfhKV7E5");

pub mod errors;
pub mod state;
pub mod instructions;

use instructions::*;

#[program]
pub mod solengage {
    use super::*;

    /// Creates a new influencer marketing campaign in Draft status.
    ///
    /// # Arguments
    ///
    /// * `name` - Unique campaign name (max 50 chars), used in PDA derivation
    /// * `nickname` - Influencer handle/nickname (max 50 chars)
    /// * `brand_name` - Brand name (max 50 chars)
    /// * `hashtag` - Campaign hashtag (max 50 chars)
    /// * `target_likes` - Target number of likes
    /// * `target_comments` - Target number of comments
    /// * `target_views` - Target number of views
    /// * `target_shares` - Target number of shares
    /// * `amount_usdc` - Total campaign budget in USDC (6 decimals)
    /// * `deadline` - Unix timestamp when campaign expires
    ///
    /// # Accounts
    ///
    /// * `campaign` - PDA to initialize, seeds: ["campaign", influencer, brand, name]
    /// * `influencer` - Signer and payer (campaign creator)
    /// * `brand` - Brand public key (not signer yet)
    /// * `oracle` - Authorized oracle public key for metric updates
    ///
    /// # Errors
    ///
    /// * `NameTooLong` - Name exceeds 50 characters
    /// * `NicknameTooLong` - Nickname exceeds 50 characters
    /// * `BrandNameTooLong` - Brand name exceeds 50 characters
    /// * `HashtagTooLong` - Hashtag exceeds 50 characters
    /// * `InvalidAmount` - Amount is 0
    /// * `InvalidDeadline` - Deadline is in the past
    /// * `NoTargetsSet` - All target metrics are 0
    ///
    /// # Example
    ///
    /// ```ignore
    /// // Create campaign with 1000 likes target, 100 USDC budget, 7 days deadline
    /// program.methods
    ///     .createCampaign(
    ///         "Summer Campaign",
    ///         "@influencer",
    ///         "Cool Brand",
    ///         "#summer2024",
    ///         new BN(1000), // likes
    ///         new BN(0), new BN(0), new BN(0),
    ///         new BN(100_000_000), // 100 USDC
    ///         new BN(Date.now()/1000 + 604800) // +7 days
    ///     )
    ///     .accounts({...})
    ///     .rpc();
    /// ```
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
        instructions::create_campaign::create_campaign(
            ctx,
            name,
            nickname,
            brand_name,
            hashtag,
            target_likes,
            target_comments,
            target_views,
            target_shares,
            amount_usdc,
            deadline,
        )
    }

    /// Activates a campaign by transferring USDC from brand to campaign vault.
    ///
    /// Transitions campaign from Draft → Active status. The full campaign amount
    /// must be transferred at once (no partial funding).
    ///
    /// # Accounts
    ///
    /// * `campaign` - Campaign PDA (must be in Draft status)
    /// * `brand` - Brand signer (must match campaign.brand)
    /// * `brand_usdc_account` - Brand's USDC token account (source)
    /// * `campaign_usdc_account` - Campaign vault token account (destination, owned by campaign PDA)
    /// * `token_program` - SPL Token program
    ///
    /// # State Transitions
    ///
    /// * `Draft` → `Active` (success)
    ///
    /// # Errors
    ///
    /// * `CampaignNotDraft` - Campaign is not in Draft status
    /// * `CampaignExpired` - Deadline has passed
    /// * Anchor errors if token transfer fails (insufficient balance, etc.)
    ///
    /// # Security
    ///
    /// - Validates brand signature matches campaign.brand
    /// - Validates deadline hasn't expired
    /// - Transfers exact amount_usdc (no partial funding)
    pub fn brand_pay_campaign(ctx: Context<BrandPayCampaign>) -> Result<()> {
        instructions::brand_pay_campaign::brand_pay_campaign(ctx)
    }

    /// Updates campaign metrics and triggers automatic milestone payments.
    ///
    /// Only callable by the authorized oracle. Calculates progress based on updated
    /// metrics and pays out any newly achieved milestones (10%, 20%, ..., 100%).
    /// Automatically closes the campaign when 100% is reached.
    ///
    /// # Arguments
    ///
    /// * `likes` - Current number of likes
    /// * `comments` - Current number of comments
    /// * `views` - Current number of views
    /// * `shares` - Current number of shares
    ///
    /// # Accounts
    ///
    /// * `campaign` - Campaign PDA (must be Active, oracle validated via has_one)
    /// * `oracle` - Oracle signer (must match campaign.oracle)
    /// * `campaign_usdc_account` - Campaign vault (source for payments)
    /// * `influencer_usdc_account` - Influencer's USDC account (payment destination)
    /// * `token_program` - SPL Token program
    /// * `system_program` - System program (for account closure)
    ///
    /// # State Transitions
    ///
    /// * `Active` → `Completed` (when progress reaches 100%)
    ///
    /// # Errors
    ///
    /// * `CampaignNotActive` - Campaign is not in Active status
    /// * `CampaignExpired` - Deadline has passed
    /// * `UnauthorizedOracle` - Oracle signer doesn't match campaign.oracle
    ///
    /// # Payment Logic
    ///
    /// Milestones are paid progressively:
    /// - Old progress: 25% → New progress: 55% = Pay milestones 2, 3, 4 (30%, 40%, 50%)
    /// - Each milestone = 10% of total budget
    /// - payment_milestones[i] prevents double-payment
    ///
    /// # Auto-Close
    ///
    /// When progress reaches 100%, the campaign account is closed and rent
    /// is refunded to the oracle as compensation.
    pub fn update_campaign_metrics(
        ctx: Context<UpdateCampaignMetrics>,
        likes: u64,
        comments: u64,
        views: u64,
        shares: u64,
    ) -> Result<()> {
        instructions::update_campaign_metrics::update_campaign_metrics(ctx, likes, comments, views, shares)
    }

    /// Cancels a campaign and refunds remaining USDC to the brand.
    ///
    /// Only callable by the brand. If campaign is Active, refunds the difference
    /// between amount_usdc and paid_amount. If Draft, simply marks as Cancelled.
    ///
    /// # Accounts
    ///
    /// * `campaign` - Campaign PDA (cannot be Completed)
    /// * `brand` - Brand signer (must match campaign.brand)
    /// * `brand_usdc_account` - Brand's USDC account (refund destination)
    /// * `campaign_usdc_account` - Campaign vault (refund source)
    /// * `token_program` - SPL Token program
    ///
    /// # State Transitions
    ///
    /// * `Draft` → `Cancelled` (no refund needed)
    /// * `Active` → `Cancelled` (refunds remaining USDC)
    ///
    /// # Errors
    ///
    /// * `CampaignAlreadyCompleted` - Cannot cancel completed campaigns
    /// * `UnauthorizedBrand` - Signer doesn't match campaign.brand
    ///
    /// # Security
    ///
    /// - Only brand can cancel (influencer cannot)
    /// - Refund amount = amount_usdc - paid_amount (ensures fairness)
    /// - Uses PDA signer pattern for vault authority
    pub fn cancel_campaign(ctx: Context<CancelCampaign>) -> Result<()> {
        instructions::cancel_campaign::cancel_campaign(ctx)
    }

    /// Closes a completed campaign account and refunds rent to oracle.
    ///
    /// This instruction is typically called automatically by update_campaign_metrics
    /// when progress reaches 100%. Can also be called manually if needed.
    ///
    /// # Accounts
    ///
    /// * `campaign` - Campaign PDA (must be Completed, will be closed)
    /// * `oracle` - Oracle account (receives rent refund)
    ///
    /// # State Requirements
    ///
    /// * Campaign status must be `Completed`
    ///
    /// # Errors
    ///
    /// * `CampaignNotInTerminalState` - Campaign is not Completed
    ///
    /// # Rent Refund
    ///
    /// The rent-exempt lamports (~0.004 SOL) are transferred to the oracle
    /// as compensation for monitoring the campaign to completion.
    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        instructions::close_campaign::close_campaign(ctx)
    }
}
