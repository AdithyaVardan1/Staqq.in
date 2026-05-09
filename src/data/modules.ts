export interface Chapter {
    slug: string;
    title: string;
}

export interface Module {
    id: number;
    slug: string;
    title: string;
    path: string;
    description?: string;
    chapters: Chapter[];
}

export const modules: Module[] = [
    // ==========================================
    // PATH 1: ABSOLUTE BEGINNER (5 modules, 15 chapters)
    // ==========================================
    {
        id: 1,
        slug: "introduction-to-stock-markets",
        title: "Introduction to Stock Markets",
        path: "beginner",
        description: "Learn about market participants and regulators.",
        chapters: [
            { slug: "01-need-to-invest", title: "Need to Invest" },
            { slug: "02-regulators", title: "Regulators" },
            { slug: "03-market-intermediaries", title: "Market Intermediaries" },
        ],
    },
    {
        id: 2,
        slug: "what-is-a-stock",
        title: "What is a Stock?",
        path: "beginner",
        description: "Understand stocks, companies, and how markets work.",
        chapters: [
            { slug: "companies-and-shares", title: "Companies and Shares" },
            { slug: "stock-exchanges", title: "Stock Exchanges" },
            { slug: "how-stock-prices-move", title: "How Stock Prices Move" },
        ],
    },
    {
        id: 3,
        slug: "how-to-start-investing",
        title: "How to Start Investing",
        path: "beginner",
        description: "Open accounts and place your first trade.",
        chapters: [
            { slug: "demat-account-basics", title: "Demat Account Basics" },
            { slug: "choosing-a-broker", title: "Choosing a Broker" },
            { slug: "placing-your-first-order", title: "Placing Your First Order" },
        ],
    },
    {
        id: 4,
        slug: "reading-stock-prices",
        title: "Reading Stock Prices",
        path: "beginner",
        description: "Understand quotes, volume, and market depth.",
        chapters: [
            { slug: "understanding-quotes", title: "Understanding Quotes" },
            { slug: "volume-and-liquidity", title: "Volume and Liquidity" },
            { slug: "market-depth", title: "Market Depth" },
        ],
    },
    {
        id: 5,
        slug: "your-first-investment",
        title: "Your First Investment",
        path: "beginner",
        description: "Build a watchlist and track your investments.",
        chapters: [
            { slug: "building-a-watchlist", title: "Building a Watchlist" },
            { slug: "making-the-purchase", title: "Making the Purchase" },
            { slug: "tracking-performance", title: "Tracking Performance" },
        ],
    },

    // ==========================================
    // PATH 2: UNDERSTANDING FINANCIALS (4 modules, 16 chapters)
    // ==========================================
    {
        id: 6,
        slug: "balance-sheet-basics",
        title: "Balance Sheet Basics",
        path: "financials",
        description: "Learn to read assets, liabilities, and equity.",
        chapters: [
            { slug: "assets-explained", title: "Assets Explained" },
            { slug: "liabilities-explained", title: "Liabilities Explained" },
            { slug: "shareholders-equity", title: "Shareholders Equity" },
            { slug: "reading-a-balance-sheet", title: "Reading a Balance Sheet" },
        ],
    },
    {
        id: 7,
        slug: "pl-statement",
        title: "P&L Statement",
        path: "financials",
        description: "Understand revenue, expenses, and profitability.",
        chapters: [
            { slug: "revenue-and-sales", title: "Revenue and Sales" },
            { slug: "operating-expenses", title: "Operating Expenses" },
            { slug: "net-profit", title: "Net Profit" },
            { slug: "margins-analysis", title: "Margins Analysis" },
        ],
    },
    {
        id: 8,
        slug: "cash-flow",
        title: "Cash Flow",
        path: "financials",
        description: "Understand where the money comes from and goes.",
        chapters: [
            { slug: "operating-cash-flow", title: "Operating Cash Flow" },
            { slug: "free-cash-flow", title: "Free Cash Flow" },
            { slug: "cash-vs-profit", title: "Cash vs Profit" },
            { slug: "red-flags", title: "Red Flags" },
        ],
    },
    {
        id: 9,
        slug: "key-ratios",
        title: "Key Ratios",
        path: "financials",
        description: "Master the essential financial ratios.",
        chapters: [
            { slug: "pe-ratio", title: "PE Ratio" },
            { slug: "pb-ratio", title: "PB Ratio" },
            { slug: "roe-and-roce", title: "ROE and ROCE" },
            { slug: "debt-ratios", title: "Debt Ratios" },
        ],
    },

    // ==========================================
    // PATH 3: TECHNICAL ANALYSIS (5 modules, 20 chapters)
    // ==========================================
    {
        id: 10,
        slug: "chart-basics",
        title: "Chart Basics",
        path: "technical",
        description: "Learn to read and understand price charts.",
        chapters: [
            { slug: "types-of-charts", title: "Types of Charts" },
            { slug: "candlestick-basics", title: "Candlestick Basics" },
            { slug: "timeframes", title: "Timeframes" },
            { slug: "reading-price-action", title: "Reading Price Action" },
        ],
    },
    {
        id: 11,
        slug: "support-and-resistance",
        title: "Support and Resistance",
        path: "technical",
        description: "Identify key price levels and zones.",
        chapters: [
            { slug: "identifying-levels", title: "Identifying Levels" },
            { slug: "horizontal-lines", title: "Horizontal Lines" },
            { slug: "trendlines", title: "Trendlines" },
            { slug: "breakouts-breakdowns", title: "Breakouts and Breakdowns" },
        ],
    },
    {
        id: 12,
        slug: "patterns",
        title: "Chart Patterns",
        path: "technical",
        description: "Recognize common chart patterns.",
        chapters: [
            { slug: "reversal-patterns", title: "Reversal Patterns" },
            { slug: "continuation-patterns", title: "Continuation Patterns" },
            { slug: "candlestick-patterns", title: "Candlestick Patterns" },
            { slug: "pattern-reliability", title: "Pattern Reliability" },
        ],
    },
    {
        id: 13,
        slug: "indicators",
        title: "Technical Indicators",
        path: "technical",
        description: "Use technical indicators to confirm signals.",
        chapters: [
            { slug: "moving-averages", title: "Moving Averages" },
            { slug: "rsi", title: "RSI" },
            { slug: "macd", title: "MACD" },
            { slug: "volume-indicators", title: "Volume Indicators" },
        ],
    },
    {
        id: 14,
        slug: "trading-strategies",
        title: "Trading Strategies",
        path: "technical",
        description: "Apply technical analysis to real trades.",
        chapters: [
            { slug: "trend-following", title: "Trend Following" },
            { slug: "swing-trading", title: "Swing Trading" },
            { slug: "entry-and-exit", title: "Entry and Exit" },
            { slug: "risk-reward", title: "Risk Reward" },
        ],
    },

    // ==========================================
    // PATH 4: IPO INVESTING (4 modules, 16 chapters)
    // ==========================================
    {
        id: 15,
        slug: "how-ipos-work",
        title: "How IPOs Work",
        path: "ipo",
        description: "Understand the IPO process from start to listing.",
        chapters: [
            { slug: "what-is-an-ipo", title: "What is an IPO" },
            { slug: "ipo-process", title: "IPO Process" },
            { slug: "types-of-ipos", title: "Types of IPOs" },
            { slug: "applying-for-ipos", title: "Applying for IPOs" },
        ],
    },
    {
        id: 16,
        slug: "reading-the-rhp",
        title: "Reading the RHP",
        path: "ipo",
        description: "Learn to analyze the Red Herring Prospectus.",
        chapters: [
            { slug: "rhp-overview", title: "RHP Overview" },
            { slug: "financial-statements", title: "Financial Statements" },
            { slug: "risk-factors", title: "Risk Factors" },
            { slug: "objects-of-issue", title: "Objects of Issue" },
        ],
    },
    {
        id: 17,
        slug: "ipo-analysis",
        title: "IPO Analysis",
        path: "ipo",
        description: "Evaluate IPOs before investing.",
        chapters: [
            { slug: "valuation-metrics", title: "Valuation Metrics" },
            { slug: "industry-assessment", title: "Industry Assessment" },
            { slug: "subscription-data", title: "Subscription Data" },
            { slug: "checklist", title: "Checklist" },
        ],
    },
    {
        id: 18,
        slug: "trading-ipos",
        title: "Trading IPOs",
        path: "ipo",
        description: "Strategies for IPO listing day and beyond.",
        chapters: [
            { slug: "listing-day", title: "Listing Day" },
            { slug: "exit-strategies", title: "Exit Strategies" },
            { slug: "common-mistakes", title: "Common Mistakes" },
            { slug: "case-studies", title: "Case Studies" },
        ],
    },

    // ==========================================
    // PATH 5: FUNDAMENTAL ANALYSIS (4 modules, 16 chapters)
    // ==========================================
    {
        id: 19,
        slug: "company-analysis",
        title: "Company Analysis",
        path: "fundamental",
        description: "Analyze businesses from the ground up.",
        chapters: [
            { slug: "business-model", title: "Business Model" },
            { slug: "competitive-advantage", title: "Competitive Advantage" },
            { slug: "management-analysis", title: "Management Analysis" },
            { slug: "growth-analysis", title: "Growth Analysis" },
        ],
    },
    {
        id: 20,
        slug: "valuation-methods",
        title: "Valuation Methods",
        path: "fundamental",
        description: "Learn to value companies properly.",
        chapters: [
            { slug: "intrinsic-value", title: "Intrinsic Value" },
            { slug: "dcf-model", title: "DCF Model" },
            { slug: "relative-valuation", title: "Relative Valuation" },
            { slug: "margin-of-safety", title: "Margin of Safety" },
        ],
    },
    {
        id: 21,
        slug: "research-process",
        title: "Research Process",
        path: "fundamental",
        description: "Build a systematic research framework.",
        chapters: [
            { slug: "information-sources", title: "Information Sources" },
            { slug: "annual-report-analysis", title: "Annual Report Analysis" },
            { slug: "screening-stocks", title: "Screening Stocks" },
            { slug: "research-framework", title: "Research Framework" },
        ],
    },
    {
        id: 22,
        slug: "investment-decisions",
        title: "Investment Decisions",
        path: "fundamental",
        description: "Make better investment decisions.",
        chapters: [
            { slug: "position-sizing", title: "Position Sizing" },
            { slug: "buying-discipline", title: "Buying Discipline" },
            { slug: "when-to-sell", title: "When to Sell" },
            { slug: "investor-psychology", title: "Investor Psychology" },
        ],
    },

    // ==========================================
    // PATH 6: CRYPTO 101 (3 modules, 9 chapters)
    // ==========================================
    {
        id: 23,
        slug: "what-is-cryptocurrency",
        title: "What is Cryptocurrency?",
        path: "crypto-101",
        description: "Understand Bitcoin, blockchain, and the crypto ecosystem.",
        chapters: [
            { slug: "what-is-bitcoin", title: "What is Bitcoin" },
            { slug: "how-blockchain-works", title: "How Blockchain Works" },
            { slug: "types-of-crypto", title: "Types of Cryptocurrency" },
        ],
    },
    {
        id: 24,
        slug: "crypto-wallets-security",
        title: "Wallets & Security",
        path: "crypto-101",
        description: "Store your crypto safely and avoid common traps.",
        chapters: [
            { slug: "hot-vs-cold-wallets", title: "Hot vs Cold Wallets" },
            { slug: "private-keys-seed-phrases", title: "Private Keys & Seed Phrases" },
            { slug: "staying-safe-online", title: "Staying Safe Online" },
        ],
    },
    {
        id: 25,
        slug: "buying-your-first-crypto",
        title: "Buying Your First Crypto",
        path: "crypto-101",
        description: "Get on an exchange and make your first purchase.",
        chapters: [
            { slug: "choosing-an-exchange", title: "Choosing an Exchange" },
            { slug: "kyc-and-verification", title: "KYC & Verification" },
            { slug: "making-your-first-purchase", title: "Making Your First Purchase" },
        ],
    },

    // ==========================================
    // PATH 7: BLOCKCHAIN & WEB3 (3 modules, 9 chapters)
    // ==========================================
    {
        id: 26,
        slug: "blockchain-fundamentals",
        title: "Blockchain Fundamentals",
        path: "blockchain",
        description: "Consensus, Layer 1 vs Layer 2, and how networks differ.",
        chapters: [
            { slug: "consensus-mechanisms", title: "Consensus Mechanisms" },
            { slug: "proof-of-work-vs-stake", title: "Proof of Work vs Stake" },
            { slug: "layer1-vs-layer2", title: "Layer 1 vs Layer 2" },
        ],
    },
    {
        id: 27,
        slug: "smart-contracts-dapps",
        title: "Smart Contracts & dApps",
        path: "blockchain",
        description: "Self-executing code, decentralised apps, and DAOs.",
        chapters: [
            { slug: "what-are-smart-contracts", title: "What are Smart Contracts" },
            { slug: "decentralized-applications", title: "Decentralized Applications" },
            { slug: "daos-and-governance", title: "DAOs & Governance" },
        ],
    },
    {
        id: 28,
        slug: "nfts-and-digital-assets",
        title: "NFTs & Digital Assets",
        path: "blockchain",
        description: "Non-fungible tokens, use cases, and the NFT market.",
        chapters: [
            { slug: "what-are-nfts", title: "What are NFTs" },
            { slug: "nft-standards", title: "NFT Standards (ERC-721, ERC-1155)" },
            { slug: "nft-use-cases", title: "NFT Use Cases" },
        ],
    },

    // ==========================================
    // PATH 8: DEFI DECODED (3 modules, 9 chapters)
    // ==========================================
    {
        id: 29,
        slug: "defi-basics",
        title: "DeFi Basics",
        path: "defi",
        description: "What DeFi is, DEXes, and how AMMs work.",
        chapters: [
            { slug: "what-is-defi", title: "What is DeFi" },
            { slug: "decentralized-exchanges", title: "Decentralized Exchanges" },
            { slug: "automated-market-makers", title: "Automated Market Makers" },
        ],
    },
    {
        id: 30,
        slug: "lending-and-borrowing",
        title: "Lending & Borrowing",
        path: "defi",
        description: "Earn yield on assets and borrow without a bank.",
        chapters: [
            { slug: "lending-protocols", title: "Lending Protocols" },
            { slug: "collateralized-loans", title: "Collateralized Loans" },
            { slug: "liquidation-risks", title: "Liquidation Risks" },
        ],
    },
    {
        id: 31,
        slug: "yield-and-liquidity",
        title: "Yield & Liquidity",
        path: "defi",
        description: "Liquidity pools, yield farming, and impermanent loss.",
        chapters: [
            { slug: "liquidity-pools", title: "Liquidity Pools" },
            { slug: "yield-farming", title: "Yield Farming" },
            { slug: "impermanent-loss", title: "Impermanent Loss" },
        ],
    },

    // ==========================================
    // PATH 9: CRYPTO TRADING (3 modules, 9 chapters)
    // ==========================================
    {
        id: 32,
        slug: "reading-crypto-markets",
        title: "Reading Crypto Markets",
        path: "crypto-trading",
        description: "Market cap, order books, and crypto-specific metrics.",
        chapters: [
            { slug: "market-cap-and-volume", title: "Market Cap & Volume" },
            { slug: "crypto-order-books", title: "Crypto Order Books" },
            { slug: "funding-rates", title: "Funding Rates & Open Interest" },
        ],
    },
    {
        id: 33,
        slug: "crypto-trading-strategies",
        title: "Trading Strategies",
        path: "crypto-trading",
        description: "Spot, futures, DCA, and risk management for crypto.",
        chapters: [
            { slug: "spot-vs-futures", title: "Spot vs Futures" },
            { slug: "dollar-cost-averaging", title: "Dollar-Cost Averaging" },
            { slug: "crypto-risk-management", title: "Risk Management in Crypto" },
        ],
    },
    {
        id: 34,
        slug: "on-chain-analysis",
        title: "On-Chain Analysis",
        path: "crypto-trading",
        description: "Use blockchain data to track whale moves and trends.",
        chapters: [
            { slug: "whale-watching", title: "Whale Watching" },
            { slug: "exchange-flows", title: "Exchange Flows" },
            { slug: "network-activity", title: "Network Activity Metrics" },
        ],
    },

    // ==========================================
    // PATH 10: TOKENOMICS & ADVANCED (3 modules, 9 chapters)
    // ==========================================
    {
        id: 35,
        slug: "tokenomics",
        title: "Tokenomics",
        path: "crypto-advanced",
        description: "Token supply, inflation, vesting, and utility.",
        chapters: [
            { slug: "token-supply-and-inflation", title: "Token Supply & Inflation" },
            { slug: "vesting-and-distribution", title: "Vesting & Distribution" },
            { slug: "token-utility", title: "Token Utility" },
        ],
    },
    {
        id: 36,
        slug: "crypto-in-india",
        title: "Crypto in India",
        path: "crypto-advanced",
        description: "Indian regulations, taxes, and approved exchanges.",
        chapters: [
            { slug: "indian-crypto-regulations", title: "Indian Crypto Regulations" },
            { slug: "crypto-taxation-india", title: "Crypto Taxation in India" },
            { slug: "approved-exchanges-india", title: "Approved Exchanges in India" },
        ],
    },
    {
        id: 37,
        slug: "crypto-portfolio-and-risk",
        title: "Portfolio & Risk Management",
        path: "crypto-advanced",
        description: "Diversify, rebalance, and avoid common scams.",
        chapters: [
            { slug: "diversification-in-crypto", title: "Diversification in Crypto" },
            { slug: "portfolio-rebalancing", title: "Portfolio Rebalancing" },
            { slug: "avoiding-scams", title: "Avoiding Scams & Rug Pulls" },
        ],
    },
];

export function getModulesByPath(pathKey: string): Module[] {
    return modules.filter((m) => m.path === pathKey);
}

export function getModuleBySlug(slug: string): Module | undefined {
    return modules.find((m) => m.slug === slug);
}

export function getChapter(moduleSlug: string, chapterSlug: string): Chapter | undefined {
    const mod = getModuleBySlug(moduleSlug);
    return mod?.chapters.find((c) => c.slug === chapterSlug);
}
