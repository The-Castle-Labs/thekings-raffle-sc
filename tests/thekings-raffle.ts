import * as anchor from "@project-serum/anchor";
import {ThekingsRaffleSc} from "../target/types/thekings_raffle_sc";
import {expect} from "chai";
import {existsKeyPair, initializeKeypair} from "./sol-utils";
import {addPrize, createRaffle} from "./sc-methods";
import {createNft} from "./token-utils";
import {
  getAssociatedTokenAddress,
  getMint, getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import dayjs from "dayjs";

/*
Create SC: 0.0014251 SOL
Create Raffle: 1.1161086
 */

describe("thekings-raffle", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.ThekingsRaffleSc as anchor.Program<ThekingsRaffleSc>;
  const token = new anchor.web3.PublicKey('B5JGFqvQFY2gU2rknZ2YnsNeqyNU4tdzBJdaAa1Q1vEw');
  const end_raffle = 1672516800;
  console.log(dayjs.unix(end_raffle).toISOString());

  it.skip("should initialize raffle", async () => {
    // Allows to create an entrants keypair and initialize the account to use in the tests below
    const entrants = existsKeyPair('entrants') ? new anchor.web3.Keypair()
      : await initializeKeypair(program.provider.connection, 'entrants', false);
    const mint = await getMint(program.provider.connection, token);

    const provider = await initializeKeypair(program.provider.connection, 'creator', false);

    //console.log(parseInt((new Date().getTime() / 1000).toFixed(0)));

    const rafflePDA = await createRaffle(
      program,
      provider,
      1000,
      end_raffle,
      entrants,
      token,
      2 * 10 ** mint.decimals
    );

    const raffle = await program.account.raffle.fetch(rafflePDA);
    expect(raffle.entrants.toString()).to.equal(entrants.publicKey.toString());
    expect(raffle.endTimestamp.eq(new anchor.BN(end_raffle))).true;
  });

  it.skip('should add a prize to the raffle', async () => {
    const provider = await initializeKeypair(program.provider.connection, 'creator', false);
    const entrants = await initializeKeypair(program.provider.connection, 'entrants', false);

    const [rafflePDA] = anchor.web3.PublicKey.findProgramAddressSync([
        anchor.utils.bytes.utf8.encode("raffle"),
        entrants.publicKey.toBuffer()
      ],
      program.programId);
    const raffle = await program.account.raffle.fetch(rafflePDA);

    const ATA = await createNft(program.provider.connection, provider);

    await addPrize(
      program,
      entrants,
      raffle.totalPrizes,
      ATA,
      1
    );
  });

  it.skip('should throw invalid prize index error', async () => {
    const provider = await initializeKeypair(program.provider.connection, 'creator', false);
    const entrants = await initializeKeypair(program.provider.connection, 'entrants', false);

    const ATA = await createNft(program.provider.connection, provider);

    try {
      await addPrize(
        program,
        entrants,
        0,
        ATA,
        1
      );
    } catch (err) {
      console.log(err);
    }
  });

  it.skip('should buy tickets', async () => {
    const entrants = await initializeKeypair(program.provider.connection, 'entrants', false);
    const [rafflePDA, _] = anchor.web3.PublicKey.findProgramAddressSync([
        anchor.utils.bytes.utf8.encode("raffle"),
        entrants.publicKey.toBuffer()
      ],
      program.programId);

    const [proceedsPDA] = anchor.web3.PublicKey.findProgramAddressSync([
      anchor.utils.bytes.utf8.encode("proceeds"),
      rafflePDA.toBuffer()
    ], program.programId);

    const userAta = await getAssociatedTokenAddress(token, program.provider.publicKey);

    console.log('Usr Token Acc:', userAta.toString());

    const tx = await program.methods.buyTickets(10)
      .accounts({
        raffle: rafflePDA,
        entrants: entrants.publicKey,
        proceeds: proceedsPDA,
        buyerTokenAccount: userAta,
        buyer: program.provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      //.signers([provider])
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it('should reveal winner(s)', async () => {
    console.log('Raffle ended');
    const entrants = await initializeKeypair(program.provider.connection, 'entrants', false);
    const [rafflePDA, _] = anchor.web3.PublicKey.findProgramAddressSync([
        anchor.utils.bytes.utf8.encode("raffle"),
        entrants.publicKey.toBuffer()
      ],
      program.programId);

    const tx = await program.methods
      .revealWinners()
      .accounts({
        raffle: rafflePDA,
        recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it.only('should claim prize', async () => {
    // Raffle PDA  :  EmWQVnLsgWsnffSRjUR7VsuM29XEaYwPMG9evcDXMbza
    // Proceeds PDA:  H8C7bATbC1ACF3pVHTCVRSKuwKyhv1m5hBNQjaUKwz9S
    // Entrants    :  2RqJc6vSaGgmob54NssnUATniryGZigPU3RZhobdS6hB
    // Provider    :  Az9bZzW2197hmk1fjMWBQAjNjJWYqWPXL85dJjvtS4RE
    // Mint:  BG4SSB3tLFYhwhF26FhU4FLozBhWsZSKF4osAx1mG68u
    // Mint ATA:  BaGtcf4uTD2vT3njKvkDZ9sFBLmBuaKQ5rfgzTSBVZvJ
    const provider = await initializeKeypair(program.provider.connection, 'creator', false);
    const entrants = await initializeKeypair(program.provider.connection, 'entrants', false);
    const [rafflePDA, _] = anchor.web3.PublicKey.findProgramAddressSync([
        anchor.utils.bytes.utf8.encode("raffle"),
        entrants.publicKey.toBuffer()
      ],
      program.programId);

    const [prizePDA] = anchor.web3.PublicKey.findProgramAddressSync([
      anchor.utils.bytes.utf8.encode("prize"),
      rafflePDA.toBuffer(),
      new anchor.BN(0).toBuffer('le')
    ], program.programId);

    console.log('prize: ', prizePDA.toString());
    console.log('raffle', rafflePDA.toString());
    console.log('entrants', entrants.publicKey.toString());
    const prizeMint = await getMint(program.provider.connection, prizePDA);

    const winnerTokenAcc = await getOrCreateAssociatedTokenAccount(
      program.provider.connection,
      provider,
      prizeMint.address,
      program.provider.publicKey
    );
    console.log('winner', winnerTokenAcc);

    const raffle = await program.account.raffle.fetch(rafflePDA);
    const tx = await program.methods
      .claimPrize(0, raffle.randomness as number)
      .accounts({
        raffle: rafflePDA,
        entrants: entrants.publicKey,
        prize: prizePDA,
        winnerTokenAccount: winnerTokenAcc.address,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it('should close entrants account', async () => {
    const entrants = await initializeKeypair(program.provider.connection, 'entrants', false);
    const [rafflePDA, _] = anchor.web3.PublicKey.findProgramAddressSync([
        anchor.utils.bytes.utf8.encode("raffle"),
        entrants.publicKey.toBuffer()
      ],
      program.programId);

    const tx = await program.methods
      .closeEntrants()
      .accounts({
        raffle: rafflePDA,
        entrants: entrants.publicKey,
        creator: program.provider.publicKey,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it('should collect proceeds', async () => {
    const entrants = await initializeKeypair(program.provider.connection, 'entrants', false);
    const [rafflePDA, _] = anchor.web3.PublicKey.findProgramAddressSync([
        anchor.utils.bytes.utf8.encode("raffle"),
        entrants.publicKey.toBuffer()
      ],
      program.programId);

    const [proceedsPDA] = anchor.web3.PublicKey.findProgramAddressSync([
        anchor.utils.bytes.utf8.encode("proceeds"),
        rafflePDA.toBuffer()
      ],
      program.programId);

    const creatorProceeds = await getAssociatedTokenAddress(token, program.provider.publicKey);

    const tx = await program.methods
      .collectProceeds()
      .accounts({
        raffle: rafflePDA,
        proceeds: proceedsPDA,
        creator: program.provider.publicKey,
        creatorProceeds,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it('get block time', async () => {
    const entrants = await initializeKeypair(program.provider.connection, 'entrants', false);
    const [rafflePDA, _] = anchor.web3.PublicKey.findProgramAddressSync([
        anchor.utils.bytes.utf8.encode("raffle"),
        entrants.publicKey.toBuffer()
      ],
      program.programId);
    const e = await program.provider.connection.getBlockTime(await program.provider.connection.getSlot());
    const raffle = await program.account.raffle.fetch(rafflePDA);
    console.log(raffle);
    console.log(dayjs.unix(raffle.endTimestamp.toNumber()).toISOString(), dayjs.unix(e).toISOString())
  })
  
});