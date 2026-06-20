import { NextResponse } from 'next/server';
import { getStablecoinData } from '@/lib/stablecoins';
import { cdnCache } from '@/lib/http-cache';

export async function GET() {
    try {
        const coins = await getStablecoinData();
        return NextResponse.json({ coins, count: coins.length }, { headers: cdnCache(300) });
    } catch (error: any) {
        console.error('[Stablecoins API]', error.message);
        return NextResponse.json({ error: 'Failed to fetch stablecoin data' }, { status: 500 });
    }
}
