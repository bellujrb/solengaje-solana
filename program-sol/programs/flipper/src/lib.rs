use anchor_lang::prelude::*;

declare_id!("AaDDkYTbHCh5JogkpGAKnhFUdGEZoWiYkM9NNgVTo85W");

#[program]
pub mod flipper {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, value: bool) -> Result<()> {
        ctx.accounts.flipper.value = value;
        Ok(())
    }

    pub fn flip(ctx: Context<Flip>) -> Result<()> {
        ctx.accounts.flipper.value = !ctx.accounts.flipper.value;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 1)]
    pub flipper: Account<'info, Flipper>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Flip<'info> {
    #[account(mut)]
    pub flipper: Account<'info, Flipper>,
}

#[account]
pub struct Flipper {
    pub value: bool,
}
