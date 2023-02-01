pub mod instructions;
pub mod errors;
pub mod utils;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("EVakesLUYmAAf8wrzLByEScNnmQrUJE7Hgzcsypj7bk5");

#[program]
pub mod thekings_raffle_sc {
    use super::*;

    pub fn create_raffle(_ctx: Context<CreateRaffle>, max_entrants: u32, end_timestamp: i64, ticket_price: u64) -> Result<()> {
        instructions::create_raffle(_ctx, max_entrants, end_timestamp, ticket_price)
    }

    pub fn add_prize(_ctx: Context<AddPrize>, prize_index: u32, amount: u64) -> Result<()> {
        instructions::add_prize(_ctx, prize_index, amount)
    }

    pub fn buy_tickets(_ctx: Context<BuyTickets>, amount: u16) -> Result<()> {
        instructions::buy_tickets(_ctx, amount)
    }

    pub fn reveal_winners(_ctx: Context<RevealWinners>) -> Result<()> {
        instructions::reveal_winners(_ctx)
    }

    pub fn claim_prize(_ctx: Context<ClaimPrize>, prize_index: u32, ticket_index: u32) -> Result<()> {
        instructions::claim_prize(_ctx, prize_index, ticket_index)
    }

    pub fn close_entrants(_ctx: Context<CloseEntrants>) -> Result<()> {
        instructions::close_entrants(_ctx)
    }

    pub fn collect_proceeds(_ctx: Context<CollectProceeds>) -> Result<()> {
        instructions::collect_proceeds(_ctx)
    }
}
