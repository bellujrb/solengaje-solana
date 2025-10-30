use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CampaignStatus {
    Draft,
    Active,
    Completed,
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
