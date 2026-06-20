import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { analyzeToken, type SupportedChain } from '@/lib/goplus';
import { cdnCache } from '@/lib/http-cache';

export const maxDuration = 60;

interface DexProfile {
    url: string;
    chainId: string;
    tokenAddress: string;
    icon?: string;
    description?: string;
    links?: { type: string; url: string }[];
}

interface DexPair {
    baseToken: { address: string; name: string; symbol: string };
    priceUsd: string;
    volume: { h24: number };
    priceChange: { h1: number; h24: number };
    liquidity: { usd: number };
    marketCap: number;
    fdv: number;
    pairCreatedAt: number;
    url: string;
    chainId: string;
}

// Map DexScreener chainId to GoPlus chain
const CHAIN_MAP: Record<string, string> = {
    ethereum: 'eth',
    bsc: 'bsc',
    base: 'base',
    solana: 'solana',
    polygon: 'polygon',
    arbitrum: 'arbitrum',
    avalanche: 'avax',
};

async function fetchLatestProfiles(): Promise<DexProfile[]> {
    const res = await fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
        cache: 'no-store',
        headers: { 'User-Agent': 'Staqq/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, 20) : [];
}

async function fetchTokenPairs(chainId: string, address: string): Promise<DexPair | null> {
    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const data = await res.json();
        const pairs: DexPair[] = data.pairs || [];
        if (pairs.length === 0) return null;
        return pairs
            .filter(p => p.chainId === chainId)
            .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0] || pairs[0];
    } catch {
        return null;
    }
}

export async function GET() {
    try {
        const supabase = createAdminClient();
        const profiles = await fetchLatestProfiles();

        if (profiles.length === 0) {
            return NextResponse.json({ tokens: [] }, { headers: cdnCache(300) });
        }

        const results = await Promise.allSettled(
            profiles.map(async (profile) => {
                const goplusChain = CHAIN_MAP[profile.chainId] || profile.chainId;

                // Check cache first
                const { data: cached } = await supabase
                    .from('new_token_cache')
                    .select('*')
                    .eq('contract_address', profile.tokenAddress)
                    .eq('chain', goplusChain)
                    .maybeSingle();

                // Use cache if < 1 hour old
                if (cached && cached.cached_at) {
                    const age = Date.now() - new Date(cached.cached_at).getTime();
                    if (age < 60 * 60 * 1000) {
                        return {
                            ...cached,
                            profile_url: profile.url,
                            icon_url: profile.icon,
                        };
                    }
                }

                // Fetch DEX data + run safety scan in parallel
                const [pair, safety] = await Promise.allSettled([
                    fetchTokenPairs(profile.chainId, profile.tokenAddress),
                    analyzeToken(goplusChain as SupportedChain, profile.tokenAddress),
                ]);

                const pairData = pair.status === 'fulfilled' ? pair.value : null;
                const safetyData = safety.status === 'fulfilled' ? safety.value : null;

                const row = {
                    contract_address: profile.tokenAddress,
                    chain: goplusChain,
                    token_symbol: pairData?.baseToken?.symbol || safetyData?.symbol || '???',
                    token_name: pairData?.baseToken?.name || safetyData?.name || null,
                    safety_score: safetyData?.score ?? null,
                    verdict: safetyData?.verdict ?? null,
                    flags: safetyData?.flags?.filter((f: any) => f.detected) ?? [],
                    dex_data: pairData ? {
                        priceUsd: pairData.priceUsd,
                        volume24h: pairData.volume?.h24,
                        priceChange1h: pairData.priceChange?.h1,
                        priceChange24h: pairData.priceChange?.h24,
                        liquidityUsd: pairData.liquidity?.usd,
                        marketCap: pairData.marketCap || pairData.fdv,
                        pairUrl: pairData.url,
                        pairCreatedAt: pairData.pairCreatedAt,
                    } : null,
                    profile_url: profile.url,
                    icon_url: profile.icon,
                    cached_at: new Date().toISOString(),
                };

                // Cache result
                await supabase.from('new_token_cache').upsert(row, {
                    onConflict: 'contract_address,chain',
                });

                return row;
            })
        );

        const tokens = results
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => (r as any).value)
            .sort((a, b) => (a.safety_score ?? 50) - (b.safety_score ?? 50)); // safest first

        return NextResponse.json({ tokens, count: tokens.length }, { headers: cdnCache(300) });
    } catch (err: any) {
        console.error('[NewTokens API]', err.message);
        return NextResponse.json({ error: 'Failed to fetch new tokens' }, { status: 500 });
    }
}
