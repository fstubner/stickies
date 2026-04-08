import { net, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Generate a UUID v4 using Node's built-in crypto
function uuidv4(): string {
  return crypto.randomUUID();
}

export interface WebPageMetadata {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  image?: string;
  siteName?: string;
}

export interface ClipResult {
  success: boolean;
  metadata?: WebPageMetadata;
  thumbnailPath?: string;
  error?: string;
}

/**
 * Fetch metadata from a web page URL
 */
export async function fetchWebPageMetadata(url: string): Promise<WebPageMetadata> {
  return new Promise((resolve, reject) => {
    const request = net.request(url);
    let html = '';

    request.on('response', (response) => {
      // Check for redirect
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirectUrl = Array.isArray(response.headers.location)
          ? response.headers.location[0]
          : response.headers.location;
        fetchWebPageMetadata(redirectUrl).then(resolve).catch(reject);
        return;
      }

      response.on('data', (chunk) => {
        html += chunk.toString();
      });

      response.on('end', () => {
        try {
          const metadata = parseHtmlMetadata(html, url);
          resolve(metadata);
        } catch (err) {
          reject(err);
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    // Set timeout
    setTimeout(() => {
      request.abort();
      reject(new Error('Request timeout'));
    }, 10000);

    request.end();
  });
}

/**
 * Parse HTML to extract metadata
 */
function parseHtmlMetadata(html: string, url: string): WebPageMetadata {
  const metadata: WebPageMetadata = { url };

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    metadata.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Extract Open Graph metadata
  const ogTitle = extractMetaContent(html, 'og:title');
  const ogDescription = extractMetaContent(html, 'og:description');
  const ogImage = extractMetaContent(html, 'og:image');
  const ogSiteName = extractMetaContent(html, 'og:site_name');

  // Extract Twitter metadata as fallback
  const twitterTitle = extractMetaContent(html, 'twitter:title');
  const twitterDescription = extractMetaContent(html, 'twitter:description');
  const twitterImage = extractMetaContent(html, 'twitter:image');

  // Extract standard meta description
  const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

  // Use best available values
  metadata.title = ogTitle || twitterTitle || metadata.title;
  metadata.description = ogDescription || twitterDescription || (descriptionMatch ? decodeHtmlEntities(descriptionMatch[1]) : undefined);
  metadata.image = resolveUrl(ogImage || twitterImage, url);
  metadata.siteName = ogSiteName;

  // Extract favicon
  const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);

  if (faviconMatch) {
    metadata.favicon = resolveUrl(faviconMatch[1], url);
  } else {
    // Try default favicon location
    try {
      const urlObj = new URL(url);
      metadata.favicon = `${urlObj.origin}/favicon.ico`;
    } catch {
      // Invalid URL
    }
  }

  return metadata;
}

/**
 * Extract meta tag content by property or name
 */
function extractMetaContent(html: string, property: string): string | undefined {
  // Try property attribute
  const propMatch = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));

  if (propMatch) {
    return decodeHtmlEntities(propMatch[1]);
  }

  // Try name attribute
  const nameMatch = html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'));

  if (nameMatch) {
    return decodeHtmlEntities(nameMatch[1]);
  }

  return undefined;
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(relativeUrl: string | undefined, baseUrl: string): string | undefined {
  if (!relativeUrl) return undefined;

  try {
    // Already absolute
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }

    // Protocol-relative
    if (relativeUrl.startsWith('//')) {
      const base = new URL(baseUrl);
      return `${base.protocol}${relativeUrl}`;
    }

    // Relative
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return undefined;
  }
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Capture a thumbnail screenshot of a URL
 */
export async function captureThumbnail(url: string, outputPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    // Create a hidden browser window
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: {
        offscreen: true,
      },
    });

    let resolved = false;

    const cleanup = () => {
      if (!win.isDestroyed()) {
        win.destroy();
      }
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    }, 15000);

    win.webContents.on('did-finish-load', async () => {
      // Wait a bit for page to render
      await new Promise((r) => setTimeout(r, 1000));

      if (resolved) return;

      try {
        const image = await win.webContents.capturePage();
        const pngBuffer = image.toPNG();

        // Ensure output directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, pngBuffer);
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        resolve(outputPath);
      } catch (err) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        resolve(null);
      }
    });

    win.webContents.on('did-fail-load', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        resolve(null);
      }
    });

    win.loadURL(url).catch(() => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        resolve(null);
      }
    });
  });
}

/**
 * Clip a web page and return all metadata
 */
export async function clipWebPage(url: string, mediaPath: string, captureThumbnailImage = false): Promise<ClipResult> {
  try {
    // Fetch metadata
    const metadata = await fetchWebPageMetadata(url);

    let thumbnailPath: string | undefined;

    // Optionally capture thumbnail
    if (captureThumbnailImage) {
      const filename = `thumbnail-${uuidv4()}.png`;
      const outputPath = path.join(mediaPath, filename);
      const result = await captureThumbnail(url, outputPath);
      if (result) {
        thumbnailPath = result;
      }
    }

    return {
      success: true,
      metadata,
      thumbnailPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download favicon from URL
 */
export async function downloadFavicon(faviconUrl: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = net.request(faviconUrl);

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        resolve(false);
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const dir = path.dirname(outputPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(outputPath, buffer);
          resolve(true);
        } catch {
          resolve(false);
        }
      });
    });

    request.on('error', () => {
      resolve(false);
    });

    setTimeout(() => {
      request.abort();
      resolve(false);
    }, 5000);

    request.end();
  });
}
