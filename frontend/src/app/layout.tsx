import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { ModeProvider } from "@/context/ModeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "T-BillFlow 2.0 — RWA-Aware Agent Execution Layer",
  description:
    "Arbitrum-native RWA-aware execution layer for tokenized US Treasury yield. Authorization ≠ Eligibility.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Web3Provider>
          <ModeProvider>
            {children}
          </ModeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
