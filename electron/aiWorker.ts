// AI Worker for running heavy computations
// Uses @xenova/transformers for local embeddings

import { pipeline } from '@xenova/transformers';

let embeddingPipeline: any = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, data } = event.data;

  try {
    if (type === 'EMBED_TEXT') {
      if (!embeddingPipeline) {
        embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      }
      const embedding = await embeddingPipeline(data.text, {
        pooling: 'mean',
        normalize: true,
      });
      self.postMessage({ type: 'EMBED_TEXT_RESULT', embedding });
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
};
