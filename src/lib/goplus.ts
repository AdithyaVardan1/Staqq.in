// GoPlus Security API   token security analysis
// Docs: https://docs.gopluslabs.io/

export type SupportedChain = 'eth' | 'bsc' | 'base' | 'solana' | 'polygon' | 'arbitrum' | 'avax';

export const CHAIN_IDS: Record<SupportedChain, string> = {
    eth: '1',
    bsc: '56',
    base: '8453',
    solana: 'solana',
    polygon: '137',
    arbitrum: '42161',
    avax: '43114',
};

export const CHAIN_LABELS: Record<SupportedChain, string> = {
    eth: 'Ethereum',
    bsc: 'BNB Chain',
    base: 'Base',
    solana: 'Solana',
    polygon: 'Polygon',
    arbitrum: 'Arbitrum',
    avax: 'Avalanche',
};

export interface RugpullResult {
    address: string;
    chain: SupportedChain;
    name: string;
    symbol: string;
    score: number; // 0-100, higher = riskier
    verdict: 'SAFE' | 'CAUTION' | 'DANGER' | 'RUG';
    flags: RiskFlag[];
    dex: DexInfo[];
    holders: HolderInfo;
    creator: CreatorInfo;
    tax: TaxInfo;
    raw: any;
}

export interface RiskFlag {
    id: string;
    label: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    detected: boolean;
    value?: string;
    points: number;
}

export interface DexInfo {
    name: string;
    liquidity: number;
    pair: string;
}

export interface HolderInfo {
    count: number;
    top10Percent: number;
    creatorPercent: number;
    lpLockedPercent: number;
}

export interface CreatorInfo {
    address: string;
    balance: string;
    percent: number;
}

export interface TaxInfo {
    buy: number;
    sell: number;
}

const GOPLUS_BASE = 'https://api.gopluslabs.io/api/v1';

async function fetchGoPlusSecurity(chain: SupportedChain, address: string): Promise<any> {
    const chainId = CHAIN_IDS[chain];
    const url = chain === 'solana'
        ? `${GOPLUS_BASE}/solana/token_security?contract_addresses=${address}`
        : `${GOPLUS_BASE}/token_security/${chainId}?contract_addresses=${address.toLowerCase()}`;

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Staqq/1.0',
        },
        next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`GoPlus API error: ${res.status}`);
    const data = await res.json();
    if (data.code !== 1) throw new Error(`GoPlus error: ${data.message}`);

    const key = address.toLowerCase();
    return data.result?.[key] || data.result?.[address] || null;
}

async function fetchDexScreener(address: string): Promise<any> {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
        next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.pairs?.[0] || null;
}

function calcScore(flags: RiskFlag[]): number {
    const detected = flags.filter(f => f.detected);
    const total = detected.reduce((sum, f) => sum + f.points, 0);
    return Math.min(100, total);
}

function getVerdict(score: number): RugpullResult['verdict'] {
    if (score >= 70) return 'RUG';
    if (score >= 45) return 'DANGER';
    if (score >= 20) return 'CAUTION';
    return 'SAFE';
}

export async function analyzeToken(chain: SupportedChain, address: string): Promise<RugpullResult> {
    const [gp, dex] = await Promise.allSettled([
        fetchGoPlusSecurity(chain, address),
        fetchDexScreener(address),
    ]);

    const gpData = gp.status === 'fulfilled' ? gp.value : null;
    const dexData = dex.status === 'fulfilled' ? dex.value : null;

    if (!gpData) throw new Error('Could not fetch token security data. Check contract address and chain.');

    const buyTax = parseFloat(gpData.buy_tax || '0') * 100;
    const sellTax = parseFloat(gpData.sell_tax || '0') * 100;
    const top10Percent = parseFloat(gpData.holder_percent || '0') * 100;
    const creatorPercent = parseFloat(gpData.creator_percent || '0') * 100;
    const lpLockedPercent = parseFloat(gpData.lp_holder_percent || '0') * 100;
    const holderCount = parseInt(gpData.holder_count || '0', 10);

    const totalLiquidity = (gpData.dex || []).reduce((sum: number, d: any) => {
        return sum + parseFloat(d.liquidity || '0');
    }, 0);

    const flags: RiskFlag[] = [
        {
            id: 'honeypot',
            label: 'Honeypot detected',
            severity: 'critical',
            detected: gpData.is_honeypot === '1',
            points: 45,
        },
        {
            id: 'mint',
            label: 'Mint function active',
            severity: 'critical',
            detected: gpData.is_mintable === '1',
            points: 20,
        },
        {
            id: 'ownership',
            label: 'Ownership not renounced',
            severity: 'high',
            detected: gpData.owner_address !== '' && gpData.owner_address !== '0x0000000000000000000000000000000000000000',
            value: gpData.owner_address || undefined,
            points: 12,
        },
        {
            id: 'proxy',
            label: 'Upgradeable proxy contract',
            severity: 'high',
            detected: gpData.is_proxy === '1',
            points: 10,
        },
        {
            id: 'tax_buy',
            label: `High buy tax (${buyTax.toFixed(1)}%)`,
            severity: buyTax > 20 ? 'critical' : 'high',
            detected: buyTax > 10,
            value: `${buyTax.toFixed(1)}%`,
            points: buyTax > 20 ? 15 : 8,
        },
        {
            id: 'tax_sell',
            label: `High sell tax (${sellTax.toFixed(1)}%)`,
            severity: sellTax > 20 ? 'critical' : 'high',
            detected: sellTax > 10,
            value: `${sellTax.toFixed(1)}%`,
            points: sellTax > 20 ? 15 : 8,
        },
        {
            id: 'concentration',
            label: `Top 10 holders own ${top10Percent.toFixed(1)}%`,
            severity: top10Percent > 80 ? 'critical' : 'high',
            detected: top10Percent > 60,
            value: `${top10Percent.toFixed(1)}%`,
            points: top10Percent > 80 ? 12 : 6,
        },
        {
            id: 'liquidity',
            label: `Low liquidity ($${totalLiquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })})`,
            severity: totalLiquidity < 10000 ? 'critical' : 'medium',
            detected: totalLiquidity < 50000,
            value: `$${totalLiquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            points: totalLiquidity < 10000 ? 10 : 5,
        },
        {
            id: 'unverified',
            label: 'Contract source not verified',
            severity: 'medium',
            detected: gpData.is_open_source === '0',
            points: 8,
        },
        {
            id: 'blacklist',
            label: 'Blacklist function exists',
            severity: 'medium',
            detected: gpData.is_blacklisted === '1',
            points: 7,
        },
        {
            id: 'trading_cooldown',
            label: 'Trading cooldown mechanism',
            severity: 'medium',
            detected: gpData.trading_cooldown === '1',
            points: 5,
        },
        {
            id: 'hidden_owner',
            label: 'Hidden owner detected',
            severity: 'critical',
            detected: gpData.hidden_owner === '1',
            points: 15,
        },
        {
            id: 'external_call',
            label: 'External contract calls in transfer',
            severity: 'high',
            detected: gpData.external_call === '1',
            points: 8,
        },
    ];

    const score = calcScore(flags);
    const verdict = getVerdict(score);

    const dexList: DexInfo[] = (gpData.dex || []).map((d: any) => ({
        name: d.name,
        liquidity: parseFloat(d.liquidity || '0'),
        pair: d.pair,
    }));

    return {
        address,
        chain,
        name: gpData.token_name || dexData?.baseToken?.name || 'Unknown',
        symbol: gpData.token_symbol || dexData?.baseToken?.symbol || '???',
        score,
        verdict,
        flags,
        dex: dexList,
        holders: {
            count: holderCount,
            top10Percent,
            creatorPercent,
            lpLockedPercent,
        },
        creator: {
            address: gpData.creator_address || '',
            balance: gpData.creator_balance || '0',
            percent: creatorPercent,
        },
        tax: {
            buy: buyTax,
            sell: sellTax,
        },
        raw: gpData,
    };
}
