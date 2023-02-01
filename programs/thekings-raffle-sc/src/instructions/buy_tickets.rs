use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{Token, TokenAccount};
use crate::errors::RaffleError;
use crate::instructions::{Entrants, Raffle};

pub fn buy_tickets(_ctx: Context<BuyTickets>, amount: u16) -> Result<()> {
    let clock = Clock::get()?;
    let raffle = &mut _ctx.accounts.raffle;
    let mut entrants = _ctx.accounts.entrants.load_mut()?;

    if clock.unix_timestamp > raffle.end_timestamp {
        return err!(RaffleError::RaffleEnded);
    }

    for _ in 0..amount {
        entrants.append(_ctx.accounts.buyer_token_account.owner)?;
    }

    token::transfer(
        CpiContext::new(
            _ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: _ctx.accounts.buyer_token_account.to_account_info(),
                to: _ctx.accounts.proceeds.to_account_info(),
                authority: _ctx.accounts.buyer.to_account_info(),
            },
        ),
        raffle.ticket_price
            .checked_mul(amount as u64)
            .ok_or(RaffleError::InvalidCalculation)?,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct BuyTickets<'info> {
    #[account(has_one = entrants)]
    pub raffle: Account<'info, Raffle>,
    #[account(mut)]
    pub entrants: AccountLoader<'info, Entrants>,
    #[account(
    mut,
    seeds = [b"proceeds", raffle.key().as_ref()],
    bump,
    )]
    pub proceeds: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}