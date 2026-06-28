// ─── Wallet Tracker ────────────────────────────────────────────────────
// Paste any wallet address and see what it's been buying.
// Auto-detects chain from address format. No pre-seeded wallets.
// ─────────────────────────────────────────────────────────────────────

export interface WalletBuy {
    id: string;
    walletAddress: string;
    chain: string;
    tokenSymbol: string;
    tokenName: string;
    tokenAddress: string;
    amountUsd: number;
    txHash: string;
    timestamp: string;
    priceUsd: number | null;
    priceChange1h: number | null;
    priceChange24h: number | null;
    dexUrl: string | null;
}

// ─── Chain Detection ─────────────────────────────────────────────────

/**
 * Detect chain from address format.
 * 0x... = EVM (eth or bsc   we try eth first)
 * Base58, 32-44 chars, no 0x = Solana
 */
export function detectChain(address: string): 'eth' | 'solana' | null {
    if (/^0x[0-9a-fA-F]{40}$/.test(address)) return 'eth';
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return 'solana';
    return null;
}

// ─── EVM (Etherscan / BscScan) ────────────────────────────────────────

export async function fetchEVMBuys(
    address: string,
    chain: 'eth' | 'bsc'
): Promise<WalletBuy[]> {
    const apiKey = chain === 'eth'
        ? process.env.ETHERSCAN_API_KEY
        : process.env.BSCSCAN_API_KEY;

    if (!apiKey) {
        throw new Error(`${chain.toUpperCase()} API key not configured.`);
    }

    const baseUrl = chain === 'eth'
        ? 'https://api.etherscan.io/v2/api?chainid=1'
        : 'https://api.bscscan.com/api?';

    const cutoff = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60; // last 30 days
    const url = `${baseUrl}&module=account&action=tokentx&address=${address}&sort=desc&page=1&offset=50&startblock=0&endblock=99999999&apikey=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Etherscan request failed');

    const data = await res.json();

    if (data.status === '0' && data.message === 'No transactions found') return [];
    if (data.status !== '1' || !Array.isArray(data.result)) {
        throw new Error(data.message || 'API error');
    }

    const SKIP = new Set(['USDT', 'USDC', 'DAI', 'WETH', 'WBNB', 'ETH', 'BNB', 'BUSD', 'TUSD', 'FRAX', 'LUSD', 'USDP']);
    const buys: WalletBuy[] = [];

    for (const tx of data.result) {
        const ts = parseInt(tx.timeStamp);
        if (ts < cutoff) continue;

        // Only incoming transfers to this wallet = buys
        if (tx.to?.toLowerCase() !== address.toLowerCase()) continue;

        const symbol = tx.tokenSymbol || '???';
        if (SKIP.has(symbol)) continue;

        const decimals = parseInt(tx.tokenDecimal || '18');
        const value = parseInt(tx.value) / Math.pow(10, decimals);
        if (value <= 0) continue;

        buys.push({
            id: `${chain}-${tx.hash}-${tx.contractAddress}`,
            walletAddress: address,
            chain,
            tokenSymbol: symbol,
            tokenName: tx.tokenName || symbol,
            tokenAddress: tx.contractAddress,
            amountUsd: 0,
            txHash: tx.hash,
            timestamp: new Date(ts * 1000).toISOString(),
            priceUsd: null,
            priceChange1h: null,
            priceChange24h: null,
            dexUrl: null,
        });
    }

    return buys;
}

// ─── Solana ───────────────────────────────────────────────────────────

const SOL_STABLECOINS = new Set([
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',  // USDT
    'So11111111111111111111111111111111111111112',     // WSOL
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  // mSOL
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK (filter, too common)
]);

async function solanaRpc(method: string, params: unknown[]) {
    const res = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!res.ok) throw new Error('Solana RPC error');
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Solana RPC error');
    return data.result;
}

export async function fetchSolanaBuys(address: string): Promise<WalletBuy[]> {
    const cutoff = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

    // 1. Get recent signatures
    const sigs: { signature: string; blockTime: number; err: unknown }[] = await solanaRpc(
        'getSignaturesForAddress',
        [address, { limit: 40 }]
    );

    const recent = sigs.filter(s => !s.err && s.blockTime && s.blockTime > cutoff);
    if (recent.length === 0) return [];

    // 2. Fetch each transaction and find token increases
    const buys: WalletBuy[] = [];

    // Process in batches of 5 to avoid rate limiting
    for (let i = 0; i < Math.min(recent.length, 30); i += 5) {
        const batch = recent.slice(i, i + 5);
        const txResults = await Promise.allSettled(
            batch.map(s =>
                solanaRpc('getTransaction', [
                    s.signature,
                    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
                ])
            )
        );

        for (let j = 0; j < batch.length; j++) {
            const result = txResults[j];
            if (result.status !== 'fulfilled' || !result.value) continue;

            const tx = result.value;
            const sig = batch[j].signature;
            const blockTime = batch[j].blockTime;

            const pre: Record<string, number> = {};
            const post: Record<string, number> = {};

            // Map accountIndex to owner for pre/post token balances
            for (const b of tx.meta?.preTokenBalances || []) {
                if (b.owner === address) {
                    pre[b.mint] = (pre[b.mint] || 0) + parseFloat(b.uiTokenAmount?.uiAmountString || '0');
                }
            }
            for (const b of tx.meta?.postTokenBalances || []) {
                if (b.owner === address) {
                    post[b.mint] = (post[b.mint] || 0) + parseFloat(b.uiTokenAmount?.uiAmountString || '0');
                }
            }

            // Find tokens that increased (buys/receives)
            for (const mint of Object.keys(post)) {
                if (SOL_STABLECOINS.has(mint)) continue;
                const gained = (post[mint] || 0) - (pre[mint] || 0);
                if (gained <= 0) continue;

                // Get token symbol from parsed instructions if possible
                const tokenSymbol = mint.slice(0, 6).toUpperCase();

                buys.push({
                    id: `solana-${sig}-${mint}`,
                    walletAddress: address,
                    chain: 'solana',
                    tokenSymbol,
                    tokenName: tokenSymbol,
                    tokenAddress: mint,
                    amountUsd: 0,
                    txHash: sig,
                    timestamp: new Date(blockTime * 1000).toISOString(),
                    priceUsd: null,
                    priceChange1h: null,
                    priceChange24h: null,
                    dexUrl: null,
                });
            }
        }

        // Small pause between batches to respect rate limits
        if (i + 5 < recent.length) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    return buys;
}

// ─── DexScreener Enrichment ───────────────────────────────────────────

async function enrichWithDexScreener(buys: WalletBuy[]): Promise<WalletBuy[]> {
    // DexScreener allows batching by token address
    const uniqueAddresses = [...new Set(buys.map(b => b.tokenAddress))].slice(0, 30);

    const enrichMap: Record<string, Partial<WalletBuy> & { tokenSymbol?: string; tokenName?: string }> = {};

    await Promise.allSettled(uniqueAddresses.map(async (addr) => {
        try {
            const res = await fetch(
                `https://api.dexscreener.com/latest/dex/tokens/${addr}`,
                { next: { revalidate: 60 } }
            );
            if (!res.ok) return;
            const data = await res.json();
            const pair = data.pairs?.[0];
            if (!pair) return;

            enrichMap[addr] = {
                priceUsd: parseFloat(pair.priceUsd || '0') || null,
                priceChange1h: pair.priceChange?.h1 ?? null,
                priceChange24h: pair.priceChange?.h24 ?? null,
                dexUrl: pair.url || null,
                // Use real symbol/name from DexScreener (important for Solana where we only have the mint)
                tokenSymbol: pair.baseToken?.symbol || undefined,
                tokenName: pair.baseToken?.name || undefined,
            };
        } catch {
            // ignore
        }
    }));

    return buys.map(b => {
        const enrich = enrichMap[b.tokenAddress] ?? {};
        return {
            ...b,
            ...enrich,
            // Keep original symbol/name if DexScreener didn't find it
            tokenSymbol: enrich.tokenSymbol || b.tokenSymbol,
            tokenName: enrich.tokenName || b.tokenName,
        };
    });
}

// ─── Public API ───────────────────────────────────────────────────────

export interface WalletResult {
    buys: WalletBuy[];
    chain: string;
    address: string;
    error?: string;
}

export async function getWalletBuys(
    address: string,
    chain?: string
): Promise<WalletResult> {
    const detectedChain = chain || detectChain(address);
    if (!detectedChain) {
        return { buys: [], chain: 'unknown', address, error: 'Could not detect chain from address format.' };
    }

    try {
        let buys: WalletBuy[] = [];

        if (detectedChain === 'eth' || detectedChain === 'bsc') {
            buys = await fetchEVMBuys(address, detectedChain as 'eth' | 'bsc');
        } else if (detectedChain === 'solana') {
            buys = await fetchSolanaBuys(address);
        }

        // Deduplicate
        const seen = new Set<string>();
        const deduped = buys.filter(b => {
            if (seen.has(b.id)) return false;
            seen.add(b.id);
            return true;
        });

        const enriched = await enrichWithDexScreener(deduped.slice(0, 30));
        enriched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return { buys: enriched, chain: detectedChain, address };
    } catch (err: any) {
        return { buys: [], chain: detectedChain, address, error: err.message };
    }
}
