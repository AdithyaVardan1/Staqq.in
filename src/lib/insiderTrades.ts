// ─── Insider / Promoter Trades (PIT Disclosures) ────────────────────
// Fetches insider trading disclosures from NSE's corporate filings API.
// ─────────────────────────────────────────────────────────────────────

import { nseGet } from './nseClient';

export interface InsiderTrade {
    symbol: string;
    company: string;
    personName: string;
    personCategory: string;    // Promoter, Director, KMP, etc.
    sharesAcquired: number;
    acquireMode: string;       // Market Purchase, Market Sale, Off Market, etc.
    beforePercent: string;
    afterPercent: string;
    transactionDate: string;
    intimationDate: string;
}

interface NsePitResponse {
    data: Array<{
        symbol: string;
        company: string;
        personCategory: string;
        acqName: string;        // person name
        secAcq: string;         // shares acquired
        befAcqSharesPer: string;
        afterAcqSharesPer: string;
        acqMode: string;
        acqfromDt: string;      // transaction date
        intimDt: string;
    }>;
}

function formatDateParam(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

export async function fetchInsiderTrades(days = 7): Promise<InsiderTrade[]> {
    try {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - days);

        const fromStr = formatDateParam(from);
        const toStr = formatDateParam(to);

        const data = await nseGet<NsePitResponse>(
            `/api/corporates-pit?index=equities&from_date=${fromStr}&to_date=${toStr}`
        );

        if (!data?.data || !Array.isArray(data.data)) return [];

        return data.data
            .map(item => ({
                symbol: item.symbol || '',
                company: item.company || '',
                personName: item.acqName || '',
                personCategory: item.personCategory || '',
                sharesAcquired: parseInt(item.secAcq?.replace(/,/g, '') || '0', 10),
                acquireMode: item.acqMode || '',
                beforePercent: item.befAcqSharesPer || '0',
                afterPercent: item.afterAcqSharesPer || '0',
                transactionDate: item.acqfromDt || '',
                intimationDate: item.intimDt || '',
            }))
            .filter(t => t.symbol && t.personName)
            .sort((a, b) => {
                // Dates come as DD-MM-YYYY from NSE — convert for comparison
                const toDate = (str: string) => {
                    const parts = str.split('-');
                    if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
                    return new Date(str).getTime() || 0;
                };
                return toDate(b.transactionDate) - toDate(a.transactionDate);
            })
            .slice(0, 100); // Limit to latest 100
    } catch (error) {
        console.error('[Insider Trades] Fetch failed:', error);
        return [];
    }
}
