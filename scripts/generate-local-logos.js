const fs = require('fs');
const path = require('path');
const nifty500 = require('../src/data/nifty500.json');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'logos');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Premium color palette for the SVG placeholders
const colors = [
    ['#3b82f6', '#1d4ed8'], // Blue
    ['#8b5cf6', '#6d28d9'], // Violet
    ['#10b981', '#047857'], // Emerald
    ['#f59e0b', '#b45309'], // Amber
    ['#ef4444', '#b91c1c'], // Red
    ['#ec4899', '#be185d'], // Pink
    ['#06b6d4', '#0e7490'], // Cyan
    ['#84cc16', '#4d7c0f'], // Lime
];

function generateSVG(name, ticker, colorIndex) {
    const [color1, color2] = colors[colorIndex];
    // Extract first letter of ticker
    const letter = (ticker || 'A').charAt(0).toUpperCase();

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="grad-${ticker}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="120" height="120" rx="24" fill="url(#grad-${ticker})" />
  <text 
    x="50%" 
    y="54%" 
    dominant-baseline="middle" 
    text-anchor="middle" 
    fill="white" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="64" 
    font-weight="800"
    filter="url(#shadow)"
  >${letter}</text>
</svg>`;
}

function main() {
    let count = 0;
    nifty500.forEach((stock, index) => {
        const baseTicker = stock.symbol.split('.')[0];
        const destPath = path.join(OUTPUT_DIR, `${baseTicker}.svg`);
        
        // Use index to pick a consistent color
        const colorIndex = index % colors.length;
        const svgContent = generateSVG(stock.name, baseTicker, colorIndex);
        
        fs.writeFileSync(destPath, svgContent);
        count++;
    });

    console.log(`Successfully generated ${count} high-quality SVG local logos!`);
}

main();
