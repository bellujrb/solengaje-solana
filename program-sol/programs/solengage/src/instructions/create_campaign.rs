//! # Criar Campanha
//! 
//! Este módulo define a instrução para criar uma nova campanha de marketing de influenciadores.

use anchor_lang::prelude::*;
use crate::errors::ErrorCode;
use crate::state::{Campaign, CampaignStatus};

/// Cria uma nova campanha em status `Draft`.
///
/// Inicializa uma conta `Campaign` com os detalhes fornecidos.
/// Realiza validações para garantir a integridade dos dados da campanha.
///
/// # Argumentos
///
/// * `ctx` - Contexto da instrução `CreateCampaign`.
/// * `name` - Nome único da campanha (máx. 50 caracteres).
/// * `nickname` - Apelido/handle do influenciador (máx. 50 caracteres).
/// * `brand_name` - Nome da marca (máx. 50 caracteres).
/// * `hashtag` - Hashtag da campanha (máx. 50 caracteres).
/// * `target_likes` - Meta de curtidas.
/// * `target_comments` - Meta de comentários.
/// * `target_views` - Meta de visualizações.
/// * `target_shares` - Meta de compartilhamentos.
/// * `amount_usdc` - Orçamento total da campanha em USDC (6 decimais).
/// * `deadline` - Timestamp Unix de expiração da campanha.
///
/// # Erros
///
/// Retorna `ErrorCode` se ocorrer:
/// * `NameTooLong` - Nome da campanha excede 50 caracteres.
/// * `NicknameTooLong` - Apelido do influenciador excede 50 caracteres.
/// * `BrandNameTooLong` - Nome da marca excede 50 caracteres.
/// * `HashtagTooLong` - Hashtag excede 50 caracteres.
/// * `InvalidAmount` - `amount_usdc` igual a zero.
/// * `InvalidDeadline` - `deadline` no passado.
/// * `NoTargetsSet` - Todas as metas (likes, comments, views, shares) iguais a zero.
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
    // Validações de entrada
    require!(name.len() <= 50, ErrorCode::NameTooLong);
    require!(nickname.len() <= 50, ErrorCode::NicknameTooLong);
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
    campaign.nickname = nickname;
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
    campaign.payment_milestones = [false; 10];

    Ok(())
}

/// Contas para a instrução `create_campaign`.
#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCampaign<'info> {
    /// Conta da campanha a ser inicializada.
    ///
    /// PDA derivada de `["campaign", influencer, brand, name]`.
    #[account(
        init,
        payer = influencer,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [b"campaign", influencer.key().as_ref(), brand.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    /// Conta do influenciador, também pagador da inicialização.
    #[account(mut)]
    pub influencer: Signer<'info>,
    /// Conta da marca (SystemAccount).
    pub brand: SystemAccount<'info>,
    /// Conta do oráculo.
    /// CHECK: Verificado via validação de assinatura no handler da instrução.
    pub oracle: AccountInfo<'info>,
    /// Programa do sistema Solana.
    pub system_program: Program<'info, System>,
}
