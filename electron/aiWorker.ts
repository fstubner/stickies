import { parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as crypto from 'crypto';
import type {
    VectorStore,
    AiWorkerMessage,
    AiSearchResult
} from '../types/shared.d';

// Dynamically imported modules (ESM compatibility)
let pipeline: any = null;
let env: any = null;

const modelName = 'Xenova/all-MiniLM-L6-v2';

let extractor: any = null;
let generator: any = null;
let vectorStore: VectorStore = {};
let dbPath: string = ''; // base path, e.g. .../ai_data/vectors (no extension)

/**
 * Dynamically load @xenova/transformers (ESM module)
 * Uses Function constructor to prevent TypeScript from transforming the import
 */
async function loadTransformers(): Promise<void> {
    if (pipeline && env) return;

    try {
        // Use Function constructor to create a true dynamic import
        // that TypeScript won't transform to require()
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const transformers = await dynamicImport('@xenova/transformers');
        pipeline = transformers.pipeline;
        env = transformers.env;

        // Skip local model checks for speed if possible
        env.allowLocalModels = false;
        console.log('[AI Worker] Transformers loaded successfully');
    } catch (error) {
        console.error('[AI Worker] Failed to load transformers:', error);
        throw error;
    }
}

// Derived paths for binary persistence
function getMetaPath(): string {
    return dbPath.replace(/\.json$/, '') + '.meta.json';
}
function getBinPath(): string {
    return dbPath.replace(/\.json$/, '') + '.bin';
}
// Legacy path for migration
function getLegacyPath(): string {
    return dbPath;
}

/**
 * Hash note content for incremental indexing
 */
function hashContent(title: string, content: string, tags: string[]): string {
    return crypto.createHash('sha256')
        .update(`${title}\n${content}\n${tags.join(' ')}`)
        .digest('hex');
}

/**
 * Legacy cosine similarity for mixed types
 */
function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

/**
 * Save vector store in binary format for compact storage and fast loading
 * - vectors.meta.json: small JSON with id -> {title, contentHash}
 * - vectors.bin: packed binary with Float32Array vectors
 */
async function saveVectorStore(): Promise<void> {
    if (!dbPath) return;

    const metaPath = getMetaPath();
    const binPath = getBinPath();

    try {
        // Metadata (small, fast to parse)
        const meta: Record<string, { title: string; contentHash: string }> = {};
        for (const [id, item] of Object.entries(vectorStore)) {
            meta[id] = { title: item.title, contentHash: item.contentHash || '' };
        }
        await fs.promises.writeFile(metaPath, JSON.stringify(meta));

        // Binary vectors (compact, fast to load)
        const entries = Object.entries(vectorStore);
        const buffers: Buffer[] = [];
        const header = Buffer.alloc(4);
        header.writeUInt32LE(entries.length);
        buffers.push(header);

        for (const [id, item] of entries) {
            const idBuf = Buffer.from(id, 'utf8');
            const idLen = Buffer.alloc(2);
            idLen.writeUInt16LE(idBuf.length);
            const vec = item.vector instanceof Float32Array
                ? item.vector
                : new Float32Array(item.vector);
            const vecBuf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
            const vecLen = Buffer.alloc(2);
            vecLen.writeUInt16LE(vec.length);
            buffers.push(idLen, idBuf, vecLen, vecBuf);
        }

        await fs.promises.writeFile(binPath, Buffer.concat(buffers));

        // Remove legacy JSON file if it exists
        const legacyPath = getLegacyPath();
        if (fs.existsSync(legacyPath) && legacyPath.endsWith('.json')) {
            try { await fs.promises.unlink(legacyPath); } catch {}
        }
    } catch (error) {
        console.error('[AI Worker] Failed to save vector store:', error);
    }
}

/**
 * Load vector store from binary format, with fallback to legacy JSON
 */
async function loadVectorStore(): Promise<void> {
    const metaPath = getMetaPath();
    const binPath = getBinPath();

    // Try binary format first
    if (fs.existsSync(metaPath) && fs.existsSync(binPath)) {
        try {
            const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
            const bin = await fs.promises.readFile(binPath);
            let offset = 0;

            if (bin.length < 4) return;
            const count = bin.readUInt32LE(offset);
            offset += 4;

            for (let i = 0; i < count; i++) {
                if (offset + 2 > bin.length) break;
                const idLen = bin.readUInt16LE(offset); offset += 2;
                if (offset + idLen > bin.length) break;
                const id = bin.toString('utf8', offset, offset + idLen); offset += idLen;
                if (offset + 2 > bin.length) break;
                const vecLen = bin.readUInt16LE(offset); offset += 2;
                const vecByteLen = vecLen * 4;
                if (offset + vecByteLen > bin.length) break;

                // Copy the buffer slice to avoid alignment issues
                const vecCopy = Buffer.alloc(vecByteLen);
                bin.copy(vecCopy, 0, offset, offset + vecByteLen);
                const vector = Array.from(new Float32Array(vecCopy.buffer, vecCopy.byteOffset, vecLen));
                offset += vecByteLen;

                vectorStore[id] = {
                    id,
                    title: meta[id]?.title || '',
                    contentHash: meta[id]?.contentHash || '',
                    vector,
                };
            }

            console.log(`[AI Worker] Loaded ${Object.keys(vectorStore).length} vectors from binary store`);
            return;
        } catch (e) {
            console.error('[AI Worker] Failed to load binary vector store, trying legacy:', e);
        }
    }

    // Fallback to legacy JSON
    const legacyPath = getLegacyPath();
    if (fs.existsSync(legacyPath)) {
        try {
            const parsed = JSON.parse(await fs.promises.readFile(legacyPath, 'utf8')) as VectorStore;
            // Migrate: add empty contentHash if missing
            for (const [id, item] of Object.entries(parsed)) {
                vectorStore[id] = {
                    ...item,
                    contentHash: (item as any).contentHash || '',
                };
            }
            console.log(`[AI Worker] Migrated ${Object.keys(vectorStore).length} vectors from legacy JSON`);
            // Save in new format immediately
            await saveVectorStore();
        } catch (e) {
            console.error('[AI Worker] Failed to load legacy vector store:', e);
        }
    }
}

parentPort?.on('message', async (msg: AiWorkerMessage) => {
    const { id, type } = msg; // Request ID for correlation
    try {
        if (type === 'init') {
            dbPath = msg.dbPath;
            await loadVectorStore();

            // Load transformers dynamically (ESM module)
            await loadTransformers();

            // Lazy load model
            if (!extractor && pipeline) {
                extractor = await pipeline('feature-extraction', modelName);
            }
            parentPort?.postMessage({ id, type: 'init-done' });
        } else if (type === 'index') {
            await loadTransformers();
            if (!extractor && pipeline) extractor = await pipeline('feature-extraction', modelName);

            const { notes } = msg;
            let indexed = 0;
            let skipped = 0;

            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                const text = `${note.title || ''}\n${note.content || ''}\n${(note.tags || []).join(' ')}`;
                const hash = hashContent(note.title || '', note.content || '', note.tags || []);

                // Skip if content unchanged (incremental indexing)
                if (vectorStore[note.id]?.contentHash === hash) {
                    skipped++;
                    continue;
                }

                const output = await extractor(text, { pooling: 'mean', normalize: true });
                vectorStore[note.id] = {
                    id: note.id,
                    title: note.title,
                    contentHash: hash,
                    vector: Array.from(output.data),
                };
                indexed++;

                // Report progress for long operations
                if (notes.length > 5) {
                    parentPort?.postMessage({
                        id,
                        type: 'progress',
                        current: i + 1,
                        total: notes.length,
                    });
                }
            }

            // Save to disk
            await saveVectorStore();
            parentPort?.postMessage({ id, type: 'index-done', count: indexed, skipped });

        } else if (type === 'search') {
            await loadTransformers();
            if (!extractor && pipeline) extractor = await pipeline('feature-extraction', modelName);

            const { query, topK = 5 } = msg;
            const output = await extractor(query, { pooling: 'mean', normalize: true });
            const queryVec = new Float32Array(output.data);

            const results: AiSearchResult[] = Object.values(vectorStore)
                .map((item) => ({
                    id: item.id,
                    title: item.title,
                    score: cosineSimilarity(queryVec, item.vector)
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);

            parentPort?.postMessage({ id, type: 'search-results', results });

        } else if (type === 'generate') {
            await loadTransformers();
            // Raw generation
            if (!generator && pipeline) {
                generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-78M');
            }
            const { prompt } = msg as any;
            const output = await generator(prompt, { max_new_tokens: 200 });
            parentPort?.postMessage({ id, type, text: output[0].generated_text });
        } else if (type === 'find-similar') {
            // Find notes similar to a given note
            const { noteId, topK = 5 } = msg as any;
            const sourceNote = vectorStore[noteId];

            if (!sourceNote || !sourceNote.vector) {
                parentPort?.postMessage({ id, type, results: [] });
                return;
            }

            const results: AiSearchResult[] = Object.values(vectorStore)
                .filter((item) => item.id !== noteId) // Exclude the source note
                .map((item) => ({
                    id: item.id,
                    title: item.title,
                    score: cosineSimilarity(sourceNote.vector, item.vector)
                }))
                .filter((item) => item.score > 0.3) // Only include reasonably similar notes
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);

            parentPort?.postMessage({ id, type, results });

        } else if (type === 'suggest-tags') {
            await loadTransformers();
            // Suggest tags based on note content similarity to existing tagged notes
            if (!extractor && pipeline) extractor = await pipeline('feature-extraction', modelName);

            const { content } = msg as any;

            // Get embedding for the content
            const output = await extractor(content, { pooling: 'mean', normalize: true });
            const contentVec = new Float32Array(output.data);

            // Find similar notes and collect their tags
            const similarNotes = Object.values(vectorStore)
                .map((item) => ({
                    id: item.id,
                    title: item.title,
                    score: cosineSimilarity(contentVec, item.vector)
                }))
                .filter((item) => item.score > 0.4)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);

            // Return the note IDs so the renderer can look up their tags
            parentPort?.postMessage({
                id,
                type: 'suggest-tags-results',
                similarNoteIds: similarNotes.map((n) => n.id)
            });
        }
    } catch (error: any) {
        console.error('AI Worker Error:', error);
        parentPort?.postMessage({ id, type: 'error', error: error.message });
    }
});
