# Frontend Architecture

This document provides a deep dive into the frontend architecture, focusing on the Next.js App Router setup, global state management, and the implementation details of the core components and pages within T-BillFlow.

## Directory Structure Strategy

The frontend embraces the Next.js 16 App Router principles, creating a distinct separation between routing logic, reusable components, and core utilities.

- **`app/`**: Contains the file-based routing mechanism. Each folder inside represents a route segment.
  - `page.tsx` within a folder acts as the UI for that specific route.
  - `layout.tsx` files preserve state across navigations, remain interactive, and avoid expensive re-renders.
- **`components/`**: Hosts framework-agnostic or domain-specific reusable React UI components. This folder houses both standalone components like `Navbar`, `NumberTicker` and composite base components under `components/ui`.
- **`lib/`**: Keeps utility functions, configurations, and shared constraints (like smart contract constants and styling merger tools).

## Core Pages

### 1. Landing Page (`/`)
The primary entry point of the app. It's designed to showcase real-time TVL (Total Value Locked), current APY, and general protocol benefits to drive conversions.
- **Key Features**: 
  - Dynamic `NumberTicker` showing live or estimated statistics.
  - High-conversion call-to-action (CTA) buttons linking to the Deposit page.
  - Animated, responsive heroic sections highlighting the value proposition of T-Bill tokenization.

### 2. Dashboard (`/dashboard`)
Provides an aggregate view of network-wide statistics and protocol health.
- **Key Features**:
  - Global TVL metrics.
  - Historical APY charts (often implemented via Recharts).
  - Protocol revenue and total T-Bills tokenized metrics.

### 3. Deposit & Actions (`/deposit`)
The primary interface for users to interact with the smart contracts. This is the transactional heart of the UI.
- **Key Features**:
  - Stablecoin deposit mechanisms.
  - Withdrawal interface subject to protocol unlocking constraints.
  - Transaction breakdown including expected yields and network fees.
- **Integration**: Heavily utilizes `wagmi` hooks to read user balances and estimate gas before execution.

### 4. Portfolio (`/portfolio`)
A personalized dashboard reflecting the connected user's specific state.
- **Key Features**:
  - User's current deposit balance (mapped via `useReadContract`).
  - Expected accrued yield and history.
  - Connected wallet tracking.

## Global State & Web3 Providers (`Web3Provider.tsx`)

State management relies heavily on external specialized providers rather than a monolithic Redux or Context store. The complexity of blockchain reads/writes is delegated to `wagmi` and `@tanstack/react-query`.

1. **RainbowKitProvider**: Injected as a wrapper to provide a highly polished, standardized wallet connector. It dictates the look and feel of the connection modal.
2. **WagmiProvider**: Responsible for holding the chain configuration, connections to RPCs, and state synchronization for blockchain data.
3. **QueryClientProvider**: Caches RPC payloads efficiently. If the user navigates between Portfolio and Dashboard, the data doesn't abruptly re-fetch if it's within the stale time constraint.

## Styling Methodology

The component library uses a composite approach:
- **Tailwind CSS v4**: Utility-first definitions for rapid layouts. Tailwind configuration relies heavily on the `postcss` and native `@tailwindcss/postcss` plugin structures.
- **Class Variance Authority (CVA)**: For organizing sophisticated, multi-variant components (like buttons that need to support multiple states: hover, disabled, solid, outline).
- **`cn` utility (`lib/utils.ts`)**: A crucial helper constructed from `clsx` and `tailwind-merge` allowing dynamic class strings to be built conditionally without fear of clashing CSS utility rules.

## Blockchain Readings (Smart Contracts)

Interactions with BNB Smart Chain are highly decoupled:
1. Addresses and configuration live statically in `src/lib/constants.ts`.
2. Reads are accomplished passively via `useReadContract`.
3. Mutations (writes) are typically encapsulated by stateful functions invoking `useWriteContract` and simulating state with `useSimulateContract` before submission, offering robust error handling if a transaction fails the simulation phase.
