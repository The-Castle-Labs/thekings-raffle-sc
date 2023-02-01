use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Mint, Token};
use crate::errors::RaffleError;

const ENTRANTS_MAX_SIZE: u32 = 5000;

pub fn create_raffle(_ctx: Context<CreateRaffle>, max_entrants: u32, end_timestamp: i64, ticket_price: u64) -> Result<()> {
    let raffle = &mut _ctx.accounts.raffle;
    raffle.creator = _ctx.accounts.creator.key();
    raffle.end_timestamp = end_timestamp;
    raffle.ticket_price = ticket_price;
    raffle.bump = *_ctx.bumps.get("raffle").unwrap();
    raffle.entrants = _ctx.accounts.entrants.key();
    raffle.randomness = None;

    let mut entrants = _ctx.accounts.entrants.load_init()?;

    if max_entrants > ENTRANTS_MAX_SIZE {
        return err!(RaffleError::MaxEntrantsTooLarge);
    }

    entrants.max = max_entrants;

    Ok(())
}

#[derive(Accounts)]
pub struct CreateRaffle<'info> {
    #[account(
        init,
        payer = creator,
        space = Raffle::LEN,
        seeds = [b"raffle", entrants.key().as_ref()],
        bump
    )]
    pub raffle: Account<'info, Raffle>,
    #[account(zero)]
    pub entrants: AccountLoader<'info, Entrants>,
        #[account(
        init,
        seeds = [b"proceeds", raffle.key().as_ref()],
        bump,
        payer = creator,
        token::mint = proceeds_mint,
        token::authority = raffle,
    )]
    pub proceeds: Account<'info, TokenAccount>,
    pub proceeds_mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Raffle {
    pub creator: Pubkey,
    pub total_prizes: u32,
    pub claimed_prizes: u32,
    pub end_timestamp: i64,
    pub ticket_price: u64,
    pub entrants: Pubkey,
    pub randomness: Option<[u8; 32]>,
    pub bump: u8,
}

impl Raffle {
    const LEN: usize = 8 + 32 + 4 + 4 + 8 + 8 + 32 + (1 + (1 * 32)) + 1;
}

#[account(zero_copy)]
pub struct Entrants {
    pub n_entrants: u32,
    pub max: u32,
    pub entrants: [Pubkey; 1000]
}

impl Entrants {
    pub fn append(&mut self, entrant: Pubkey) -> Result<()> {
        if self.n_entrants >= self.max {
            return err!(RaffleError::NotEnoughTicketsLeft);
        }

        self.entrants[self.n_entrants as usize] = entrant;
        self.n_entrants += 1;

        Ok(())
    }
}