require('dotenv').config({ path: '.env.local' });
const { AngelOneService } = require('./src/lib/angelone');

async function main() {
    const angel = AngelOneService.getInstance();
    await angel.ensureSession();
    
    const ticker = 'RELIANCE';
    console.log(`Fetching fundamental data for ${ticker}...`);
    const instrument = await angel.findInstrument(ticker);
    if (!instrument) {
        console.log('Instrument not found');
        return;
    }
    
    const data = await angel.getFundamentalData(instrument.exchange, String(instrument.token));
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
