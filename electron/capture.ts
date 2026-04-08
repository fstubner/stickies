import { clipboard, nativeImage, app, desktopCapturer, BrowserWindow, screen } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Generate a UUID v4 using Node's built-in crypto
function uuidv4(): string {
  return crypto.randomUUID();
}

export interface CaptureResult {
  type: 'text' | 'image' | 'url' | 'html';
  content: string;
  imagePath?: string;
  metadata?: {
    title?: string;
    url?: string;
    width?: number;
    height?: number;
  };
}

/**
 * Detect the type of content in the clipboard
 */
export function detectClipboardType(): 'image' | 'html' | 'url' | 'text' | 'empty' {
  // Check for image first
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    return 'image';
  }

  // Check for HTML
  const html = clipboard.readHTML();
  if (html && html.trim()) {
    return 'html';
  }

  // Check for text (could be URL)
  const text = clipboard.readText();
  if (text && text.trim()) {
    // Check if it's a URL
    try {
      const url = new URL(text.trim());
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return 'url';
      }
    } catch {
      // Not a valid URL
    }
    return 'text';
  }

  return 'empty';
}

/**
 * Capture content from clipboard
 */
export async function captureFromClipboard(mediaPath: string): Promise<CaptureResult | null> {
  const type = detectClipboardType();

  if (type === 'empty') {
    return null;
  }

  if (type === 'image') {
    return captureImage(mediaPath);
  }

  if (type === 'url') {
    const url = clipboard.readText().trim();
    return {
      type: 'url',
      content: url,
      metadata: { url },
    };
  }

  if (type === 'html') {
    const html = clipboard.readHTML();
    const text = clipboard.readText();
    return {
      type: 'html',
      content: text || stripHtml(html),
      metadata: {
        title: extractTitle(html),
      },
    };
  }

  // Plain text
  const text = clipboard.readText();
  return {
    type: 'text',
    content: text,
  };
}

/**
 * Capture image from clipboard and save to file
 */
export function captureImage(mediaPath: string): CaptureResult | null {
  const image = clipboard.readImage();
  if (image.isEmpty()) {
    return null;
  }

  // Ensure media directory exists
  if (!fs.existsSync(mediaPath)) {
    fs.mkdirSync(mediaPath, { recursive: true });
  }

  // Generate unique filename
  const filename = `capture-${uuidv4()}.png`;
  const filePath = path.join(mediaPath, filename);

  // Save image as PNG
  const pngBuffer = image.toPNG();
  fs.writeFileSync(filePath, pngBuffer);

  const size = image.getSize();

  return {
    type: 'image',
    content: `![Captured Image](${filename})`,
    imagePath: filePath,
    metadata: {
      width: size.width,
      height: size.height,
    },
  };
}

/**
 * Copy text to clipboard
 */
export function copyToClipboard(text: string): void {
  clipboard.writeText(text);
}

/**
 * Copy image to clipboard from file path
 */
export function copyImageToClipboard(imagePath: string): boolean {
  try {
    const image = nativeImage.createFromPath(imagePath);
    if (!image.isEmpty()) {
      clipboard.writeImage(image);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  // Basic HTML stripping - removes tags but keeps text
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string | undefined {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : undefined;
}

/**
 * Get the default media path for a workspace
 */
export function getDefaultMediaPath(workspaceId: string): string {
  const userData = app.getPath('userData');
  return path.join(userData, 'workspaces', workspaceId, 'media');
}

/**
 * Capture entire screen or specific region
 */
export async function captureScreen(mediaPath: string, region?: { x: number; y: number; width: number; height: number }): Promise<CaptureResult | null> {
  try {
    // Get all available sources (screens)
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (sources.length === 0) {
      console.error('[Capture] No screen sources available');
      return null;
    }

    // Use the primary display
    const primarySource = sources[0];
    const thumbnail = primarySource.thumbnail;

    if (thumbnail.isEmpty()) {
      console.error('[Capture] Screen thumbnail is empty');
      return null;
    }

    let finalImage = thumbnail;

    // If a region is specified, crop the image
    if (region) {
      finalImage = thumbnail.crop({
        x: Math.max(0, region.x),
        y: Math.max(0, region.y),
        width: Math.min(region.width, thumbnail.getSize().width - region.x),
        height: Math.min(region.height, thumbnail.getSize().height - region.y),
      });
    }

    // Ensure media directory exists
    if (!fs.existsSync(mediaPath)) {
      fs.mkdirSync(mediaPath, { recursive: true });
    }

    // Generate unique filename
    const filename = `screenshot-${uuidv4()}.png`;
    const filePath = path.join(mediaPath, filename);

    // Save image as PNG
    const pngBuffer = finalImage.toPNG();
    fs.writeFileSync(filePath, pngBuffer);

    const size = finalImage.getSize();

    return {
      type: 'image',
      content: `![Screenshot](${filename})`,
      imagePath: filePath,
      metadata: {
        width: size.width,
        height: size.height,
      },
    };
  } catch (error) {
    console.error('[Capture] Screen capture error:', error);
    return null;
  }
}

/**
 * Create a screen region selection overlay window
 */
export function createScreenshotSelectionWindow(): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const selectionWindow = new BrowserWindow({
      x: 0,
      y: 0,
      width,
      height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreen: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load HTML for selection UI
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 100vw;
            height: 100vh;
            cursor: crosshair;
            background: rgba(0, 0, 0, 0.3);
            overflow: hidden;
          }
          #selection {
            position: absolute;
            border: 2px solid #4a6fa5;
            background: rgba(74, 111, 165, 0.1);
            display: none;
          }
          #instructions {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div id="instructions">Click and drag to select area. Press Escape to cancel.</div>
        <div id="selection"></div>
        <script>
          let startX, startY, isSelecting = false;
          const selection = document.getElementById('selection');

          document.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
            isSelecting = true;
            selection.style.display = 'block';
            selection.style.left = startX + 'px';
            selection.style.top = startY + 'px';
            selection.style.width = '0';
            selection.style.height = '0';
          });

          document.addEventListener('mousemove', (e) => {
            if (!isSelecting) return;
            const currentX = e.clientX;
            const currentY = e.clientY;
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            selection.style.left = left + 'px';
            selection.style.top = top + 'px';
            selection.style.width = width + 'px';
            selection.style.height = height + 'px';
          });

          document.addEventListener('mouseup', (e) => {
            if (!isSelecting) return;
            isSelecting = false;
            const currentX = e.clientX;
            const currentY = e.clientY;
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            if (width > 10 && height > 10) {
              // Send selection back via console (will be captured by main process)
              console.log(JSON.stringify({ type: 'selection', x, y, width, height }));
            } else {
              console.log(JSON.stringify({ type: 'cancel' }));
            }
          });

          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              console.log(JSON.stringify({ type: 'cancel' }));
            }
          });
        </script>
      </body>
      </html>
    `;

    selectionWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Listen for console messages from the selection window
    selectionWindow.webContents.on('console-message', (_event, _level, message) => {
      try {
        const data = JSON.parse(message);
        selectionWindow.close();

        if (data.type === 'selection') {
          resolve({ x: data.x, y: data.y, width: data.width, height: data.height });
        } else {
          resolve(null);
        }
      } catch {
        // Ignore non-JSON messages
      }
    });

    // Handle window closed without selection
    selectionWindow.on('closed', () => {
      resolve(null);
    });
  });
}

/**
 * Capture a screen region with interactive selection
 */
export async function captureScreenRegion(mediaPath: string): Promise<CaptureResult | null> {
  // Show selection overlay
  const region = await createScreenshotSelectionWindow();

  if (!region) {
    return null;
  }

  // Small delay to let the selection window close
  await new Promise(r => setTimeout(r, 100));

  // Capture the selected region
  return captureScreen(mediaPath, region);
}
