import * as anchor from "@project-serum/anchor";
import {ThekingsRaffleSc} from "../target/types/thekings_raffle_sc";
import {Account, TOKEN_PROGRAM_ID} from "@solana/spl-token";

export async function createRaffle(
  program: anchor.Program<ThekingsRaffleSc>,
  provider: anchor.web3.Keypair,
  max_entrants: number,
  end_raffle: number,
  entrants: anchor.web3.Keypair,
  token_mint: anchor.web3.PublicKey,
  ticket_price: number
) {
  const entrants_space = 8 + 4 + 32 * max_entrants;

  const [rafflePDA] = anchor.web3.PublicKey.findProgramAddressSync([
      anchor.utils.bytes.utf8.encode("raffle"),
      entrants.publicKey.toBuffer()
    ],
    program.programId);

  const [proceedsPDA] = anchor.web3.PublicKey.findProgramAddressSync([
    anchor.utils.bytes.utf8.encode("proceeds"),
    rafflePDA.toBuffer()
  ], program.programId);

  console.log('Raffle PDA  : ', rafflePDA.toString());
  console.log('Proceeds PDA: ', proceedsPDA.toString());
  console.log('Entrants    : ', entrants.publicKey.toString());
  console.log('Provider    : ', program.provider.publicKey.toString());

  const tx = await program.methods
    .createRaffle(max_entrants, new anchor.BN(end_raffle), new anchor.BN(ticket_price))
    .accounts({
      raffle: rafflePDA,
      entrants: entrants.publicKey,
      proceeds: proceedsPDA,
      proceedsMint: token_mint,
      creator: program.provider.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY
    })
    .preInstructions([
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: program.provider.publicKey,
        newAccountPubkey: entrants.publicKey,
        lamports: await program.provider.connection.getMinimumBalanceForRentExemption(entrants_space),
        space: entrants_space,
        programId: program.programId
      })
    ])
    .signers([provider, entrants])
    .rpc();
  console.log("Your transaction signature", tx);

  return rafflePDA;

}

export async function addPrize (
  program: anchor.Program<ThekingsRaffleSc>,
  entrants: anchor.web3.Keypair,
  prize_index: number,
  prize_ata: Account,
  amount: number
) {

  const [rafflePDA, _] = anchor.web3.PublicKey.findProgramAddressSync([
      anchor.utils.bytes.utf8.encode("raffle"),
      entrants.publicKey.toBuffer()
    ],
    program.programId);

  const [prizePDA] = anchor.web3.PublicKey.findProgramAddressSync([
    anchor.utils.bytes.utf8.encode("prize"),
    rafflePDA.toBuffer(),
    new anchor.BN(prize_index).toBuffer('le')
  ], program.programId);

  const tx = await program.methods
    .addPrize(prize_index, new anchor.BN(amount))
    .accounts({
      raffle: rafflePDA,
      creator: program.provider.publicKey,
      from: prize_ata.address,
      prize: prizePDA,
      prizeMint: prize_ata.mint,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY
    })
    .rpc();

  console.log("Your transaction signature", tx);
  return [rafflePDA, prizePDA];
}