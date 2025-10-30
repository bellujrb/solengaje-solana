//! # Atualizar Métricas da Campanha
//! 
//! Este módulo define a instrução para atualizar métricas da campanha e acionar pagamentos por marco.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Atualiza métricas da campanha e aciona pagamentos automáticos por marcos.
///
/// Apenas o oráculo autorizado pode chamar. Calcula o progresso com base
/// nas métricas atualizadas e paga os marcos recém-alcançados (10%, 20%, ..., 100%).
/// A campanha é automaticamente finalizada quando o progresso atinge 100%.
///
/// # Argumentos
///
/// * `ctx` - Contexto da instrução `UpdateCampaignMetrics`.
/// * `likes` - Número atual de curtidas.
/// * `comments` - Número atual de comentários.
/// * `views` - Número atual de visualizações.
/// * `shares` - Número atual de compartilhamentos.
///
/// # Erros
///
/// Retorna `ErrorCode` se ocorrer:
/// * `CampaignNotActive` - Campanha não está em `Active`.
/// * `CampaignExpired` - Prazo da campanha expirou.
/// * `MathOverflow` - Overflow aritmético durante cálculos de pagamento.
pub fn update_campaign_metrics(
    ctx: Context<UpdateCampaignMetrics>,
    likes: u64,
    comments: u64,
    views: u64,
    shares: u64,
) -> Result<()> {
    // Valida status da campanha e deadline
    require_eq!(ctx.accounts.campaign.status, CampaignStatus::Active, ErrorCode::CampaignNotActive);
    require!(Clock::get()?.unix_timestamp < ctx.accounts.campaign.deadline, ErrorCode::CampaignExpired);

    let old_progress = ctx.accounts.campaign.get_progress_percentage();

    // Atualiza métricas correntes e timestamp de última atualização
    ctx.accounts.campaign.current_likes = likes;
    ctx.accounts.campaign.current_comments = comments;
    ctx.accounts.campaign.current_views = views;
    ctx.accounts.campaign.current_shares = shares;
    ctx.accounts.campaign.last_updated = Clock::get()?.unix_timestamp;

    let new_progress = ctx.accounts.campaign.get_progress_percentage();

    let old_milestones_achieved = (old_progress / 10) as usize;
    let new_milestones_achieved = (new_progress / 10) as usize;

    // Itera sobre marcos recém-alcançados e processa pagamentos
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

                // CPI para transferir USDC do cofre da campanha ao influenciador
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
                        msg!("Falha no pagamento do marco {}: {:?}", milestone_index, e);
                    }
                }
            } else {
                msg!("Validação de pagamento falhou para o marco {}", milestone_index);
            }
        }
    }

    // Se progresso atingir 100%, completa a campanha e reembolsa rent
    if new_progress >= 100 {
        ctx.accounts.campaign.status = CampaignStatus::Completed;

        // Fecha a conta da campanha e reembolsa rent ao oráculo
        let campaign_lamports = ctx.accounts.campaign.to_account_info().lamports();

        **ctx.accounts.campaign.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.oracle.to_account_info().try_borrow_mut_lamports()? = ctx
            .accounts
            .oracle
            .to_account_info()
            .lamports()
            .checked_add(campaign_lamports)
            .ok_or(ErrorCode::MathOverflow)?;
    }

    Ok(())
}

/// Contas para a instrução `update_campaign_metrics`.
#[derive(Accounts)]
pub struct UpdateCampaignMetrics<'info> {
    /// Conta da campanha.
    ///
    /// Deve ser mutável, possuir o oráculo correto e ser uma PDA derivada de
    /// `["campaign", campaign.influencer, campaign.brand, campaign.name]`.
    #[account(
        mut,
        has_one = oracle,
        seeds = [b"campaign", campaign.influencer.key().as_ref(), campaign.brand.key().as_ref(), campaign.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// The oracle's signer account.
    #[account(mut)]
    pub oracle: Signer<'info>,
    /// The campaign's USDC vault token account (source for payments).
    #[account(mut)]
    pub campaign_usdc_account: Account<'info, TokenAccount>,
    /// The influencer's USDC token account (destination for payments).
    #[account(mut)]
    pub influencer_usdc_account: Account<'info, TokenAccount>,
    /// The SPL Token program.
    pub token_program: Program<'info, Token>,
    /// The Solana system program.
    pub system_program: Program<'info, System>,
}
