import { Wallet } from "@project-serum/anchor";
import { getMint } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import axios from "axios";
import base58 from "bs58";
import dotenv from "dotenv";

dotenv.config();

export const serverConfig = {
  KEY: process.env.KEY!,
  HTTPS_MAINNET: process.env.HTTPS_MAINNET!,
  WSS_MAINNET: process.env.WSS_MAINNET!,
};

const wallet = new Wallet(
  Keypair.fromSecretKey(base58.decode(process.env.KEY!))
);

export const connection = new Connection(serverConfig.HTTPS_MAINNET, {
  wsEndpoint: serverConfig.WSS_MAINNET,
});

export const payer = Keypair.fromSecretKey(base58.decode(serverConfig.KEY));

// console.log(payer.publicKey.toBase58())

export const fetchTokenBalance = async (tokenAddress: string) => {
  try {
    const mintAddress = new PublicKey(tokenAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { mint: mintAddress }
    );
    const tokenAccountInfo = tokenAccounts.value.find(
      (accountInfo) =>
        accountInfo.account.data.parsed.info.mint === mintAddress.toString()
    );
    if (tokenAccountInfo) {
      const tokenAccountAddress = tokenAccountInfo.pubkey;
      const balance = await connection.getTokenAccountBalance(
        tokenAccountAddress,
        "processed"
      );
      return balance.value.uiAmount || 0;
    }
    return 0;
  } catch (error) {
    console.error(`Error fetching ${tokenAddress} balance:`, error);
    return 0;
  }
};

export const getTokenDecimals = async (tokenMintAddress: string) => {
  const mintPublicKey = new PublicKey(tokenMintAddress);

  try {
    // Fetch mint information
    const mintInfo = await getMint(connection, mintPublicKey);
    // console.log(`Token Mint Address: ${tokenMintAddress}`);
    // console.log(`Decimals: ${mintInfo.decimals}`);
    return mintInfo.decimals;
  } catch (error) {
    console.error("Error fetching token decimals:", error);
    return 0;
  }
};

const JUPITER_PRICE_API_URL = "https://api.jup.ag/price/v2";

export const getTokenPrice = async (tokenAddress: string) => {
  try {
    const response = await axios.get(
      `${JUPITER_PRICE_API_URL}?ids=${tokenAddress}`
    );
    const priceData = response.data.data[tokenAddress];

    if (priceData) {
      //   console.log(`Price of token ${tokenAddress}: ${priceData.price} USDC`);
      return priceData.price;
    } else {
      console.log(`No price data found for token ${tokenAddress}`);
      return 0;
    }
  } catch (error) {
    console.error("Error fetching token price:", error);
    return 0;
  }
};

export const formatTime = (ms: number): string => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, "0")}: ${String(minutes).padStart(
    2,
    "0"
  )}: ${String(seconds).padStart(2, "0")}: ${String(milliseconds).padStart(
    3,
    "0"
  )}`;
};

export const calculateTimeDifference = (
  timestamp1: number,
  timestamp2: number
): string => {
  const differenceInMs = Math.abs(timestamp1 - timestamp2);
  return formatTime(differenceInMs);
};
