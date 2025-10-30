//! # Campaign Status
//!
//! Defines the lifecycle states of a campaign.
//!
//! ## State Machine
//!
//! ```text
//!                    brand_pay_campaign
//!     Draft ───────────────────────────────> Active
//!       │                                       │
//!       │  cancel_campaign                      │  update_campaign_metrics (100%)
//!       └────────────> Cancelled <──────────────┴──> Completed
//!                                                           │
//!                                              close_campaign (auto)
//! ```
//!
//! ## Valid Transitions
//!
//! - **Draft → Active**: Brand pays campaign budget
//! - **Draft → Cancelled**: Brand cancels before funding
//! - **Active → Completed**: Metrics reach 100% progress
//! - **Active → Cancelled**: Brand cancels after funding
//!
//! ## Terminal States
//!
//! - **Completed**: Cannot transition to any other state
//! - **Cancelled**: Cannot transition to any other state

use anchor_lang::prelude::*;

/// Campaign lifecycle status.
///
/// Each campaign progresses through these states in a one-way manner
/// (no reverse transitions allowed).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CampaignStatus {
    /// Campaign created but not yet funded by brand.
    /// Influencer can modify, brand has not committed USDC yet.
    Draft,

    /// Campaign funded and running.
    /// Oracle can update metrics, triggering progressive payments to influencer.
    Active,

    /// Campaign reached 100% of targets.
    /// All payments processed, account can be closed.
    Completed,

    /// Campaign terminated by brand before completion.
    /// Remaining funds refunded to brand.
    Cancelled,
}

impl std::fmt::Display for CampaignStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CampaignStatus::Draft => write!(f, "Draft"),
            CampaignStatus::Active => write!(f, "Active"),
            CampaignStatus::Completed => write!(f, "Completed"),
            CampaignStatus::Cancelled => write!(f, "Cancelled"),
        }
    }
}
