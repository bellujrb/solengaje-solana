use anchor_lang::prelude::*;

declare_id!("3FZusWeV9GBm8VT6FfmyEQmUAq4TtTMGz8eQAcLnUHxA");

#[program]
pub mod hello {
    use super::*;

    pub fn hello(ctx: Context<Hello>, name: String) -> Result<()> {
        ctx.accounts.hello_state.message = format!("Hello, {}", name);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Hello<'info> {
    #[account(init, payer = user, space = 8 + 4 + 100)] // 8 for Anchor, 4 for String length, 100 for max string length
    pub hello_state: Account<'info, HelloState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct HelloState {
    pub message: String,
}
