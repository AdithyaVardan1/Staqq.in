import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://staqq.in';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Staqq | Indian IPOs, Stock Screeners & Solana Token Alerts",
    template: "%s | Staqq"
  },
  description: "Two products, one platform. Real-time IPO GMP, FII/DII flows, NSE insider trades and stock screeners for Indian equities -- plus live Solana token alerts with 5-layer rug scoring delivered to Telegram.",
  keywords: [
    "IPO GMP today", "IPO allotment probability", "FII DII data", "NSE insider trades",
    "Indian stock market signals", "BSE IPO subscription", "IPO grey market premium",
    "stock screener India", "crypto prices INR", "Nifty 50 analysis"
  ],
  authors: [{ name: "Staqq", url: BASE_URL }],
  creator: "Staqq",
  publisher: "Staqq",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Staqq',
    title: "Staqq | Indian IPOs, Stock Screeners & Solana Token Alerts",
    description: "Real-time IPO GMP, FII/DII flows, NSE insider trades for Indian equities -- plus live Solana token alerts with rug scoring, delivered to Telegram.",
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Staqq - Indian Stock Market & Crypto Intelligence Dashboard',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Staqq | Indian IPOs, Stock Screeners & Solana Token Alerts",
    description: "Real-time IPO GMP, FII/DII flows, NSE insider trades for Indian equities -- plus live Solana token alerts with rug scoring, delivered to Telegram.",
    images: ['/api/og'],
    creator: '@staqq',
  },
  icons: {
    icon: '/zoomed-icon.png?v=3',
    apple: '/apple-touch-icon.png?v=3',
  },
};

// Root JSON-LD: Organization + WebSite with SearchAction
// These are site-wide signals -- defined once here, not per-page.
const rootJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    "name": "Staqq",
    "url": BASE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": `${BASE_URL}/logo.jpeg`,
      "width": 512,
      "height": 512,
    },
    "description": "Market intelligence platform with two products: Indian equity intelligence (IPO GMP, FII/DII flows, NSE insider trades, stock screeners) and Solana token alerts (Telegram bot with 5-layer rug scoring, real-time alerts within 60s of pair creation).",
    "foundingDate": "2024",
    "areaServed": ["IN", "Worldwide"],
    "sameAs": [
      "https://twitter.com/staqq",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    "url": BASE_URL,
    "name": "Staqq",
    "publisher": { "@id": `${BASE_URL}/#organization` },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${BASE_URL}/stocks/screener?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
];

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable}`}>
        <Navbar />
        {children}
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
