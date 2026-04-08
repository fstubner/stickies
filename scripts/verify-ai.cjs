const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'verify.log');
function log(msg) {
    fs.appendFileSync(logFile, (typeof msg === 'object' ? JSON.stringify(msg) : msg) + '\n');
}

// Clear log
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

log('Starting verification...');

const workerPath = path.resolve(__dirname, '../electron/aiWorker.cjs');
log('Worker path: ' + workerPath);

if (!fs.existsSync(workerPath)) {
    log('Worker file missing!');
    process.exit(1);
}

log('Spawning worker...');
const worker = new Worker(workerPath);
worker.on('error', (err) => log('WORKER ERROR: ' + err));
worker.on('exit', (code) => log('WORKER EXIT: ' + code));
worker.on('message', (msg) => log('WORKER MSG: ' + JSON.stringify(msg)));

const testNotes = [
    { id: '1', title: 'Grocery List', content: 'Milk, Eggs, Bread', tags: ['shopping'] },
    { id: '2', title: 'Project Ideas', content: 'Build a stickies app with AI', tags: ['dev'] },
    { id: '3', title: 'Meeting Notes', content: 'Discuss quarterly goals', tags: ['work'] }
];

const dbPath = path.join(__dirname, 'test-vectors.json');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

function send(type, payload) {
    const id = Math.random().toString(36).substring(7);
    return new Promise((resolve, reject) => {
        const listener = (msg) => {
            if (msg.id === id) {
                worker.off('message', listener);
                if (msg.error) reject(msg.error);
                else resolve(msg);
            }
        };
        worker.on('message', listener);
        worker.postMessage({ id, type, ...payload });
    });
}

async function runTest() {
    try {
        log('[1] Init...');
        await send('init', { dbPath });
        log('✅ Init done');

        log('[2] Indexing...');
        await send('index', { notes: testNotes });
        log('✅ Indexing done');

        log('[3] Searching for "food"...');
        const res1 = await send('search', { query: 'food', topK: 1 });
        log('Result 1: ' + JSON.stringify(res1.results));

        log('[4] Searching for "code"...');
        const res2 = await send('search', { query: 'app', topK: 1 });
        log('Result 2: ' + JSON.stringify(res2.results));

        log('[5] Cleanup...');
        worker.terminate();
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        log('✅ Test Complete');

    } catch (e) {
        log('❌ Test Failed: ' + e);
        worker.terminate();
        process.exit(1);
    }
}

runTest();