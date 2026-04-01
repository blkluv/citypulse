import { CONTRACT_ADDRESS } from "./constants";

export { CONTRACT_ADDRESS };

export const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "string", name: "fromZone", type: "string" },
      { internalType: "string", name: "toZone", type: "string" },
      { internalType: "uint256", name: "vehicleCount", type: "uint256" },
    ],
    name: "payForRoute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "zone", type: "string" },
    ],
    name: "payForParking",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newPrice", type: "uint256" },
    ],
    name: "setQueryPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_newPrice", type: "uint256" },
    ],
    name: "setParkingQueryPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getStats",
    outputs: [
      { internalType: "uint256", name: "_totalQueries", type: "uint256" },
      { internalType: "uint256", name: "_totalRevenue", type: "uint256" },
      { internalType: "uint256", name: "_queryPrice", type: "uint256" },
      { internalType: "uint256", name: "_balance", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getParkingStats",
    outputs: [
      { internalType: "uint256", name: "_totalParkingQueries", type: "uint256" },
      { internalType: "uint256", name: "_parkingQueryPrice", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "queryPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "parkingQueryPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalQueries",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalParkingQueries",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalRevenue",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "municipality",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "driver", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
      { indexed: false, internalType: "string", name: "fromZone", type: "string" },
      { indexed: false, internalType: "string", name: "toZone", type: "string" },
      { indexed: false, internalType: "uint256", name: "vehiclesQueried", type: "uint256" },
    ],
    name: "QueryPaid",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "driver", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
      { indexed: false, internalType: "string", name: "zone", type: "string" },
    ],
    name: "ParkingQueryPaid",
    type: "event",
  },
] as const;
