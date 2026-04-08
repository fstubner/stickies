import { app, ipcMain } from 'electron';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
// Type used by worker but imported here for reference
// import type { AiWorkerMessage } from '../types/shared';

export class AiController {
    private worker: Worker | null = null;
    private static instance: AiController;

    private constructor() {}

    public static getInstance(): AiController {
        if (!AiController.instance) {
            AiController.instance = new AiController();
        }
        return AiController.instance;
    }

    public async initialize(): Promise<void> {
        const workerPath = path.join(__dirname, 'aiWorker.cjs');
        const aiDataDir = path.join(app.getPath('userData'), 'ai_data');

        try {
            const stat = await fs.promises.stat(aiDataDir);
            if (!stat.isDirectory()) {
                 await fs.promises.mkdir(aiDataDir, { recursive: true });
            }
        } catch(err: any){
            if(err.code === 'ENOENT') {
                await fs.promises.mkdir(aiDataDir, { recursive: true });
            }
        }

        try {
            console.log('[AI Controller] Starting worker from:', workerPath);
            this.worker = new Worker(workerPath);
            this.worker.on('error', (err) => console.error('[AI Worker Error]', err));
            this.worker.on('exit', (code) => console.log(`[AI Worker] Exited with code ${code}`));

            // Init
            await this.request('init', { dbPath: path.join(aiDataDir, 'vectors.json') });
            console.log('[AI Controller] Worker initialized');

            this.registerHandlers();

        } catch (error) {
            console.error('[AI Controller] Failed to start worker:', error);
        }
    }

    public terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    public getHealth(): string {
        return this.worker ? 'ok' : 'down';
    }

    // Generic request wrapper
    private request(type: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                resolve(null);
                return;
            }
            const id = Math.random().toString(36).substring(7);
            const msg: any = { id, type, ...payload };

            const listener = (response: any) => {
                if (response.id === id) {
                    this.worker?.off('message', listener);
                    if (response.error) reject(response.error);
                    else resolve(response);
                }
            };
            this.worker.on('message', listener);
            this.worker.postMessage(msg);

            // Timeout
            setTimeout(() => {
                this.worker?.off('message', listener);
                resolve(null);
            }, 10000);
        });
    }

    private registerHandlers(): void {
        ipcMain.handle('ai-health', () => ({ status: this.getHealth() }));

        ipcMain.handle('ai-index', async (_event, notes) => {
            return this.request('index', { notes });
        });

        ipcMain.handle('ai-search', async (_event, { query, topK }) => {
            const res = await this.request('search', { query, topK });
            return res?.results || [];
        });

        ipcMain.handle('ai-delete', async (_event, ids) => {
            await this.request('delete', { ids });
        });

        ipcMain.handle('ai-answer', async (_event, { query, ids: _ids }) => {
            // 1. Search for relevant notes
            const searchRes = await this.request('search', { query, topK: 3 });
            const results = searchRes?.results || [];

            if (results.length === 0) return { answer: "No relevant notes found." };

            // 2. Read context from disk
            const notesDir = path.join(app.getPath('userData'), 'notes');
            let context = "";

            for (const res of results) {
                try {
                    const notePath = path.join(notesDir, `${res.id}.md`);
                    try {
                        const stat = await fs.promises.stat(notePath);
                        if (stat.isFile()) {
                            const content = await fs.promises.readFile(notePath, 'utf8');
                            // Simple frontmatter removal (or use regex)
                            const cleanContent = content.replace(/^---[\s\S]*?---\n/, '');
                            context += `Note: ${res.title}\nContent: ${cleanContent.slice(0, 500)}...\n\n`; // Limit context window
                        }
                    } catch (err: any) {
                        if (err.code !== 'ENOENT') throw err;
                    }
                } catch (e) { console.error('Error reading note for context', e); }
            }

            // 3. Generate Answer
            const prompt = `Question: ${query}\n\nContext:\n${context}\n\nAnswer:`;
            const genRes = await this.request('generate', { prompt });

            return {
                answer: genRes?.text || "Failed to generate answer.",
                sources: results.map((r: any) => ({ id: r.id, title: r.title }))
            };
        });

        ipcMain.handle('ai-find-similar', async (_event, { noteId, topK }) => {
            const res = await this.request('find-similar', { noteId, topK });
            return res?.results || [];
        });

        ipcMain.handle('ai-suggest-tags', async (_event, { content, existingTagIds }) => {
            const res = await this.request('suggest-tags', { content, existingTagIds });
            return res?.similarNoteIds || [];
        });

        console.log('[AI Controller] IPC handlers registered');
    }
}
