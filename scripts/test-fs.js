const fs = require('fs');
const path = require('path');
console.log('Writing to file...');
try {
  fs.writeFileSync(path.join(__dirname, 'fs-test.log'), 'Hello World');
  console.log('Write success');
} catch (e) {
  console.error('Write failed:', e);
  process.exit(1);
}