#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { buyToken, sellToken } from "./index"; // Adjust the import path if necessary

yargs(hideBin(process.argv))
  .scriptName("trade")
  .command(
    "buy <tokenAddress>",
    "Execute a buy transaction",
    (yargs) => {
      yargs.positional("tokenAddress", {
        describe: "The token address to buy",
        type: "string",
      });
    },
    async (argv) => {
      const { tokenAddress } = argv;
      await buyToken(tokenAddress as string);
    }
  )
  .command(
    "sell <tokenAddress>",
    "Execute a sell transaction",
    (yargs) => {
      yargs.positional("tokenAddress", {
        describe: "The token address to sell",
        type: "string",
      });
    },
    async (argv) => {
      const { tokenAddress } = argv;
      await sellToken(tokenAddress as string);
    }
  )
  .demandCommand(1, "You need to specify a command (buy or sell)")
  .help()
  .parse();
