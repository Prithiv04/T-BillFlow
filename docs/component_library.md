# Component Library

T-BillFlow employs a robust component library architecture designed to unify styling, enhance accessibility, and accelerate the development of complex Web3 user interfaces.

## Philosophy

The UI methodology prioritizes creating agnostic, strictly typed, composable small components over monolithic, single-purpose constructs. This ensures maximum reusability across differing pages (e.g., standardizing the look of a button whether it's an 'Approve Token', 'Submit Transaction', or 'Connect Wallet' action).

The current stack effectively integrates:
1. **Radix UI Primitives**: For unstyled, functional accessibility (handling keyboard navigation, ARIA states, and focus locking).
2. **Tailwind CSS**: For design token implementation (colors, spacing, and typography) mapped onto these primitives.
3. **Class Variance Authority (`cva`)**: For declaring variations strictly through a TypeScript API, making variant prop types automatically inferable.

## Key Primitives in `src/components`

1. **`Navbar.tsx`**
   - **Role**: Top-level sticky navigation, rendering the core branding, route navigation items, and the primary `ConnectButton`.
   - **Design**: Implements intensive backdrop-blur for a "glassmorphism" effect that sits elegantly over dynamic backgrounds. Incorporates mobile responsiveness using Tailwind's layout breakpoints (`md:flex`, `hidden`).

2. **`NumberTicker.tsx`**
   - **Role**: Highly visual, animated numeric counter typically representing TVL or aggregated yield.
   - **Integration**: Leverages `framer-motion` alongside `react`'s `useEffect` or interval-based state changes to roll digits vertically imitating a physical counter or odometer.
   - **Performance**: Carefully constructed to avoid forcing huge DOM repaints.

3. **`Web3Provider.tsx`**
   - **Role**: Global context root for the Web3 connections.
   - **Under the hood**: Bootstraps the `WagmiConfig`, `@tanstack/react-query`'s `QueryClient`, and RainbowKit's `RainbowKitProvider`. It must encapsulate the root layout to allow deeply nested components (like a wallet button deep inside a dialog) access to the address state.

## Core `ui` Folder Structure

The `components/ui` directory typically holds the elemental atoms:

- **`Button`**: Accommodates multiple variants (default, destructive, outline, ghost, link, gold). Utilizes `cva` to toggle classes. Handles pending/loading states natively (showing spinners replacing content when `isLoading` is active).
- **`Card`**: Used heavily in the Dashboard and Portfolio pages. Typically divided into `CardHeader`, `CardTitle`, `CardContent`, and `CardFooter` to allow flexible recomposition.
- **`Input`**: Standardized text input handling focus rings and disabled states seamlessly.
- **`Dialog` & `Accordion`**: Usually wrappers around Radix UI primitives ensuring semantic structural consistency.

## Web3-Specific Components

In future iterations, it is recommended to expand logic-heavy UI components:
- **`TransactionButton`**: A specialized abstraction that automatically checks if a user is connected, if the user is on the right network (BSC), and eventually handles approval flows before execution.
- **`TokenInput`**: An input component built specifically for `uint256` token amounts, capable of mapping string values into precise `BigInt` formats required by Viem/Wagmi, and displaying a "Max" button tied to user balance hooks.
