# Circle Product Feedback — CityPulse Istanbul

## Products Used

Arc, USDC (native gas), Circle Nanopayments (@circle-fin/x402-batching), Circle Developer-Controlled Wallets (@circle-fin/developer-controlled-wallets), Circle Gateway, Circle Bridge Kit (@circle-fin/bridge-kit), circlefin/skills AI development guides, x402 protocol (@x402/fetch, @x402/core)

## Why We Chose These Products

CityPulse is a municipal traffic data marketplace — drivers pay sub-cent amounts ($0.0001–$0.0005) per API query for real-time parking availability and optimized routes. Traditional blockchain gas fees ($0.50+ on Ethereum) make this model impossible. Circle's Arc + Nanopayments infrastructure is the only stack that makes sub-cent per-query pricing economically viable.

We chose Circle over alternatives because:
- **USDC as native gas** eliminates the need for users to hold volatile ETH
- **Nanopayments** enable $0.0001 payments where gas costs would otherwise exceed the payment itself by 5,000x
- **Developer-Controlled Wallets** allow one-click wallet creation without MetaMask installation
- **Gateway** provides the deposit → gasless payment flow needed for frictionless UX
- **Bridge Kit** enables users on other testnets to bring USDC to Arc

## What Worked Well

### Arc Testnet
- **USDC-native gas is a game-changer.** Users don't need to understand gas tokens, hold ETH, or deal with gas price spikes. The UX is dramatically simpler.
- **EVM compatibility is seamless.** Our Solidity contracts (Foundry + forge), ethers.js v6 integration, and OSRM routing all worked without Arc-specific modifications.
- **Testnet faucet (faucet.circle.com)** is reliable and fast. We funded multiple test wallets without issues.
- **Sub-second finality** made our real-time demo feel instant — payments confirm before the UI animation finishes.

### Circle Nanopayments (@circle-fin/x402-batching)
- **`createGatewayMiddleware()`** is incredibly elegant — one function call to protect any Express endpoint with sub-cent pricing. We went from custom payment middleware to Circle's official SDK in under an hour.
- **Batched settlement** is the key innovation. Our demo has 36,000+ on-chain transactions, but each individual payment costs the user $0.0005 with zero gas. On Ethereum, this would cost $18,000+ in gas fees alone.
- **The seller quickstart** (`nanopayments/quickstarts/seller.md`) was the most helpful doc in the entire Circle ecosystem. Clear, actionable, worked first try.

### circlefin/skills Repository
- **`use-arc` skill** provided the correct chain configuration (Chain ID 5042002, RPC URL, USDC address 0x3600...) and dual-decimal warning (18 for native gas, 6 for ERC-20) that saved us from a critical bug.
- **`use-developer-controlled-wallets` skill** guided our entity secret registration flow correctly on the first attempt.
- **`use-gateway` skill** explained the Gateway Wallet / Gateway Minter architecture and domain IDs clearly. The contract addresses table was essential.

### Developer-Controlled Wallets
- **SDK works reliably.** `initiateDeveloperControlledWalletsClient()` → `createWalletSet()` → `createWallets()` flow is clean and predictable.
- **Entity secret auto-rotation** (fresh ciphertext per request) is handled transparently by the SDK.

### Bridge Kit
- **Arc Testnet is a supported chain** in Bridge Kit's 41-chain matrix. CCTP V2 burn-and-mint worked.
- **TypeScript types are comprehensive** — auto-complete guided us through the API without needing docs.

## What Could Be Improved

### Critical: Nanopayments CORS + Response Body Issue
**Problem:** The `createGatewayMiddleware()` returns a 402 response with payment requirements in the `PAYMENT-REQUIRED` header, but the response body is `{}` (empty JSON, 2 bytes). The `@x402/fetch` client (`wrapFetchWithPayment`) expects to read the header, but **browsers block access to custom headers unless they're listed in `Access-Control-Expose-Headers`**.

**Impact:** We spent 4+ hours debugging "Failed to parse payment requirements: Invalid payment required response" errors. The fix was adding `exposedHeaders: ["PAYMENT-REQUIRED"]` to our CORS configuration, but this is **not documented anywhere** in the Nanopayments or x402 docs.

**Recommendation:** Either:
1. Document the required CORS configuration in the seller quickstart, OR
2. Have the middleware also include payment requirements in the response body (not just the header), OR
3. Add a CORS middleware wrapper that auto-exposes the header

### Critical: No Browser/MetaMask Guide for Buyer Flow
**Problem:** The buyer quickstart (`nanopayments/quickstarts/buyer.md`) uses `GatewayClient` which requires a `privateKey` parameter. This works for server-side/agent usage but **cannot be used in a browser** because you can't ask users for their private key.

**Impact:** We had to reverse-engineer the `BatchEvmScheme` class to create a browser-compatible signer from MetaMask's viem `walletClient`. This took significant time and the resulting code uses `as any` type casts because the types don't align.

**Recommendation:** Add a "Browser Buyer" quickstart showing how to:
1. Create a `BatchEvmScheme` from a MetaMask/wallet provider
2. Register it with `x402Client` via `registerBatchScheme()`
3. Use `wrapFetchWithPayment(fetch, client)` for automatic 402 handling
4. Handle Gateway deposit from a browser wallet (not private key)

### High: ethers v6 Adapter Type Mismatch (Bridge Kit)
**Problem:** `@circle-fin/adapter-ethers-v6`'s `createAdapterFromProvider()` expects an `Eip1193Provider` but ethers v6's `BrowserProvider` doesn't satisfy this type. Required `as any` cast.

**Recommendation:** Either accept `ethers.BrowserProvider` directly or document the correct type cast in the Bridge Kit quickstart.

### High: `@circle-fin/x402-batching/client` is ESM-Only
**Problem:** Our Express backend uses CommonJS (default Node.js). Importing `@circle-fin/x402-batching/client` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. We had to migrate our entire backend to ESM (`"type": "module"` in package.json) to use the GatewayClient.

**Impact:** This is a breaking change for most Express apps which default to CJS.

**Recommendation:** Provide CJS exports alongside ESM, or clearly document the ESM requirement in the README.

### Medium: circlefin/skills Gaps
- **`use-arc` skill** doesn't mention the `eth_getLogs` 10,000 block range limit on Arc Testnet RPC. We hit rate limiting errors when loading historical contract events and had to implement chunked queries. A "Common Pitfalls" section would help.
- **`use-gateway` skill** focuses on direct contract interaction but doesn't mention `@circle-fin/x402-batching` SDK at all. Since Nanopayments is built on Gateway, cross-referencing would help developers understand the relationship.
- **No `use-nanopayments` skill exists.** Given that Nanopayments is a flagship product, a dedicated skill covering the seller middleware, buyer client, and x402 protocol flow would be extremely valuable.

### Medium: Arc Testnet RPC Stability
- `eth_getLogs` calls occasionally return `code: -32614, "eth_getLogs is limited to a 10,000 range"` even when the range is within limits. Implementing retry logic with exponential backoff resolved this, but the error message could be more specific about the actual limit being enforced.
- WebSocket RPC (`wss://rpc.testnet.arc.network`) occasionally drops connections under sustained polling (our event stream polls every 10 seconds). TCP keepalive or heartbeat documentation would help.

### Low: Developer Console UX
- Entity secret registration could have a "one-click generate + register" button in the console instead of requiring SDK code. For hackathon participants, this would reduce onboarding friction significantly.

## Recommendations for Scalability

1. **Nanopayments SDK should include a "demo mode" flag** that bypasses Gateway verification for development/testing. Currently developers must deposit real testnet USDC and go through the full Gateway flow even for local testing. A `{ demoMode: true }` option in `createGatewayMiddleware()` would accelerate development loops.

2. **Publish a `@circle-fin/x402-react` package** with React hooks (`useGatewayPayment`, `useGatewayBalance`, `useGatewayDeposit`) that handle the browser wallet → Gateway deposit → x402 payment flow. This would reduce browser integration from ~150 lines of custom code to ~10 lines.

3. **circlefin/skills should include a `use-nanopayments` skill** covering: seller Express middleware setup, buyer browser integration, Gateway deposit flow, x402 protocol concepts, and common CORS/type issues. This single skill would have saved us approximately 6 hours of debugging.

4. **Cross-chain deposit UI component** — A pre-built React component (like Stripe's Elements) that handles "deposit USDC from any chain to Gateway" with chain selection, amount input, and transaction confirmation. This is the biggest UX friction point for new users.

## Summary

Circle's infrastructure is **the only viable stack for sub-cent on-chain payments**. Arc + Nanopayments eliminates the fundamental economic barrier that prevents per-query API monetization on every other L1/L2. Our CityPulse project proves this: 36,000+ transactions at $0.0001–$0.0005 each, which would cost $18,000+ in Ethereum gas fees but costs effectively zero on Arc.

The developer experience is **good but not yet great**. The core SDKs work reliably, but browser integration, CORS configuration, and ESM/CJS compatibility gaps create unnecessary friction. The `circlefin/skills` repository is a strong foundation — adding a `use-nanopayments` skill and browser-specific guides would make Circle's stack significantly more accessible for hackathon participants and production developers alike.

**Team:** CityPulse Istanbul
**Track:** Per-API Monetization Engine
**Products Used:** Arc, USDC, Circle Nanopayments, Circle Wallets, Circle Gateway, Bridge Kit, circlefin/skills
