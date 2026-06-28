// Fallback mock data when Yahoo Finance API fails
export const getMockFundamentals = (ticker: string) => {
    const mockData: Record<string, any> = {
        'RELIANCE': {
            ticker: 'RELIANCE.NS',
            description: 'Reliance Industries Limited is an Indian multinational conglomerate, headquartered in Mumbai. Its businesses include energy, petrochemicals, natural gas, retail, telecommunications, mass media, and textiles.',
            sector: 'Energy',
            industry: 'Oil & Gas Integrated',
            marketCap: 16500000000000, // 16.5T
            peRatio: 24.5,
            pegRatio: 1.4,
            pbRatio: 2.1,
            beta: 1.15,
            divYield: 0.0085, // 0.85%
            netMargin: 0.124, // 12.4%
            roe: 0.142, // 14.2%
            roa: 0.085, // 8.5%
            eps: 102.7,
            high52: 2630.00,
            low52: 2145.00,
            debtToEquity: 0.42,
            website: 'https://www.ril.com'
        },
        'TCS': {
            ticker: 'TCS.NS',
            description: 'Tata Consultancy Services (TCS) is an Indian multinational information technology (IT) services and consulting company.',
            sector: 'Technology',
            industry: 'Information Technology Services',
            marketCap: 12400000000000, // 12.4T
            peRatio: 29.1,
            pegRatio: 1.8,
            pbRatio: 4.2,
            beta: 0.85,
            divYield: 0.032, // 3.2%
            netMargin: 0.182, // 18.2%
            roe: 0.312, // 31.2%
            roa: 0.22, // 22%
            eps: 30.2,
            high52: 3600.00,
            low52: 3100.00,
            debtToEquity: 0.05,
            website: 'https://www.tcs.com'
        },
        'HDFCBANK': {
            ticker: 'HDFCBANK.NS',
            description: 'HDFC Bank Limited is an Indian banking and financial services company headquartered in Mumbai.',
            sector: 'Financial Services',
            industry: 'Banks Diversified',
            marketCap: 9200000000000, // 9.2T
            peRatio: 18.4,
            pegRatio: 1.0,
            pbRatio: 1.1,
            beta: 1.05,
            divYield: 0.015, // 1.5%
            netMargin: 0.25, // 25%
            roe: 0.15, // 15%
            roa: 0.01, // 1%
            eps: 21.4,
            high52: 1750.00,
            low52: 1450.00,
            debtToEquity: 0.85,
            website: 'https://www.hdfcbank.com'
        },
        'INFY': {
            ticker: 'INFY.NS',
            description: 'Infosys Limited is an Indian multinational information technology company that provides business consulting, information technology and outsourcing services.',
            sector: 'Technology',
            industry: 'Information Technology Services',
            marketCap: 6100000000000, // 6.1T
            peRatio: 22.8,
            pegRatio: 1.5,
            pbRatio: 3.8,
            beta: 0.92,
            divYield: 0.028, // 2.8%
            netMargin: 0.158, // 15.8%
            roe: 0.312, // 31.2%
            roa: 0.18, // 18%
            eps: 14.5,
            high52: 1650.00,
            low52: 1380.00,
            debtToEquity: 0.0,
            website: 'https://www.infosys.com'
        },
        'ITC': {
            ticker: 'ITC.NS',
            description: 'ITC Limited is an Indian multinational conglomerate company headquartered in Kolkata with diversified presence across FMCG, hotels, software, packaging, paperboards and agribusiness.',
            sector: 'Consumer Defensive',
            industry: 'Tobacco',
            marketCap: 5600000000000, // 5.6T
            peRatio: 26.5,
            pegRatio: 2.1,
            pbRatio: 8.5,
            beta: 0.75,
            divYield: 0.045, // 4.5%
            netMargin: 0.284, // 28.4%
            roe: 0.18, // 18%
            roa: 0.12, // 12%
            eps: 4.3,
            high52: 499.00,
            low52: 390.00,
            debtToEquity: 0.01,
            website: 'https://www.itcportal.com'
        }
    };

    return mockData[ticker] || mockData['RELIANCE'];
};