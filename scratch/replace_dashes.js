const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            if (['node_modules', '.next', '.git', 'scratch', 'dist', 'build'].includes(file)) return;
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) { 
                results = results.concat(walkDir(file));
            } else { 
                results.push(file);
            }
        });
    } catch(e) {}
    return results;
}

const files = walkDir('c:\\Users\\siva_\\Desktop\\PROJECTS\\STAQQ\\Staqq');
let count = 0;
files.forEach(file => {
    if (file.match(/\.(ts|tsx|js|jsx|json|md|mdx|css|html|sql)$/)) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('—')) {
                const newContent = content.replace(/—/g, ' ');
                fs.writeFileSync(file, newContent, 'utf8');
                count++;
            }
        } catch (e) {
            console.error('Error with file', file, e);
        }
    }
});
console.log('Modified ' + count + ' files.');
