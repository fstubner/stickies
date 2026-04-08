const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'visual.log');
function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

async function run() {
    log('🤖 Bot executing visual verification...');
    const browser = await chromium.launch({ headless: true }); // Headless to work in background
    const page = await browser.newPage();

    try {
        log('➡️ Navigating to http://localhost:3001');
        await page.goto('http://localhost:3001');

        // 1. Handle Onboarding
        try {
            const skipBtn = page.getByRole('button', { name: 'Skip Setup' });
            if (await skipBtn.isVisible({ timeout: 2000 })) {
                await skipBtn.click();
                log('✅ Clicked "Skip Setup"');
            }
        } catch (e) {}

        await page.waitForSelector('.app-shell', { timeout: 10000 });
        log('✅ App Shell Loaded');

        // 2. Open Search (Cmd+K)
        await page.keyboard.press('Control+k');
        await page.waitForSelector('.search-overlay', { timeout: 2000 });
        log('✅ Search Overlay Opened via Ctrl+K');

        // 3. Close Search (Best effort)
        await page.keyboard.press('Escape');
        try {
             await page.locator('.search-overlay').waitFor({ state: 'hidden', timeout: 2000 });
             log('✅ Search Overlay Closed via Escape');
        } catch (e) {
             log('⚠️ Could not close overlay with Escape. Reloading page to reset state...');
             await page.reload();
             try {
                const skipBtn = page.getByRole('button', { name: 'Skip Setup' });
                if (await skipBtn.isVisible({ timeout: 5000 })) {
                    await skipBtn.click();
                    log('✅ Clicked "Skip Setup" (After Reload)');
                }
             } catch (e) {}
             await page.waitForSelector('.app-shell', { timeout: 10000 });
             log('✅ Page Reloaded & Shell Visible');
        }

        // 4. Create Note (assuming standard shortcut or button)
        // Let's try the "+" button if it exists, or Ctrl+N
        const newNoteBtn = page.getByLabel('New Sticky Note').or(page.locator('.new-note-btn'));
        if (await newNoteBtn.isVisible()) {
             await newNoteBtn.click();
             log('✅ Clicked "New Note" UI button');
        } else {
             await page.keyboard.press('Control+n');
             log('✅ Used Shortcut Ctrl+N to create note');
        }

        // Wait for a note to appear
        // Assuming class .sticky-note or similar
        const note = page.locator('.sticky-note, .note, article').first();
        await note.waitFor({ state: 'visible', timeout: 5000 });
        log('✅ Visual Note Element Detected');

        // 5. Type in note
        // Click inside the content
        await note.click();
        await page.keyboard.type('Hello User! AI verification complete.');
        log('✅ Typed text into note');

        // Verify text exists
        const content = await note.textContent();
        if (content.includes('Hello User')) {
            log('✅ Text verification PASSED: Note contains typed text.');
        } else {
            log('❌ Text verification FAILED: Content mismatch.');
        }

    } catch (error) {
        log('❌ Verification Bot Failed: ' + error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

run();