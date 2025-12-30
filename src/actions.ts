import { Page } from 'puppeteer';
import { createCursor } from 'ghost-cursor';

// Random integer helper
export const randomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Sleep helper
export const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export class ActionSimulator {

    static async humanScroll(page: Page) {
        try {
            const height = await page.evaluate(() => document.body.scrollHeight);
            let currentScroll = 0;
            const viewportHeight = await page.evaluate(() => window.innerHeight);

            // Continue until we reach near bottom or decide to stop
            while (currentScroll < height - viewportHeight) {
                // Determine 'scroll session' type: slow read, fast skim, or pause
                const actionType = Math.random();

                if (actionType < 0.1) {
                    // LONG PAUSE (Reading)
                    await sleep(randomInt(2000, 5000));
                } else if (actionType < 0.3) {
                    // SCROLL UP (Re-reading)
                    const scrollBack = randomInt(100, 300);
                    currentScroll = Math.max(0, currentScroll - scrollBack);
                    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), currentScroll);
                    await sleep(randomInt(500, 1500));
                } else {
                    // SCROLL DOWN (Variable speed)
                    // We scroll in small "ticks" to simulate a wheel or swipe
                    const scrollAmount = randomInt(200, 600);
                    const ticks = randomInt(5, 12);
                    const delta = scrollAmount / ticks;

                    for (let i = 0; i < ticks; i++) {
                        currentScroll += delta;
                        await page.evaluate((y) => window.scrollTo(0, y), currentScroll);
                        // Very short sleep between ticks for "smooth" feel but not instant
                        await sleep(randomInt(10, 50));
                    }

                    // Pause after a scroll burst
                    await sleep(randomInt(500, 2000));
                }

                // Breaking condition: random stop if deep enough (70% down)
                if (currentScroll > height * 0.7 && Math.random() > 0.8) {
                    break;
                }
            }
        } catch (e) {
            console.error('Error during scroll interaction:', e);
        }
    }

    static async simulateReading(page: Page) {
        // Move mouse around randomly to simulate reading/focus
        const cursor = createCursor(page);
        try {
            // Move to random points
            for (let i = 0; i < randomInt(3, 7); i++) {
                await cursor.moveTo({
                    x: randomInt(100, 1000),
                    y: randomInt(100, 800)
                });
                await sleep(randomInt(500, 2000));
            }
        } catch (e) {
            console.error('Error during reading simulation:', e);
        }
    }

    static async interactWithElements(page: Page) {
        const cursor = createCursor(page);
        try {
            // Find ALL clickable elements
            const candidates = await page.$$('a[href], button, [role="button"], input[type="submit"]');

            if (candidates.length === 0) return;

            // Pick a qualified candidate (visible and in viewport ideally)
            // For simplicity, we pick random from first 15 (usually header/nav/hero)
            // or random from entire set.
            const index = randomInt(0, Math.min(candidates.length - 1, 30));
            const element = candidates[index];

            if (element) {
                // MOVE to it first (hover)
                await cursor.move(element);
                await sleep(randomInt(300, 1000));

                // 40% chance to just hover and NOT click (like reading a tooltip)
                if (Math.random() > 0.4) {
                    // Click logic
                    // Ensure we don't click navigation that takes us out immediately often
                    await cursor.click(element);

                    // If we navigated, that's good! It increases session depth.
                    // We just wait a bit to simulate processing the new page.
                    await sleep(randomInt(2000, 5000));
                }
            }
        } catch (e) {
            console.error('Error during interaction:', e);
        }
    }

    static async fillForms(page: Page) {
        const cursor = createCursor(page);
        try {
            const inputs = await page.$$('input[type="text"], input[type="email"], textarea');
            for (const input of inputs) {
                if (Math.random() > 0.5) { // 50% chance to fill a field
                    await cursor.click(input);
                    await sleep(randomInt(500, 1000));
                    await page.keyboard.type('Hello World', { delay: randomInt(50, 150) });
                    await sleep(randomInt(500, 1000));
                }
            }
        } catch (e) {
            console.error('Error filling form:', e);
        }
    }

    static async playVideo(page: Page) {
        try {
            // Attempt to click play buttons on videos
            const videos = await page.$$('video, .play-button, [aria-label="Play"]');
            for (const video of videos) {
                await video.click();
                await sleep(randomInt(5000, 15000)); // Watch for a bit
            }
        } catch (e) {
            console.error('Error playing video:', e);
        }
    }
}
