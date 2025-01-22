import { VersionedTransaction } from "@solana/web3.js";
import axios from "axios";
import base58 from "bs58";
import { jitoUrls } from "./constants";
import { connection } from "./config";

export const sendTxUsingJito = async (tx: VersionedTransaction) => {
    let txUrl = "";
    await Promise.any([
        ...jitoUrls.map(async (url) => {
            try {
                const res = await axios.post(
                    `${url}/api/v1/transactions`,
                    {
                        id: 1,
                        jsonrpc: "2.0",
                        method: "sendTransaction",
                        params: [
                            Buffer.from(tx.serialize()).toString("base64"),
                            {
                                encoding: "base64",
                            },
                        ],
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
                return res.data.result;
            } catch {
                return undefined;
            }
        }),
    ]);
    const txid = base58.encode(tx.signatures[0]);
    const recentBlockhash = await connection.getLatestBlockhash();

    try {
        await connection.confirmTransaction(
            {
                signature: txid,
                ...recentBlockhash,
            },
            "processed"
        );
        txUrl = `https://solscan.io/tx/${txid}`;
        return { result: true, txUrl };
    } catch (err) {
        return { result: false, txUrl };
    }
};