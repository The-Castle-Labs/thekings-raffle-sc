import * as web3 from "@solana/web3.js";
import fs from "fs";

export function existsKeyPair(file_name: string): boolean {
  return fs.existsSync(`${__dirname}/accounts_kp/${file_name}_key_pair.json`);
}

export async function initializeKeypair(connection: web3.Connection, file_name: string, airdrop = true): Promise<web3.Keypair> {
  const file_path = `${__dirname}/accounts_kp/${file_name}_key_pair.json`;

  if (fs.existsSync(file_path)) {
    const key_pair = fs.readFileSync(file_path, { encoding: 'utf8', flag: 'r' });
    const secret = JSON.parse(key_pair ?? "") as number[];
    const secretKey = Uint8Array.from(secret);
    const keypairFromSecretKey = web3.Keypair.fromSecretKey(secretKey);
    console.log('Reading ', keypairFromSecretKey.publicKey.toString());
    if (airdrop) await airdropSolIfNeeded(keypairFromSecretKey, connection);

    return keypairFromSecretKey;
  }

  try {
    const signer = new web3.Keypair();
    fs.writeFileSync(file_path, `[${signer.secretKey.toString()}]`);
    if (airdrop) await airdropSolIfNeeded(signer, connection);

    return signer
  } catch (err) {
    console.log(err);
  }
}

async function airdropSolIfNeeded(signer: web3.Keypair, connection: web3.Connection) {
  const balance = await connection.getBalance(signer.publicKey)
  console.log("Current balance is", balance / web3.LAMPORTS_PER_SOL)

  if (balance < web3.LAMPORTS_PER_SOL) {
    console.log("Airdropping 1 SOL...")
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      web3.LAMPORTS_PER_SOL
    )

    const latestBlockHash = await connection.getLatestBlockhash()

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature,
    })

    const newBalance = await connection.getBalance(signer.publicKey)
    console.log("New balance is", newBalance / web3.LAMPORTS_PER_SOL)
  }
}