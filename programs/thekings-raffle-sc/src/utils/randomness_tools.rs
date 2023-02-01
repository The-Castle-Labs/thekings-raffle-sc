use anchor_lang::solana_program::keccak;
use std::convert::TryInto;

//https://docs.chain.link/docs/chainlink-vrf-best-practices/#getting-multiple-random-number
pub fn expand(randomness: [u8; 32], n: u32) -> u32 {
    let mut hasher = keccak::Hasher::default();
    hasher.hash(&randomness);
    hasher.hash(&n.to_le_bytes());

    u32::from_le_bytes(
        hasher.result().to_bytes()[0..4]
            .try_into()
            .expect("slice with incorrect length"),
    )
}