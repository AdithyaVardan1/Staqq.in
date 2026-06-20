import { NextRequest, NextResponse } from 'next/server';
import { getWalletBuys, detectChain } from '@/lib/wallet-tracker';
import { cdnCache } from '@/lib/http-cache';

export const maxDuration = 60; // Solana RPC needs more time

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const address = searchParams.get('address')?.trim();
    const chain = searchParams.get('chain') || undefined;

    if (!address) {
        return NextResponse.json({ error: 'address param required' }, { status: 400 });
    }

    const detected = chain || detectChain(address);
    if (!detected) {
        return NextResponse.json({ error: 'Could not detect chain. Pass ?chain=eth|bsc|solana' }, { status: 400 });
    }

    const result = await getWalletBuys(address, detected);
    return NextResponse.json(result, { headers: cdnCache(120) });
}
