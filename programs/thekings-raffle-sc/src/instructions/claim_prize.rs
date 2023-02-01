use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::errors::RaffleError;
use crate::instructions::{Entrants, Raffle};
use crate::utils::randomness_tools;

pub fn claim_prize(_ctx: Context<ClaimPrize>, prize_index: u32, ticket_index: u32) -> Result<()> {
    let raffle_account_info = _ctx.accounts.raffle.to_account_info();
    let raffle = &mut _ctx.accounts.raffle;

    let randomness = match raffle.randomness {
        Some(randomness) => randomness,
        None => return err!(RaffleError::WinnerNotDrawn),
    };

    let entrants = _ctx.accounts.entrants.load()?;

    let winner_rand = randomness_tools::expand(randomness, prize_index);
    let winner_index = winner_rand % entrants.n_entrants;

    msg!(
            "Ticket {} attempts claiming prize {} (winner is {})",
            ticket_index,
            prize_index,
            winner_index
        );
    msg!("{} {}", winner_rand, winner_index);

    if ticket_index != winner_index {
        return err!(RaffleError::TicketHasNotWon);
    }

    if _ctx.accounts.winner_token_account.owner.key() != entrants.entrants[ticket_index as usize] {
        return err!(RaffleError::TokenAccountNotOwnedByWinner);
    }

    if _ctx.accounts.prize.amount == 0 {
        return err!(RaffleError::NoPrize);
    }

    let seeds = &[b"raffle".as_ref(), raffle.entrants.as_ref(), &[raffle.bump]];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            _ctx.accounts.token_program.to_account_info().clone(),
            token::Transfer {
                from: _ctx.accounts.prize.to_account_info(),
                to: _ctx.accounts.winner_token_account.to_account_info(),
                authority: raffle_account_info,
            },
            signer_seeds,
        ),
        _ctx.accounts.prize.amount,
    )?;

    raffle.claimed_prizes = raffle.claimed_prizes
        .checked_add(1)
        .ok_or(RaffleError::InvalidCalculation)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(prize_index: u32)]
pub struct ClaimPrize<'info> {
    #[account(mut, has_one = entrants)]
    pub raffle: Account<'info, Raffle>,
    pub entrants: AccountLoader<'info, Entrants>,
    #[account(
    mut,
    seeds = [b"prize", raffle.key().as_ref(), & prize_index.to_le_bytes()],
    bump,
    )]
    pub prize: Account<'info, TokenAccount>,
    #[account(mut)]
    pub winner_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}