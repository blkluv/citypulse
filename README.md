# CityPulse - Municipal Traffic x402 Nanopayments on Arc

> **CityPulse doesn't just sell traffic data — it actively reduces congestion. Municipal buses run faster, ambulances arrive sooner, and the city gets cleaner. The municipality earns revenue while improving its own operations.**

## The Problem

Right now in Istanbul, everyone uses the same "shortest route" because Google Maps gives everyone the same answer. Result: that road jams, other roads stay empty. Municipal buses crawl at 5 km/h in traffic. Ambulances can't reach hospitals. Garbage trucks can't finish their routes on time.

## The Solution

CityPulse monetizes municipal fleet telemetry through x402 nanopayments on Arc. Drivers pay sub-cent USDC to get real-time, ground-truth traffic data from 40+ municipal vehicles (buses, garbage trucks, ambulances, police cars) and receive optimized routes that avoid congestion.

But here's what makes it powerful: **CityPulse creates a flywheel effect.**

When drivers use CityPulse, they avoid congested roads. But they don't all pile onto the same alternative — the system is real-time, so as one alternative fills up, another is suggested. **Traffic naturally balances across the entire road network.**

The result: municipal buses that were stuck at 5 km/h now move at 20 km/h. Ambulances reach hospitals in 8 minutes instead of 15. Garbage trucks finish their routes on time.

### The Municipality Wins Three Times

1. **Direct revenue** — Earns USDC from data sales via x402 nanopayments
2. **Operational savings** — Own vehicles move faster → less fuel, more trips, fewer vehicles needed
3. **Citizen satisfaction** — Buses on time, ambulances faster, cleaner city

And the best part: **the more people use CityPulse, the better it works.** More drivers → better traffic distribution → faster municipal vehicles → better data → more accurate routes → more drivers. Classic network effect.

## Complementary to Tesla x402

Inspired by [@corey__cooper](https://x.com/corey__cooper)'s Tesla Fleet Telemetry x402 build. CityPulse is the municipal counterpart:

| | Tesla x402 (Corey) | CityPulse (Himess) |
|---|---|---|
| Data source | Individual Tesla | Municipal fleet (buses, trucks) |
| Data type | Single vehicle telemetry | City-wide traffic flow |
| Payment model | Per-vehicle data access | Per-route optimization query |
| Use case | Vehicle monitoring | Real-time traffic avoidance |
| Long-term value | Vehicle analytics | Urban planning intelligence |

**Together**: Individual cars + municipal fleet = complete urban mobility data layer. Same x402 protocol. Same payment rails. Fully interoperable.

## Real Data Sources (v2)

CityPulse integrates real Istanbul data from the IBB Open Data Portal — this is not just a simulation.

| Source | Data | Update Frequency | Status |
|--------|------|-------------------|--------|
| **IBB Traffic Index** | City-wide congestion (1-99 scale) | Real-time (5 min) | Live |
| **ISPARK Parking** | 262 parking facilities, live occupancy | Real-time | Live |
| **Traffic Incidents** | 50+ accidents/construction with GPS | Periodic | Live |
| **IETT Bus Positions** | Fleet GPS via SOAP API | ~1 min | Auth required |
| **OSRM Routing** | Real road-network routing (Istanbul streets) | On-demand | Live |
| **Vehicle Simulator** | 40 municipal vehicles, 9 Istanbul routes | 500ms tick | Simulated |

The system merges real IBB data with simulated vehicles. Each data point on the map is marked **LIVE** (from IBB) or **SIM** (simulated) for full transparency. When real data is unavailable, the system gracefully falls back to simulation.

## On-Chain Verification (v2)

Every payment is cryptographically verified on Arc Testnet:

- **Receipt validation** — tx status, correct contract address
- **Event log parsing** — QueryPaid event with driver, amount, zones, vehicle count
- **Replay protection** — each tx hash can only be used once
- **Contract stats** — totalQueries, totalRevenue read directly from chain

Contract: [`0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5`](https://testnet.arcscan.app/address/0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5) on Arc Testnet (Chain ID: 5042002)

## Demo Mode

Click the **"Start Demo"** button in the header to activate demo mode. This makes **real on-chain transactions** on Arc Testnet every 10-15 seconds using the deployer wallet — the dashboard comes alive with real payments, the revenue counter ticks up, and the payment feed shows verified transactions with ArcScan links.

This is not fake data — every demo payment is a real `payForRoute()` call verified on-chain.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                               │
│  Next.js + Leaflet/CartoDB Dark + TailwindCSS            │
│  Live map, route comparison, dashboard, wallet connect   │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket + REST
┌────────────────────────┼────────────────────────────────┐
│                   BACKEND                                │
│  Express + Socket.IO + ethers.js v6                      │
│                        │                                 │
│  ┌──────────┐ ┌────────┴───────┐ ┌───────────────────┐ │
│  │ Vehicle  │ │ x402 Middleware │ │ OSRM Route       │ │
│  │ Simulator│ │ + On-Chain     │ │ Optimizer +      │ │
│  │ (40 veh) │ │ Verifier       │ │ Route Scorer     │ │
│  └──────────┘ └────────────────┘ └───────────────────┘ │
│  ┌──────────┐ ┌────────────────┐ ┌───────────────────┐ │
│  │ IBB Data │ │ Event Stream   │ │ Demo Simulator   │ │
│  │ Client   │ │ (contract      │ │ (real on-chain   │ │
│  │ (4 APIs) │ │  events)       │ │  payments)       │ │
│  └──────────┘ └────────────────┘ └───────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│              ARC TESTNET (Chain ID: 5042002)             │
│  CityPulseX402 Contract — USDC nanopayments             │
│  0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5              │
└─────────────────────────────────────────────────────────┘
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
- Currency: USDC
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com

## x402 Payment Flow

```
1. User clicks two points on map (start → end)
2. Frontend shows: "5 vehicles on route, cost: 0.0005 USDC"
3. User clicks "Pay & Get Route"
4. MetaMask popup → contract.payForRoute(fromZone, toZone, vehicleCount)
5. Transaction confirms on Arc Testnet
6. Frontend sends POST /api/route with X-PAYMENT-TX: 0x... header
7. Backend verifies tx on-chain (receipt + event log + replay check)
8. OSRM returns real road-network route, scored with live vehicle data
9. Map shows: red dashed (normal) vs cyan glow (optimized) routes
10. Card shows: "Normal: 42 min → CityPulse: 28 min | Saved: 14 min"
```

## API Endpoints

### Public (no payment required)
| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/dashboard/stats` | System statistics |
| `GET /api/dashboard/heatmap` | Congestion heatmap data |
| `GET /api/dashboard/payments` | Recent payments (real + simulated) |
| `GET /api/dashboard/vehicles` | Vehicle positions |
| `GET /api/dashboard/contract-stats` | On-chain contract stats |
| `GET /api/ibb/traffic-index` | Real-time IBB traffic index |
| `GET /api/ibb/parking` | ISPARK parking (262 facilities) |
| `GET /api/ibb/incidents` | Traffic incidents |
| `GET /api/ibb/buses` | IETT bus positions |
| `GET /api/ibb/status` | IBB data quality status |

### x402 Protected (payment required)
| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/traffic/vehicles` | 0.001 USDC | Real-time vehicle positions |
| `GET /api/traffic/zone/:zone` | 0.0005 USDC | Zone traffic data |
| `POST /api/route` | 0.005 USDC | OSRM-optimized route |

### Demo Mode
| Endpoint | Description |
|----------|-------------|
| `POST /api/demo/start` | Start real on-chain payment simulator |
| `POST /api/demo/stop` | Stop demo mode |
| `GET /api/demo/status` | Demo mode status |

## Tech Stack

- **Contracts**: Solidity 0.8.24, Foundry (19 tests)
- **Backend**: TypeScript, Express, Socket.IO, ethers.js v6
- **Frontend**: Next.js 16, Leaflet, TailwindCSS, ethers.js v6
- **Routing**: OSRM (real road network, with grid A* fallback)
- **Data**: IBB Open Data Portal (Traffic Index, ISPARK, Incidents)
- **Chain**: Arc Testnet (USDC native gas, Chain ID: 5042002)
- **Map**: OpenStreetMap + CartoDB Dark Matter tiles

## Project Structure

```
citypulse/
├── README.md
├── contracts/              # Foundry — CityPulseX402 smart contract
│   ├── src/
│   ├── script/
│   └── test/               # 19 tests
├── backend/                # TypeScript — Express + Socket.IO server
│   └── src/
│       ├── data/           # IBB Open Data client + integration
│       ├── simulator/      # 40 vehicle simulator (9 Istanbul routes)
│       ├── x402/           # On-chain payment verification + middleware
│       ├── routes/         # API endpoints (traffic, route, dashboard, IBB, demo)
│       ├── services/       # OSRM routing, route scorer, event stream, demo simulator
│       └── websocket/      # Real-time vehicle + payment stream
└── frontend/               # Next.js — Interactive map dashboard
    └── src/
        ├── components/     # Map (Leaflet), Dashboard, RoutePanel, common
        ├── hooks/          # WebSocket, contract, payment
        ├── lib/            # Arc config, ABI, constants
        └── types/          # TypeScript interfaces
```

## License

MIT

---

Built by [@Himess__](https://x.com/Himess__) for the Arc ecosystem.
