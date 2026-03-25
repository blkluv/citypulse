# CityPulse - Municipal Traffic x402 Nanopayments on Arc

> **Municipal vehicles are already everywhere. Their data is going to waste. x402 nanopayments unlock this data for anyone who needs it. The municipality earns revenue. Drivers save time. The city gets smarter. Everyone wins.**

**Live Demo**: [Dashboard](https://citypulse-istanbul.vercel.app) | [Drive](https://citypulse-istanbul.vercel.app/drive) | [Backend API](https://citypulse-backend-production.up.railway.app/api/health)

CityPulse is a full-stack application showing how municipalities can monetize fleet vehicle telemetry data through x402 nanopayments on [Arc](https://arc.fun). Drivers pay sub-cent USDC amounts to get real-time, ground-truth traffic data from municipal vehicles (buses, garbage trucks, service cars) and receive optimized routes that avoid congestion.

## Why CityPulse?

Today's traffic routing (Google Maps, Yandex) relies on satellite data with 5-15 minute delays. But municipal vehicles — buses, garbage trucks, ambulances, service cars — are already on every road, every hour. That's thousands of real-time speed sensors going to waste.

CityPulse puts an x402 paywall on that data. Drivers pay 0.0001 USDC per vehicle data point (a fraction of a cent) and get routes based on ground truth, not stale estimates.

### The Flywheel Effect

CityPulse doesn't just sell traffic data — it actively reduces congestion:

```
More drivers use CityPulse
        ↓
Traffic distributes evenly across the road network
        ↓
Municipal buses run faster → better service, lower fuel costs
Ambulances arrive sooner → lives saved
Garbage trucks finish routes on time → cleaner city
        ↓
Vehicles produce better data (faster movement = more coverage)
        ↓
CityPulse routes become more accurate
        ↓
More drivers use CityPulse  ← (cycle repeats)
```

The municipality wins three times: **direct revenue** from data sales, **operational savings** from faster fleet movement, and **citizen satisfaction** from better public services.

## Complementary to Tesla x402

Inspired by [@corey__cooper](https://x.com/corey__cooper)'s Tesla Fleet Telemetry x402 build. CityPulse extends the same x402 pattern from individual vehicles to municipal fleets:

| | Tesla x402 (Corey) | CityPulse (Himess) |
|---|---|---|
| Data source | Individual Tesla | Municipal fleet (buses, trucks) |
| Data type | Single vehicle telemetry | City-wide traffic flow |
| Payment model | Per-vehicle data access | Per-route optimization query |
| Use case | Vehicle monitoring | Real-time traffic avoidance |
| Long-term value | Vehicle analytics | Urban planning intelligence |

**Together**: Individual cars + municipal fleet = complete urban mobility data layer. Same x402 protocol. Same USDC payment rails on Arc. Fully interoperable.

## Live Data Sources

CityPulse integrates real Istanbul data alongside simulated vehicles:

| Source | Type | Status | Details |
|---|---|---|---|
| **IBB Traffic Index** | Real congestion data | Live | 25 zones, real-time congestion levels |
| **ISPARK Parking** | Real parking occupancy | Live | 262 parking lots, live availability |
| **Traffic Incidents** | Real incident reports | Live | 50+ GPS-located events |
| **OSRM Routing** | Real road network | Active | OpenStreetMap Istanbul, 347+ waypoint routes |
| **Arc Contract** | On-chain payments | Listening | Real x402 verification with replay protection |
| **Vehicle Simulator** | Simulated fleet | Simulated | 40 vehicles (buses, garbage trucks, ambulances, police) |
| **IETT Bus Positions** | Real bus GPS | Pending | Requires SOAP authentication (graceful fallback active) |

The dashboard marks each data point with its source: **LIVE** badge for real IBB/on-chain data, **SIM** badge for simulated vehicles. Every on-chain payment links directly to [ArcScan](https://testnet.arcscan.app).

## On-Chain Verification

Every payment is cryptographically verified on Arc Testnet before serving data:

- **Receipt validation** — `receipt.status === 1` and `receipt.to === CONTRACT_ADDRESS`
- **Event log parsing** — `QueryPaid` event with driver, amount, zones, vehicle count
- **Amount check** — payment >= `queryPrice * vehiclesQueried`
- **Replay protection** — each tx hash can only be used once

Contract: [`0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5`](https://testnet.arcscan.app/address/0xe551CbbF162e7d3A1fDF4ba994aC01c02176b9a5) on Arc Testnet (Chain ID: 5042002)

## Architecture

```
┌──────────────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│    Frontend              │     │    Backend               │     │   Arc Testnet    │
│    Next.js + Leaflet     │◄───►│    Express + Socket.IO   │◄───►│   (EVM)         │
│                          │     │                          │     │                 │
│  • Live map (40 vehicles)│ WS  │  • Vehicle simulator     │     │  CityPulseX402  │
│  • Route request + pay   │ REST│  • x402 middleware       │ RPC │  • payForRoute() │
│  • Dashboard (stats)     │     │  • OSRM route optimizer  │     │  • getStats()   │
│  • Payment feed          │     │  • IBB data client       │     │  • QueryPaid    │
│  • Demo mode toggle      │     │  • WebSocket stream      │     │    events       │
└──────────────────────────┘     └──────────────────────────┘     └─────────────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  External APIs   │
                                 │  • IBB Open Data │
                                 │  • OSRM Routing  │
                                 │  • ISPARK        │
                                 └─────────────────┘
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
- **Network Name**: Arc Testnet
- **RPC URL**: `https://rpc.testnet.arc.network`
- **Chain ID**: `5042002`
- **Currency**: USDC
- **Explorer**: https://testnet.arcscan.app
- **Faucet**: https://faucet.circle.com

## How It Works

1. **40 municipal vehicles** move through Istanbul streets in real-time
2. **Real IBB traffic data** feeds zone congestion levels and incident reports
3. **Connect your wallet** and click two points on the map
4. **Pay a sub-cent x402 nanopayment** — 0.0001 USDC per vehicle data point
5. **OSRM calculates routes** on real Istanbul road network (347+ waypoints)
6. **CityPulse re-scores routes** using live vehicle speeds and IBB congestion data
7. **See the comparison**: Normal route vs CityPulse route with time saved
8. **Every payment verified on-chain** — click the tx hash to see it on ArcScan

## x402 Payment Flow

On Arc, USDC is the native gas token. No ERC-20 approve/transfer needed — `msg.value` is USDC directly. This makes sub-cent payments actually sub-cent.

```
 1. User clicks start + end points on map
 2. Frontend calculates: "5 vehicles on route → cost: 0.0005 USDC"
 3. User clicks "Pay & Get Route"
 4. MetaMask → contract.payForRoute(fromZone, toZone, vehicleCount, { value: cost })
 5. Transaction confirms on Arc Testnet (USDC native)
 6. Frontend sends route request with X-PAYMENT-TX: 0x... header
 7. Backend verifies on-chain:
    ├── receipt.status === 1 (tx succeeded)
    ├── receipt.to === CONTRACT_ADDRESS (correct contract)
    ├── QueryPaid event parsed (amount, zones, vehicles)
    ├── payment amount >= required (no underpayment)
    └── tx hash not reused (replay protection)
 8. Verified → optimized route served
 9. Map renders: normal route (red dashed) vs CityPulse route (cyan glow)
10. Card shows: "Normal: 42 min → CityPulse: 28 min | Saved: 14 min | Cost: 0.0005 USDC"
```

## Demo Mode

Click **"Start Demo"** in the top-right corner to activate demo mode. This creates **real on-chain transactions** on Arc Testnet every 10-15 seconds, simulating multiple drivers requesting routes simultaneously.

Demo mode is not fake — every payment is a real, verifiable transaction on Arc Testnet with a valid ArcScan link. The dashboard comes alive: revenue ticks up, the payment feed scrolls, and zone rankings update based on actual query patterns.

## API Endpoints

### Public (no payment required)
| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard/stats` | System statistics |
| `GET /api/dashboard/contract-stats` | On-chain contract stats (verified) |
| `GET /api/dashboard/payments` | Recent payments (real + simulated) |
| `GET /api/ibb/traffic-index` | Real-time IBB traffic index |
| `GET /api/ibb/parking` | ISPARK parking (262 facilities) |
| `GET /api/ibb/incidents` | Traffic incidents |

### x402 Protected
| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/traffic/vehicles` | 0.001 USDC | Real-time vehicle positions |
| `GET /api/traffic/zone/:zone` | 0.0005 USDC | Zone traffic data |
| `POST /api/route` | 0.005 USDC | OSRM-optimized route |

### Demo
| Endpoint | Description |
|----------|-------------|
| `POST /api/demo/start` | Start real on-chain payment simulator |
| `POST /api/demo/stop` | Stop demo mode |

## Long-Term Vision

All on-chain query data becomes a goldmine for urban planning:

- **Pattern detection**: Which intersections are congested every Tuesday at 5 PM?
- **Infrastructure investment**: Where should the next bypass road go?
- **Signal optimization**: Which traffic lights need re-timing?
- **Demand mapping**: Where do commuters spend the most to avoid traffic?

Data-driven city planning, funded by the citizens who benefit from it. A circular economy where the data consumers (drivers) fund the infrastructure improvements that serve them.

## Tech Stack

- **Contracts**: Solidity 0.8.24, Foundry (19 tests)
- **Backend**: TypeScript, Express, Socket.IO, ethers.js v6
- **Frontend**: Next.js 16, Leaflet, TailwindCSS, ethers.js v6
- **Chain**: Arc Testnet (EVM, USDC native gas, Chain ID: 5042002)
- **Routing**: OSRM (OpenStreetMap real road network, grid A* fallback)
- **Data**: IBB Open Data Portal (traffic index, parking, incidents)
- **Map**: OpenStreetMap + CartoDB Dark Matter tiles

## Project Structure

```
citypulse/
├── README.md
├── contracts/           # Foundry — CityPulseX402 smart contract
│   ├── src/
│   ├── script/
│   └── test/            # 19 tests
├── backend/             # TypeScript — Express + Socket.IO server
│   └── src/
│       ├── data/        # IBB Open Data client (traffic, parking, incidents)
│       ├── simulator/   # 40 vehicle simulator (9 Istanbul routes)
│       ├── x402/        # On-chain payment verification + middleware
│       ├── routes/      # API endpoints (traffic, route, dashboard, IBB, demo)
│       ├── services/    # OSRM routing, route scorer, event stream, demo simulator
│       └── websocket/   # Real-time vehicle + payment stream
└── frontend/            # Next.js — Interactive map dashboard
    └── src/
        ├── components/  # Map, Dashboard, RoutePanel, DemoMode
        ├── hooks/       # WebSocket, contract, payment
        └── lib/         # Config, ABI, Arc chain config
```

## License

MIT

---

Built by [@Himess__](https://x.com/Himess__) for the Arc ecosystem.
