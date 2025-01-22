import {
  createJupiterApiClient,
  QuoteGetRequest,
  QuoteResponse,
  SwapInstructionsPostRequest,
} from "@jup-ag/api";
import { NATIVE_MINT } from "@solana/spl-token";
import { LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import {
  calculateTimeDifference,
  fetchTokenBalance,
  getTokenDecimals,
  getTokenPrice,
  payer,
} from "./config";
import { jitoTip } from "./constants";
import { sendTxUsingJito } from "./utils";
import yargs from "yargs";

const jupiterQuoteApi = createJupiterApiClient();
const getQuote = async (params: QuoteGetRequest) => {
  const res: QuoteResponse = await jupiterQuoteApi.quoteGet(params);
  return res;
};

const getSwap = async (params: SwapInstructionsPostRequest) => {
  return await jupiterQuoteApi.swapPost(params);
};

const swapViaJupiter = async (
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  slippageBps: number = 500
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
    // console.log(`getting Quote ...`);
    const swapResponse = await getSwap({
      swapRequest: {
        quoteResponse: quoteResponse,
        userPublicKey: payer.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: { jitoTipLamports: jitoTip },
      },
    });
    // console.log(`excute swaping ...`);
    const txBuf = Buffer.from(swapResponse.swapTransaction, "base64");
    let tx = VersionedTransaction.deserialize(txBuf);
    tx.sign([payer]);

    const { result, txUrl } = await sendTxUsingJito(tx);
    // console.log(result, txUrl);
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
  } catch (e) {
    console.error(e);
  }
};

export const buyToken = async (tokenAddress: string) => {
  console.log("=".repeat(40));
  console.log("Buy Transaction:");
  await swapViaJupiter(
    NATIVE_MINT.toBase58(),
    tokenAddress,
    0.01 * LAMPORTS_PER_SOL
  );
  const solanaPrice = await getTokenPrice(
    "So11111111111111111111111111111111111111112"
  );
  console.log(`Jito fees: 0.0001 SOL($${(solanaPrice * 0.0001).toFixed(4)})`);
  console.log(
    `Swap fees: 0.000005 SOL($${(solanaPrice * 0.000005).toFixed(4)})`
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
    await swapViaJupiter(
      tokenAddress,
      NATIVE_MINT.toBase58(),
      tokenBalance * 10 ** decimal
    );

    const solanaPrice = await getTokenPrice(
      "So11111111111111111111111111111111111111112"
    );
    const tokenPrice = await getTokenPrice(tokenAddress);
    console.log(`Jito fees: 0.0001 SOL($${(solanaPrice * 0.0001).toFixed(4)})`);
    console.log(
      `Swap fees: 0.000005 SOL($${(solanaPrice * 0.000005).toFixed(4)})`
    );
    console.log(
      "Total Investment including fees",
      "$" + (tokenPrice * tokenBalance + solanaPrice * 0.000105).toFixed(4)
    );
    console.log("=".repeat(40));
  }
};

// const argv = yargs(process.argv.slice(2))
//   .command(
//     "buy <tokenAddress>",
//     "Buy a token",
//     (yargs) => {
//       yargs.positional("tokenAddress", {
//         describe: "The address of the token to buy",
//         type: "string",
//       });
//     },
//     (argv) => {
//       buyToken(argv.tokenAddress as string);
//     }
//   )
//   .command(
//     "sell <tokenAddress>",
//     "Sell a token",
//     (yargs) => {
//       yargs.positional("tokenAddress", {
//         describe: "The address of the token to sell",
//         type: "string",
//       });
//     },
//     (argv) => {
//       sellToken(argv.tokenAddress as string);
//     }
//   )
//   .help().argv;
