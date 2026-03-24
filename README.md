# CityPulse - Municipal Traffic x402 Nanopayments on Arc

> **Municipal vehicles are already everywhere. Their data is going to waste. x402 nanopayments unlock this data for anyone who needs it. The municipality earns revenue. Drivers save time. The city gets smarter. Everyone wins.**

CityPulse is a full-stack demo showing how municipalities can monetize fleet vehicle telemetry data through x402 nanopayments on Arc. Drivers pay sub-cent amounts to get real-time, ground-truth traffic data from municipal vehicles (buses, garbage trucks, service cars) and receive AI-optimized routes that avoid congestion.

## Complementary to Tesla x402

CityPulse is the municipal counterpart to individual vehicle telemetry monetization. Inspired by [@corey__cooper](https://x.com/corey__cooper)'s Tesla Fleet Telemetry x402 build, CityPulse extends the same x402 pattern to municipal fleet vehicles:

| | Tesla x402 (Corey) | CityPulse (Himess) |
|---|---|---|
| Data source | Individual Tesla | Municipal fleet (buses, trucks) |
| Data type | Single vehicle telemetry | City-wide traffic flow |
| Payment model | Per-vehicle data access | Per-route optimization query |
| Use case | Vehicle monitoring | Real-time traffic avoidance |
| Long-term value | Vehicle analytics | Urban planning intelligence |

**Together**: Individual cars + municipal fleet = complete urban mobility data layer. Same x402 protocol. Same payment rails. Fully interoperable.

## Architecture

```
Frontend (Next.js + Leaflet)  ←→  Backend (Express + Socket.IO)  ←→  Arc Testnet
     │                                    │
     │  WebSocket (live vehicles)         │  Vehicle Simulator (40 vehicles)
     │  REST + x402 (route queries)       │  x402 Middleware (payment verification)
     │  Dashboard (public stats)          │  Route Optimizer (A* pathfinding)
```

## Quick Start

### Prerequisites

- Node.js 18+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- MetaMask wallet
- Arc Testnet USDC (from [Circle faucet](https://faucet.circle.com))

### 1. Deploy Contracts

```bash
cd contracts
forge install
forge build
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.network --broadcast --private-key $PRIVATE_KEY
```

Copy the deployed contract address for the next steps.

### 2. Start Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set CONTRACT_ADDRESS to the deployed address
npm run dev
# Server starts on http://localhost:3001
```

### 3. Start Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_CONTRACT_ADDRESS
npm run dev
# App starts on http://localhost:3000
```

### 4. Configure MetaMask

Add Arc Testnet to MetaMask:
- Network Name: Arc Testnet
- RPC URL: https://rpc.testnet.arc.network
- Chain ID: 5042002
- Currency: USDC (6 decimals)
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com

## How It Works

1. **40 municipal vehicles** move through Istanbul streets in real-time (simulated)
2. **Connect your wallet** on the frontend
3. **Click two points** on the map to request a route
4. **Pay a sub-cent x402 nanopayment** via MetaMask
5. **Receive an optimized route** that uses real vehicle speed data
6. **See the comparison**: Normal route vs CityPulse route with time saved
7. **Watch the dashboard**: Revenue counter, payment feed, zone rankings update live

## x402 Payment Flow

```
1. User clicks two points on map (start → end)
2. Frontend shows: "5 vehicles on route, cost: 0.005 USDC"
3. User clicks "Pay & Get Route"
4. MetaMask popup → contract.payForRoute(fromZone, toZone, vehicleCount)
5. Transaction confirms on Arc Testnet
6. Frontend sends GET /api/route with X-PAYMENT-TX: 0x... header
7. Backend verifies tx on-chain → serves optimized route
8. Map shows: red (normal) vs cyan (optimized) routes
9. Card shows: "Normal: 42 min → CityPulse: 28 min | Saved: 14 min"
```

## Tech Stack

- **Contracts**: Solidity 0.8.24, Foundry
- **Backend**: TypeScript, Express, Socket.IO, ethers.js v6
- **Frontend**: Next.js 14, Leaflet, TailwindCSS, ethers.js v6
- **Chain**: Arc Testnet (EVM)
- **Map**: OpenStreetMap + CartoDB Dark Matter tiles

## Environment Variables

### backend/.env
```
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=0x...
PORT=3001
```

### frontend/.env.local
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
```

## Project Structure

```
citypulse/
├── README.md
├── contracts/           # Foundry — CityPulseX402 smart contract
│   ├── src/
│   ├── script/
│   └── test/
├── backend/             # TypeScript — Express + Socket.IO server
│   └── src/
│       ├── simulator/   # 40 vehicle simulator (Istanbul routes)
│       ├── x402/        # Payment verification middleware
│       ├── routes/      # API endpoints
│       ├── services/    # Route optimizer, heatmap
│       └── websocket/   # Real-time vehicle stream
└── frontend/            # Next.js — Interactive map dashboard
    └── src/
        ├── components/  # Map, Dashboard, RoutePanel
        ├── hooks/       # WebSocket, contract, payment
        └── lib/         # Config, ABI, constants
```

## License

MIT

---

Built by [@Himess__](https://x.com/Himess__) for the Arc ecosystem.
