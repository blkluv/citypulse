import dotenv from "dotenv";
dotenv.config();

export const config = {
  arcTestnetRpcUrl: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
  contractAddress: process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
  privateKey: process.env.PRIVATE_KEY || "0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6",
  port: parseInt(process.env.PORT || "3001", 10),
};
