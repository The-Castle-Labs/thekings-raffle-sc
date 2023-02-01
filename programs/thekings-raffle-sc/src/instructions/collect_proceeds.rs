use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::errors::RaffleError;
use crate::instructions::Raffle;

pub fn collect_proceeds(_ctx: Context<CollectProceeds>) -> Result<()> {
    let raffle = &_ctx.accounts.raffle;

    if !raffle.randomness.is_some() {
        return Err(RaffleError::WinnerNotDrawn.into());
    }

    let seeds = &[b"raffle".as_ref(), raffle.entrants.as_ref(), &[raffle.bump]];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            _ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: _ctx.accounts.proceeds.to_account_info(),
                to: _ctx.accounts.creator_proceeds.to_account_info(),
                authority: _ctx.accounts.raffle.to_account_info(),
            },
            signer_seeds,
        ),
        _ctx.accounts.proceeds.amount,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct CollectProceeds<'info> {
    #[account(has_one = creator)]
    pub raffle: Account<'info, Raffle>,
    #[account(
    mut,
    seeds = [b"proceeds", raffle.key().as_ref()],
    bump
    )]
    pub proceeds: Account<'info, TokenAccount>,
    pub creator: Signer<'info>,
    #[account(
    mut,
    constraint = creator_proceeds.owner == creator.key()
    )]
    pub creator_proceeds: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}