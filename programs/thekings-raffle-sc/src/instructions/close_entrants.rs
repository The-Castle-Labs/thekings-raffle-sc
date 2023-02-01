use anchor_lang::prelude::*;
use crate::errors::RaffleError;
use crate::instructions::{Entrants, Raffle};

pub fn close_entrants(_ctx: Context<CloseEntrants>) -> Result<()> {
    let raffle = &_ctx.accounts.raffle;
    let entrants = _ctx.accounts.entrants.load()?;
    if (raffle.claimed_prizes != raffle.total_prizes) && entrants.n_entrants != 0 {
        return Err(RaffleError::UnclaimedPrizes.into());
    }

    Ok(())
}

#[derive(Accounts)]
pub struct CloseEntrants<'info> {
    #[account(has_one = creator, has_one = entrants)]
    pub raffle: Account<'info, Raffle>,
    #[account(mut, close = creator)]
    pub entrants: AccountLoader<'info, Entrants>,
    pub creator: Signer<'info>,
}