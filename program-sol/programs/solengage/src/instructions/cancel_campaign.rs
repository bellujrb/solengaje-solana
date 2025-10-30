//! # Cancelar Campanha
//! 
//! Este módulo define a instrução para cancelar uma campanha ativa ou pendente.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Cancela uma campanha ativa ou pendente e reembolsa qualquer USDC restante à marca.
///
/// Somente a marca que criou a campanha pode chamar esta função.
/// Se a campanha estiver `Active`, o saldo restante no cofre da campanha
/// (valor total menos o já pago) é transferido de volta para a conta USDC da marca.
/// Em seguida, o status da campanha é definido como `Cancelled`.
///
/// # Argumentos
///
/// * `ctx` - Contexto da instrução `CancelCampaign`.
///
/// # Erros
///
/// Retorna um `ErrorCode` se ocorrer uma das condições:
/// * `CampaignAlreadyCompleted` - Campanha já está em `Completed`.
/// * `UnauthorizedBrand` - A marca chamadora não corresponde à marca da campanha.
/// * `MathOverflow` - Overflow aritmético durante o cálculo do reembolso.
pub fn cancel_campaign(ctx: Context<CancelCampaign>) -> Result<()> {
    // Validações de segurança
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

            // CPI para transferir o USDC restante do cofre da campanha para a marca
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

/// Contas para a instrução `cancel_campaign`.
#[derive(Accounts)]
pub struct CancelCampaign<'info> {
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
    /// Conta de token USDC da marca (destino do reembolso).
    #[account(mut)]
    pub brand_usdc_account: Account<'info, TokenAccount>,
    /// Conta de token USDC do cofre da campanha (fonte do reembolso).
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    /// Programa SPL Token.
    pub token_program: Program<'info, Token>,
}
