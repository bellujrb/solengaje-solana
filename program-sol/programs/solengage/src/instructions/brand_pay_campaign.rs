//! # Pagamento da Marca (Ativar Campanha)
//! 
//! Este módulo define a instrução para a marca financiar uma campanha de marketing de influenciadores.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Ativa a campanha transferindo USDC da marca para o cofre da campanha.
///
/// Esta função muda o status de `Draft` para `Active`.
/// O valor total da campanha deve ser transferido de uma vez (sem financiamento parcial).
/// Realiza validações para garantir que a campanha está no estado correto e não expirou.
///
/// # Argumentos
///
/// * `ctx` - Contexto da instrução `BrandPayCampaign`.
///
/// # Erros
///
/// Retorna `ErrorCode` se ocorrer:
/// * `CampaignNotDraft` - Campanha não está em `Draft`.
/// * `CampaignExpired` - Prazo da campanha expirou.
pub fn brand_pay_campaign(ctx: Context<BrandPayCampaign>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // Validações de segurança
    require_eq!(campaign.status, CampaignStatus::Draft, ErrorCode::CampaignNotDraft);
    require!(Clock::get()?.unix_timestamp < campaign.deadline, ErrorCode::CampaignExpired);

    // CPI para transferir USDC da marca para o cofre da campanha
    let cpi_accounts = Transfer {
        from: ctx.accounts.brand_usdc_account.to_account_info(),
        to: ctx.accounts.campaign_usdc_account.to_account_info(),
        authority: ctx.accounts.brand.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, campaign.amount_usdc)?;

    // Atualiza status da campanha e timestamp de última atualização
    campaign.status = CampaignStatus::Active;
    campaign.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}

/// Contas para a instrução `brand_pay_campaign`.
#[derive(Accounts)]
pub struct BrandPayCampaign<'info> {
    /// Conta da campanha.
    ///
    /// Deve ser mutável, possuir a marca correta e ser uma PDA derivada de
    /// `["campaign", campaign.influencer, campaign.brand, campaign.name]`.
    #[account(
        mut,
        has_one = brand,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// Conta da marca (assinante).
    #[account(mut)]
    pub brand: Signer<'info>,
    /// Conta de token USDC da marca (fonte da transferência).
    #[account(mut)]
    pub brand_usdc_account: Account<'info, TokenAccount>,
    /// Conta de token USDC do cofre da campanha (destino da transferência).
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    /// Programa SPL Token.
    pub token_program: Program<'info, Token>,
}
