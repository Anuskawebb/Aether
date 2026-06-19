import type { Metadata } from "next";
import { Anton, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Heavy condensed grotesque — the bold "CRYPTO"-style headlines.
const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

// Elegant high-contrast serif — the green "Off" / "HOT" accents.
const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

// Clean grotesque — body copy, labels, UI.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Toro — AI-Powered Autonomous Trading Terminal",
  description: "Toro continuously tracks smart-money activity, evaluates risk, identifies opportunities, and executes trades autonomously through AI agents.",
  keywords: ["copy trading", "AI agents", "Mantle", "DeFi", "on-chain trading", "toro", "toro agent", "non-custodial", "trading terminal", "smart money"],
  authors: [{ name: "Toro" }],
  openGraph: {
    title: "Toro — AI-Powered Autonomous Trading Terminal",
    description: "Toro continuously tracks smart-money activity, evaluates risk, identifies opportunities, and executes trades autonomously through AI agents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anton.variable} ${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
