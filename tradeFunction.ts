import {
  createJupiterApiClient,
  QuoteGetRequest,
  QuoteResponse,
  SwapInstructionsPostRequest,
} from "@jup-ag/api";
import { NATIVE_MINT } from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  calculateTimeDifference,
  fetchTokenBalance,
  getTokenDecimals,
  getTokenPrice,
  payer,
} from "./config";
import { sendTxUsingJito } from "./utils";
import { jitoTip } from "./constants";
import yargs from "yargs";

const jupiterQuoteApi = createJupiterApiClient();
const getQuote = async (params: QuoteGetRequest) => {
  const res: QuoteResponse = await jupiterQuoteApi.quoteGet(params);
  return res;
};

const getSwap = async (params: SwapInstructionsPostRequest) => {
  return await jupiterQuoteApi.swapPost(params);
};

export const calculateJitoTip = (quoteResponse: QuoteResponse): number => {
  const baseTip = 1000;
  const dynamicFactor =
    Number(quoteResponse.outAmount) / Number(quoteResponse.inAmount);
  console.log("dynamicFactor", dynamicFactor);
  return dynamicFactor > 100000
    ? 100000
    : dynamicFactor > 1
    ? Math.round(baseTip * dynamicFactor)
    : Math.round(baseTip / dynamicFactor);
};

export const calculateDynamicSlippage = (
  quoteResponse: QuoteResponse
): number => {
  console.log("quoteResponse", quoteResponse);
  const slippageFactor = 0.01;
  const slippage = Math.round(Number(quoteResponse.inAmount) * slippageFactor);
  return slippage > 5000 ? 5000 : slippage;
};

const swapViaJupiter = async (
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  slippageBps = 5000
) => {
  const startTime = Date.now();
  console.log(
    `Time started: ${new Date(startTime).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    })}`
  );
  try {
    const quoteResponse = await getQuote({
      inputMint: inputMint,
      outputMint: outputMint,
      amount: inputAmount,
      slippageBps,
    });
    const swapResponse = await getSwap({
      swapRequest: {
        quoteResponse: quoteResponse,
        userPublicKey: payer.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: { jitoTipLamports: jitoTip },
        // computeUnitPriceMicroLamports: {
        //   units: 200000,
        // },
      },
    });
    const txBuf = Buffer.from(swapResponse.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);

    // Step 1: Add Compute Budget Instruction

    tx.sign([payer]);

    const { result, txUrl } = await sendTxUsingJito(tx);
    const endTime = Date.now();
    console.log(
      `Time confirmed: ${new Date(endTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      })}`
    );
    console.log(
      `Time Duration: ${calculateTimeDifference(endTime, startTime)}`
    );
    return { jitoTip, slippageBps };
  } catch (e) {
    console.error(
      "Network is busy so that try again bit later! at least 1 minute"
    );
    return { jitoTipLamports: 0, slippageBps: 0 };
  }
};

export const buyToken = async (tokenAddress: string) => {
  console.log("=".repeat(40));
  console.log("Buy Transaction:");
  const { jitoTipLamports, slippageBps } = await swapViaJupiter(
    NATIVE_MINT.toBase58(),
    tokenAddress,
    0.01 * LAMPORTS_PER_SOL
  );
  const solanaPrice = await getTokenPrice(
    "So11111111111111111111111111111111111111112"
  );
  console.log(
    `Jito fees: ${jitoTip / LAMPORTS_PER_SOL} SOL($${(
      (solanaPrice * jitoTip) /
      LAMPORTS_PER_SOL
    ).toFixed(4)})`
  );
  console.log(
    `Swap fees: ${slippageBps / LAMPORTS_PER_SOL} SOL($${(
      (solanaPrice * slippageBps) /
      LAMPORTS_PER_SOL
    ).toFixed(4)})`
  );
  console.log(
    `Total Investment including fees: $${(solanaPrice * 0.010105).toFixed(4)}`
  );
  console.log("=".repeat(40));
};

export const sellToken = async (tokenAddress: string) => {
  const tokenBalance = await fetchTokenBalance(tokenAddress);
  if (tokenBalance === 0) {
    console.log(
      `There is no balance associated with the token address ${tokenAddress}.`
    );
  } else {
    console.log("=".repeat(40));
    console.log("Sell Transaction:");
    const decimal = await getTokenDecimals(tokenAddress);
    // console.log("decimal", decimal);
    const { jitoTipLamports, slippageBps } = await swapViaJupiter(
      tokenAddress,
      NATIVE_MINT.toBase58(),
      tokenBalance * 10 ** decimal
    );

    const solanaPrice = await getTokenPrice(
      "So11111111111111111111111111111111111111112"
    );
    const tokenPrice = await getTokenPrice(tokenAddress);
    console.log(
      `Jito fees: ${jitoTip / LAMPORTS_PER_SOL} SOL($${(
        (solanaPrice * jitoTip) /
        LAMPORTS_PER_SOL
      ).toFixed(4)})`
    );
    console.log(
      `Swap fees: ${slippageBps / LAMPORTS_PER_SOL} SOL($${(
        (solanaPrice * slippageBps) /
        LAMPORTS_PER_SOL
      ).toFixed(4)})`
    );
    console.log(
      "Total Investment including fees",
      "$" + (tokenPrice * tokenBalance + solanaPrice * 0.000105).toFixed(4)
    );
    console.log("=".repeat(40));
  }
};
