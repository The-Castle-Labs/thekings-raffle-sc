use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Token, Mint, TokenAccount};
use crate::errors::RaffleError;
use crate::instructions::create_raffle::Raffle;

pub fn add_prize(_ctx: Context<AddPrize>, prize_index: u32, amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let raffle = &mut _ctx.accounts.raffle;

    if clock.unix_timestamp > raffle.end_timestamp {
        return err!(RaffleError::RaffleEnded);
    }

    if prize_index != raffle.total_prizes {
        return err!(RaffleError::InvalidPrizeIndex);
    }

    if amount == 0 {
        return err!(RaffleError::NoPrize);
    }

    token::transfer(
        CpiContext::new(
            _ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: _ctx.accounts.from.to_account_info(),
                to: _ctx.accounts.prize.to_account_info(),
                authority: _ctx.accounts.creator.to_account_info(),
            }
        ),
        amount
    )?;

    raffle.total_prizes = raffle.total_prizes.checked_add(1).ok_or(RaffleError::InvalidCalculation)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(prize_index: u32)]
pub struct AddPrize<'info> {
    #[account(
        mut,
        seeds = [b"raffle", raffle.entrants.key().as_ref()],
        bump = raffle.bump,
        has_one = creator
    )]
    pub raffle: Account<'info, Raffle>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// Creator prize token account
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(
        init,
        seeds = [b"prize", raffle.key().as_ref(), &prize_index.to_le_bytes()],
        bump,
        payer = creator,
        token::mint = prize_mint,
        token::authority = raffle,
    )]
    pub prize: Account<'info, TokenAccount>,
    pub prize_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}