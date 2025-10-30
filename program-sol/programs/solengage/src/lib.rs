use anchor_lang::prelude::*;

declare_id!("2e3n681eydMY7t35bHD53eLfaifH3yQzQEsmgfhKV7E5");

pub mod errors;
pub mod state;
pub mod instructions;

use instructions::*;

#[program]
pub mod solengage {
    use super::*;

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

    pub fn brand_pay_campaign(ctx: Context<BrandPayCampaign>) -> Result<()> {
        instructions::brand_pay_campaign::brand_pay_campaign(ctx)
    }

    pub fn update_campaign_metrics(
        ctx: Context<UpdateCampaignMetrics>,
        likes: u64,
        comments: u64,
        views: u64,
        shares: u64,
    ) -> Result<()> {
        instructions::update_campaign_metrics::update_campaign_metrics(ctx, likes, comments, views, shares)
    }

    pub fn cancel_campaign(ctx: Context<CancelCampaign>) -> Result<()> {
        instructions::cancel_campaign::cancel_campaign(ctx)
    }

    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        instructions::close_campaign::close_campaign(ctx)
    }
}
