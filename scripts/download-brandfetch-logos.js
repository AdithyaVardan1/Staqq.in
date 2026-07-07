const fs = require('fs');
const path = require('path');
const https = require('https');
const nifty500 = require('../src/data/nifty500.json');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'logos');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CLIENT_ID = '1idWXv10OMLSjAU-mai';

// We'll limit concurrency to avoid rate limits from Brandfetch
const CONCURRENCY = 5;

async function downloadLogo(baseTicker) {
    const destPath = path.join(OUTPUT_DIR, `${baseTicker}.png`);
    // If it already exists and is a PNG (not SVG), we could skip, but let's overwrite the SVGs
    // Wait, earlier I generated .svg files. We should delete them or just fetch .png.
    
    const url = `https://cdn.brandfetch.io/ticker/${baseTicker}.NS?c=${CLIENT_ID}`;
    
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (res) => {
            if (res.statusCode === 200) {
                const file = fs.createWriteStream(destPath);
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(true);
                });
            } else if (res.statusCode === 301 || res.statusCode === 302) {
                // follow redirect
                https.get(res.headers.location, (redirectRes) => {
                    if (redirectRes.statusCode === 200) {
                        const file = fs.createWriteStream(destPath);
                        redirectRes.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            resolve(true);
                        });
                    } else {
                        resolve(false);
                    }
                }).on('error', () => resolve(false));
            } else {
                resolve(false); // probably 404 or 403
            }
        }).on('error', (err) => {
            resolve(false);
        });
    });
}

async function main() {
    let successCount = 0;
    let failCount = 0;
    
    // Create an array of tasks
    const tasks = nifty500.map(stock => stock.symbol.split('.')[0]);
    
    console.log(`Starting download of ${tasks.length} logos from Brandfetch...`);
    
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const chunk = tasks.slice(i, i + CONCURRENCY);
        const results = await Promise.all(chunk.map(async (ticker) => {
            try {
                const success = await downloadLogo(ticker);
                if (success) {
                    process.stdout.write('+');
                    return true;
                } else {
                    process.stdout.write('-');
                    return false;
                }
            } catch (e) {
                process.stdout.write('-');
                return false;
            }
        }));
        
        successCount += results.filter(Boolean).length;
        failCount += results.filter(r => !r).length;
    }
    
    console.log(`\n\nFinished! Successfully downloaded ${successCount} logos. Failed: ${failCount}`);
}

main();
