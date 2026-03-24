import dotenv from "dotenv";
dotenv.config();

export const config = {
  arcTestnetRpcUrl: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
  contractAddress: process.env.CONTRACT_ADDRESS || "0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5",
  privateKey: process.env.PRIVATE_KEY || "0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6",
  chainId: parseInt(process.env.CHAIN_ID || "5042002", 10),
  port: parseInt(process.env.PORT || "3001", 10),
  demoSimulatorEnabled: process.env.DEMO_SIMULATOR === "true",
  osrmUrl: process.env.OSRM_URL || "https://router.project-osrm.org",
  routeVehicleRadius: parseInt(process.env.ROUTE_VEHICLE_RADIUS_METERS || "300"),
};
