import {
  AuthorityType,
  createMint,
  createSetAuthorityInstruction,
  getOrCreateAssociatedTokenAccount,
  mintTo
} from "@solana/spl-token";
import {Connection, Signer, Transaction, sendAndConfirmTransaction} from "@solana/web3.js";

export async function createNft(
  connection: Connection,
  owner: Signer
) {
  console.log('Creating NFT');
  const mint = await createMint(
    connection,
    owner,
    owner.publicKey,
    owner.publicKey,
    0
  );
  console.log('Mint: ', mint.toString());

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    owner,
    mint,
    owner.publicKey
  );
  console.log('Mint ATA: ', ata.address.toString());

  await mintTo(
    connection,
    owner,
    mint,
    ata.address,
    owner,
    1
  );

  let tx = new Transaction()
    .add(createSetAuthorityInstruction(
      mint,
      owner.publicKey,
      AuthorityType.MintTokens,
      null
    ));

  await sendAndConfirmTransaction(connection, tx, [owner]);

  return ata;
}