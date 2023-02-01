use anchor_lang::{prelude::*, solana_program::sysvar};
use crate::errors::RaffleError;
use crate::instructions::Raffle;
use crate::utils::recent_blockhashes;

pub const TIME_BUFFER: i64 = 20;

pub fn reveal_winners(ctx: Context<RevealWinners>) -> Result<()> {
    let clock = Clock::get()?;
    let raffle = &mut ctx.accounts.raffle;

    let end_timestamp_with_buffer = raffle
        .end_timestamp
        .checked_add(TIME_BUFFER)
        .ok_or(RaffleError::InvalidCalculation)?;
    if clock.unix_timestamp < end_timestamp_with_buffer {
        //msg!("{}", clock.unix_timestamp); // 1672510512
        //msg!("{}", raffle.end_timestamp); // 1672787631
        return err!(RaffleError::RaffleStillRunning);
    }

    let randomness =
        recent_blockhashes::last_blockhash_accessor(&ctx.accounts.recent_blockhashes)?;

    match raffle.randomness {
        Some(_) => return err!(RaffleError::WinnersAlreadyDrawn),
        None => raffle.randomness = Some(randomness),
    }

    Ok(())
}

#[derive(Accounts)]
pub struct RevealWinners<'info> {
    #[account(mut)]
    pub raffle: Account<'info, Raffle>,
    /// CHECK: contains recent blockchashes
    #[account(address = sysvar::recent_blockhashes::ID)]
    pub recent_blockhashes: UncheckedAccount<'info>,
}