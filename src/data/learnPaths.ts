import { getModulesByPath } from "./modules";

function buildModulesForPath(pathKey: string) {
  return getModulesByPath(pathKey).map((m) => ({
    slug: m.slug,
    title: m.title,
    description: m.description,
    chapterCount: m.chapters.length,
    firstLesson: m.chapters[0] ? { slug: m.chapters[0].slug, title: m.chapters[0].title } : null,
  }));
}

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface LearnPath {
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedTime: string;
  icon: string;
  color: string;
  modules: ReturnType<typeof buildModulesForPath>;
}

export const learnPaths: Record<string, LearnPath> = {
  beginner: {
    title: "Absolute Beginner",
    description: "Start from zero. Learn what stocks are and how markets work.",
    difficulty: "BEGINNER",
    estimatedTime: "45m",
    icon: "sprout",
    color: "#b6ff00",
    modules: buildModulesForPath("beginner"),
  },

  financials: {
    title: "Understanding Financials",
    description: "Read balance sheets, P&L statements, and key ratios.",
    difficulty: "INTERMEDIATE",
    estimatedTime: "1h 30m",
    icon: "chart-bar",
    color: "#38bdf8",
    modules: buildModulesForPath("financials"),
  },

  technical: {
    title: "Technical Analysis",
    description: "Charts, patterns, indicators, and price action.",
    difficulty: "INTERMEDIATE",
    estimatedTime: "2h 00m",
    icon: "chart-candlestick",
    color: "#f59e0b",
    modules: buildModulesForPath("technical"),
  },

  ipo: {
    title: "IPO Investing",
    description: "From RHP to listing day and long-term evaluation.",
    difficulty: "BEGINNER",
    estimatedTime: "1h 15m",
    icon: "rocket",
    color: "#a855f7",
    modules: buildModulesForPath("ipo"),
  },

  fundamental: {
    title: "Fundamental Analysis",
    description: "Deep-dive into business and long-term investing.",
    difficulty: "ADVANCED",
    estimatedTime: "2h 30m",
    icon: "building",
    color: "#ff6b35",
    modules: buildModulesForPath("fundamental"),
  },
};

export const cryptoLearnPaths: Record<string, LearnPath> = {
  "crypto-101": {
    title: "Crypto 101",
    description: "Start from zero. What Bitcoin is, how wallets work, and how to buy your first crypto.",
    difficulty: "BEGINNER",
    estimatedTime: "45m",
    icon: "bitcoin",
    color: "#f7931a",
    modules: buildModulesForPath("crypto-101"),
  },

  blockchain: {
    title: "Blockchain & Web3",
    description: "Consensus, smart contracts, dApps, DAOs, and NFTs explained.",
    difficulty: "INTERMEDIATE",
    estimatedTime: "1h 15m",
    icon: "network",
    color: "#8b5cf6",
    modules: buildModulesForPath("blockchain"),
  },

  defi: {
    title: "DeFi Decoded",
    description: "DEXes, lending protocols, yield farming, and liquidity pools.",
    difficulty: "INTERMEDIATE",
    estimatedTime: "1h 30m",
    icon: "defi",
    color: "#22c55e",
    modules: buildModulesForPath("defi"),
  },

  "crypto-trading": {
    title: "Crypto Trading",
    description: "Read crypto markets, trade spot and futures, and use on-chain data.",
    difficulty: "INTERMEDIATE",
    estimatedTime: "2h",
    icon: "chart-candlestick",
    color: "#38bdf8",
    modules: buildModulesForPath("crypto-trading"),
  },

  "crypto-advanced": {
    title: "Tokenomics & Advanced",
    description: "Token economics, Indian crypto regulations, portfolio management.",
    difficulty: "ADVANCED",
    estimatedTime: "2h 30m",
    icon: "building",
    color: "#ef4444",
    modules: buildModulesForPath("crypto-advanced"),
  },
};
