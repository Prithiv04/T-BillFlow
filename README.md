# T-BillFlow Frontend

An institutional-grade DeFi frontend application built for the BNB Chain to provide users with tokenized Treasury Bill (T-Bill) yields through stablecoin staking (tBUSD).

## 🌟 Overview

T-BillFlow is a decentralized finance platform designed to bridge traditional finance yields with on-chain liquidity. Users can deposit stablecoins to receive yield-bearing tokens representing fractional ownership in US Treasury Bills or similar real-world assets (RWAs). 

This repository contains the frontend application, offering a seamless, responsive, and secure user interface to interact with the T-BillFlow smart contracts.

## 🚀 Tech Stack

The application leverages a modern, high-performance web development stack:

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: 
  - [Radix UI](https://www.radix-ui.com/) (Primitives)
  - [Base UI](https://mui.com/base-ui/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Web3 Integration**: 
  - [Wagmi v2](https://wagmi.sh/) (React Hooks for Ethereum)
  - [RainbowKit v2](https://www.rainbowkit.com/) (Wallet Connection)
  - [Viem](https://viem.sh/) (Typescript Interface for Ethereum)

## 📁 Project Structure

```text
src/
├── app/                  # Next.js App Router pages
│   ├── dashboard/        # Platform analytics and TVL metrics
│   ├── deposit/          # Deposit and withdraw interface
│   ├── faq/              # Frequently Asked Questions
│   ├── portfolio/        # User-specific holdings and yield tracking
│   ├── layout.tsx        # Root layout with providers
│   └── page.tsx          # Landing page
├── components/           # Reusable React components
│   ├── ui/               # Base UI components (Buttons, Cards, Dialogs)
│   ├── Navbar.tsx        # Main navigation header
│   ├── NumberTicker.tsx  # Animated number counter
│   └── Web3Provider.tsx  # Wagmi & RainbowKit provider wrapper
└── lib/                  # Utilities and configuration
    ├── constants.ts      # Smart contract addresses and global constants
    ├── utils.ts          # Tailwind merge and utility functions
    └── wagmi-config.ts   # Blockchain connection configuration (BSC)
```

## 🔗 Smart Contract Integration

The application is configured to interact with the BNB Smart Chain (BSC). Core parameters are defined in `src/lib/constants.ts`:

- **Network**: BNB Smart Chain (BSC)
- **Target APY**: ~5.0%
- **Current Share Rate**: 1.05 (1 Share = 1.05 tBUSD)

*Note: Smart contract addresses currently use placeholders and should be updated before mainnet deployment.*

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- Web3 Wallet (e.g., MetaMask, Trust Wallet, Rabby)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## 🎨 Design System

The application features a dark-themed, institutional-grade design with gold accents (`#F0B90B` - BNB color). The UI makes extensive use of glassmorphism (`backdrop-blur`), subtle gradients (`gradient-gold`), and micro-animations to provide a premium user experience.

## 📜 Available Scripts

- `npm run dev` - Starts the development server
- `npm run build` - Creates an optimized production build
- `npm run start` - Starts the production server
- `npm run lint` - Runs ESLint to check for code quality issues
