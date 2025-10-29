use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FMmxYCKBvwr3nQ66MxVYQLWt4CqN5wyvRWRBdQX1bZSN");

#[program]
pub mod solengage {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        name: String,
        brand_name: String,
        hashtag: String,
        target_likes: u64,
        target_comments: u64,
        target_views: u64,
        target_shares: u64,
        amount_usdc: u64,
        deadline: i64,
    ) -> Result<()> {
        // Validações de segurança
        require!(name.len() <= 50, ErrorCode::NameTooLong);
        require!(brand_name.len() <= 50, ErrorCode::BrandNameTooLong);
        require!(hashtag.len() <= 50, ErrorCode::HashtagTooLong);
        require!(amount_usdc > 0, ErrorCode::InvalidAmount);
        require!(deadline > Clock::get()?.unix_timestamp, ErrorCode::InvalidDeadline);
        require!(
            target_likes > 0 || target_comments > 0 || target_views > 0 || target_shares > 0,
            ErrorCode::NoTargetsSet
        );

        let campaign = &mut ctx.accounts.campaign;
        campaign.influencer = ctx.accounts.influencer.key();
        campaign.brand = ctx.accounts.brand.key();
        campaign.name = name;
        campaign.brand_name = brand_name;
        campaign.hashtag = hashtag;
        campaign.target_likes = target_likes;
        campaign.target_comments = target_comments;
        campaign.target_views = target_views;
        campaign.target_shares = target_shares;
        campaign.amount_usdc = amount_usdc;
        campaign.deadline = deadline;
        campaign.current_likes = 0;
        campaign.current_comments = 0;
        campaign.current_views = 0;
        campaign.current_shares = 0;
        campaign.status = CampaignStatus::Draft;
        campaign.paid_amount = 0;
        campaign.oracle = ctx.accounts.oracle.key();
        campaign.created_at = Clock::get()?.unix_timestamp;
        campaign.last_updated = Clock::get()?.unix_timestamp;
        campaign.payment_milestones = [false; 10]; // Para rastrear pagamentos de 10% a 100%

        Ok(())
    }

    pub fn brand_pay_campaign(ctx: Context<BrandPayCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        
        // Validações de segurança
        require_eq!(campaign.status, CampaignStatus::Draft, ErrorCode::CampaignNotDraft);
        require!(Clock::get()?.unix_timestamp < campaign.deadline, ErrorCode::CampaignExpired);

        let cpi_accounts = Transfer {
            from: ctx.accounts.brand_usdc_account.to_account_info(),
            to: ctx.accounts.campaign_usdc_account.to_account_info(),
            authority: ctx.accounts.brand.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, campaign.amount_usdc)?;

        campaign.status = CampaignStatus::Active;
        campaign.last_updated = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn update_campaign_metrics(
        ctx: Context<UpdateCampaignMetrics>,
        likes: u64,
        comments: u64,
        views: u64,
        shares: u64,
    ) -> Result<()> {
        require_eq!(ctx.accounts.campaign.status, CampaignStatus::Active, ErrorCode::CampaignNotActive);
        require!(Clock::get()?.unix_timestamp < ctx.accounts.campaign.deadline, ErrorCode::CampaignExpired);

        let old_progress = ctx.accounts.campaign.get_progress_percentage();

        // Update metrics
        ctx.accounts.campaign.current_likes = likes;
        ctx.accounts.campaign.current_comments = comments;
        ctx.accounts.campaign.current_views = views;
        ctx.accounts.campaign.current_shares = shares;
        ctx.accounts.campaign.last_updated = Clock::get()?.unix_timestamp;

        let new_progress = ctx.accounts.campaign.get_progress_percentage();

        let old_milestones_achieved = (old_progress / 10) as usize;
        let new_milestones_achieved = (new_progress / 10) as usize;

        for milestone_index in old_milestones_achieved..new_milestones_achieved {
            let amount_to_transfer = ctx.accounts.campaign.calculate_safe_payment(milestone_index)?;
            
            if amount_to_transfer > 0 {
                if let Ok(_) = ctx.accounts.campaign.validate_payment_safety(milestone_index, amount_to_transfer) {
                    let bump = ctx.bumps.campaign;
                    let seeds = &[
                        b"campaign".as_ref(),
                        ctx.accounts.campaign.influencer.as_ref(),
                        ctx.accounts.campaign.brand.as_ref(),
                        ctx.accounts.campaign.name.as_bytes(),
                        &[bump],
                    ];
                    let signer = &[&seeds[..]];

                    let cpi_accounts = Transfer {
                        from: ctx.accounts.campaign_usdc_account.to_account_info(),
                        to: ctx.accounts.influencer_usdc_account.to_account_info(),
                        authority: ctx.accounts.campaign.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
                    
                    match token::transfer(cpi_ctx, amount_to_transfer) {
                        Ok(_) => {
                            ctx.accounts.campaign.paid_amount = ctx.accounts.campaign.paid_amount.checked_add(amount_to_transfer).ok_or(ErrorCode::MathOverflow)?;
                            ctx.accounts.campaign.payment_milestones[milestone_index] = true;
                        },
                        Err(e) => {
                            msg!("Payment failed for milestone {}: {:?}", milestone_index, e);
                        }
                    }
                } else {
                    msg!("Payment validation failed for milestone {}", milestone_index);
                }
            }
        }

        if new_progress >= 100 {
            ctx.accounts.campaign.status = CampaignStatus::Completed;
        }

        Ok(())
    }

    pub fn cancel_campaign(ctx: Context<CancelCampaign>) -> Result<()> {
        require!(ctx.accounts.campaign.status != CampaignStatus::Completed, ErrorCode::CampaignAlreadyCompleted);
        require_keys_eq!(ctx.accounts.brand.key(), ctx.accounts.campaign.brand, ErrorCode::UnauthorizedBrand);
        
        if ctx.accounts.campaign.status == CampaignStatus::Active {
            let remaining_amount = ctx.accounts.campaign.amount_usdc.checked_sub(ctx.accounts.campaign.paid_amount)
                .ok_or(ErrorCode::MathOverflow)?;
            
            if remaining_amount > 0 {
                let bump = ctx.bumps.campaign;
                let seeds = &[
                    b"campaign".as_ref(),
                    ctx.accounts.campaign.influencer.as_ref(),
                    ctx.accounts.campaign.brand.as_ref(),
                    ctx.accounts.campaign.name.as_bytes(),
                    &[bump],
                ];
                let signer = &[&seeds[..]];

                let cpi_accounts = Transfer {
                    from: ctx.accounts.campaign_usdc_account.to_account_info(),
                    to: ctx.accounts.brand_usdc_account.to_account_info(),
                    authority: ctx.accounts.campaign.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
                token::transfer(cpi_ctx, remaining_amount)?;
            }
        }
        
        ctx.accounts.campaign.status = CampaignStatus::Cancelled;
        ctx.accounts.campaign.last_updated = Clock::get()?.unix_timestamp;
        
        Ok(())
    }


}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = influencer,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [b"campaign", influencer.key().as_ref(), brand.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub influencer: Signer<'info>,
    pub brand: SystemAccount<'info>,
    /// CHECK: Oracle account is verified through signature validation in the instruction handler
    pub oracle: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BrandPayCampaign<'info> {
    #[account(
        mut,
        has_one = brand,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub brand: Signer<'info>,
    #[account(mut)]
    pub brand_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateCampaignMetrics<'info> {
    #[account(
        mut,
        has_one = oracle,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    pub oracle: Signer<'info>,
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub influencer_usdc_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelCampaign<'info> {
    #[account(
        mut,
        has_one = brand,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub brand: Signer<'info>,
    #[account(mut)]
    pub brand_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub influencer: Pubkey,
    pub brand: Pubkey,
    #[max_len(50)]
    pub name: String,
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
    pub oracle: Pubkey, // Added oracle field
    pub created_at: i64,
    pub last_updated: i64,
    pub payment_milestones: [bool; 10], // Para rastrear pagamentos de 10% a 100%
}

impl Campaign {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + (4 + 50) + (4 + 50) + (4 + 50) + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + (1 + 1) + 8 + 32 + 8 + 8 + (1 * 10); // Adjusted for new fields
    
    pub fn get_progress_percentage(&self) -> u64 {
        let mut total_target = 0;
        let mut total_current = 0;

        if self.target_likes > 0 {
            total_target += self.target_likes;
            total_current += self.current_likes.min(self.target_likes); // Cap at target
        }
        if self.target_comments > 0 {
            total_target += self.target_comments;
            total_current += self.current_comments.min(self.target_comments); // Cap at target
        }
        if self.target_views > 0 {
            total_target += self.target_views;
            total_current += self.current_views.min(self.target_views); // Cap at target
        }
        if self.target_shares > 0 {
            total_target += self.target_shares;
            total_current += self.current_shares.min(self.target_shares); // Cap at target
        }

        if total_target == 0 {
            return 0;
        }

        // Cap progress at 100%
        ((total_current * 100) / total_target).min(100)
    }

    // Nova função para validar se um pagamento é seguro
    pub fn validate_payment_safety(&self, milestone: usize, amount_to_transfer: u64) -> Result<()> {
        // Verificar se o milestone é válido
        require!(milestone < 10, ErrorCode::InvalidMilestone);

        // Verificar se o pagamento não foi feito ainda
        require!(!self.payment_milestones[milestone], ErrorCode::PaymentAlreadyProcessed);

        // Verificar se há fundos suficientes
        require!(amount_to_transfer > 0, ErrorCode::InsufficientFunds);

        // Verificar se o valor não excede o total da campanha
        require!(
            self.paid_amount.saturating_add(amount_to_transfer) <= self.amount_usdc,
            ErrorCode::PaymentExceedsBudget
        );

        // Verificar se o progresso justifica o pagamento
        let current_progress = self.get_progress_percentage();
        let required_progress = ((milestone + 1) * 10) as u64;
        
        require!(current_progress >= required_progress, ErrorCode::InsufficientFunds);

        Ok(())
    }

    // Nova função para calcular pagamento com failsafes
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

        // Failsafe: garantir que não excede o valor total
        let safe_amount = amount_to_transfer.min(
            self.amount_usdc.saturating_sub(self.paid_amount)
        );

        Ok(safe_amount)
    }
}

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

#[error_code]
pub enum ErrorCode {
    #[msg("You are not the authorized oracle for this campaign.")]
    UnauthorizedOracle,
    #[msg("Campaign name is too long (max 50 characters).")]
    NameTooLong,
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
}
