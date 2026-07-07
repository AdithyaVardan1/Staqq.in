#!/usr/bin/env node
/**
 * fetch-logos.js
 * Downloads stock logos for all Nifty 500 tickers and caches them in public/logos/
 * Run: node scripts/fetch-logos.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const nifty500 = require('../src/data/nifty500.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'logos');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
}

function download(url, destPath, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const options = {
            timeout: timeoutMs,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.nseindia.com/',
            },
        };
        const req = protocol.get(url, options, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return download(res.headers.location, destPath, timeoutMs).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            // Check content-type — skip HTML error pages
            const ct = res.headers['content-type'] || '';
            if (ct.includes('text/html')) {
                res.resume();
                return reject(new Error('Got HTML, not an image'));
            }
            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    // Check file size — reject tiny files (< 200 bytes = likely error page)
                    const stat = fs.statSync(destPath);
                    if (stat.size < 200) {
                        fs.unlinkSync(destPath);
                        reject(new Error(`File too small: ${stat.size} bytes`));
                    } else {
                        resolve();
                    }
                });
            });
            file.on('error', (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

async function fetchLogoForTicker(symbol) {
    const baseTicker = symbol.split('.')[0];
    const destPath = path.join(OUTPUT_DIR, `${baseTicker}.png`);

    // Skip if already cached
    if (fs.existsSync(destPath)) {
        const stat = fs.statSync(destPath);
        if (stat.size > 200) return 'cached';
    }

    // Try sources in priority order
    const sources = [
        `https://assets.upstox.com/content/assets/images/logos/${baseTicker}.png`,
        `https://ticker.finology.in/logos/stocks/${baseTicker}.png`,
        `https://s3-symbol-logo.tradingview.com/nse-${baseTicker.toLowerCase()}--big.svg`,
    ];

    for (const url of sources) {
        try {
            await download(url, destPath);
            return 'downloaded';
        } catch (e) {
            // Try next source
        }
    }

    return 'failed';
}

async function main() {
    const tickers = nifty500.map(s => s.symbol);
    console.log(`Processing ${tickers.length} tickers...\n`);

    let downloaded = 0, cached = 0, failed = 0;
    const failures = [];

    // Process in batches of 10 to avoid overwhelming the CDNs
    const BATCH_SIZE = 10;
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
        const batch = tickers.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(fetchLogoForTicker));

        results.forEach((result, idx) => {
            const ticker = batch[idx];
            if (result === 'downloaded') { downloaded++; process.stdout.write('✓'); }
            else if (result === 'cached') { cached++; process.stdout.write('.'); }
            else { failed++; failures.push(ticker); process.stdout.write('✗'); }
        });

        // Throttle between batches
        if (i + BATCH_SIZE < tickers.length) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    console.log(`\n\n═══ Summary ═══`);
    console.log(`✓ Downloaded : ${downloaded}`);
    console.log(`. Cached     : ${cached}`);
    console.log(`✗ Failed     : ${failed}`);
    if (failures.length) {
        console.log(`\nFailed tickers (will use CDN fallback):`);
        console.log(failures.join(', '));
    }
    console.log('\nDone! Logos saved to public/logos/');
}

main().catch(console.error);
