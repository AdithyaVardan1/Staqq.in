import type { Metadata } from 'next';

interface Props {
    params: Promise<{ ticker: string }>;
    children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { ticker } = await params;
    const displayTicker = ticker.toUpperCase();

    const title = `${displayTicker} Stock Price & Analysis | Staqq`;
    const description = `${displayTicker}   live stock price, fundamentals, shareholding pattern, and market analysis on Staqq. Track ${displayTicker} with institutional flow data and social sentiment.`;

    const ogParams = new URLSearchParams({ ticker: displayTicker });

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [`/api/og/stock?${ogParams.toString()}`],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [`/api/og/stock?${ogParams.toString()}`],
        },
    };
}

export default function StockLayout({ children }: Props) {
    return children;
}
