import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page, Browser } from 'puppeteer';
import { config } from './config';
import { PERSONAS, Persona } from './personas';
import { ActionSimulator, sleep, randomInt } from './actions';
import * as winston from 'winston';

puppeteer.use(StealthPlugin());

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'bot.log' })
    ]
});

// @ts-ignore
import express from 'express';
// @ts-ignore
import cors from 'cors';

const app = express();
app.use(cors());

// State interface
interface BotState {
    status: 'idle' | 'running' | 'resting' | 'stopped';
    currentUrl: string | null;
    memoryUsage: number;
    totalVisits: number;
    startTime: Date;
    currentPersona: Persona | null;
    lastScreenshot: string | null;
}

export class BotEngine {
    private browser: Browser | null = null;
    private persona: Persona;
    private state: BotState;

    constructor() {
        // Pick a random persona for this session
        this.persona = PERSONAS[randomInt(0, PERSONAS.length - 1)];
        this.state = {
            status: 'idle',
            currentUrl: null,
            memoryUsage: 0,
            totalVisits: 0,
            startTime: new Date(),
            currentPersona: this.persona,
            lastScreenshot: null
        };

        this.startServer();
    }

    private startServer() {
        app.get('/status', (req, res) => {
            res.json({
                ...this.state,
                uptime: Math.floor((new Date().getTime() - this.state.startTime.getTime()) / 1000)
            });
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            logger.info(`Dashboard API running on port ${PORT}`);
        });
    }

    private async checkMemory() {
        const memoryUsage = process.memoryUsage();
        const usedMB = Math.round(memoryUsage.rss / 1024 / 1024);
        this.state.memoryUsage = usedMB;
        logger.info(`Memory Usage: ${usedMB} MB`);
        if (usedMB > config.MAX_MEMORY_MB) {
            logger.warn('Memory limit exceeded! Restarting browser...');
            await this.closeBrowser();
        }
    }

    private async initBrowser() {
        if (this.browser) return;

        logger.info('Launching browser with persona:', this.persona.userAgent);
        this.browser = await puppeteer.launch({
            headless: true, // Headless for Render deployment
            args: [
                '--start-maximized',
                '--disable-blink-features=AutomationControlled',
                `--user-agent=${this.persona.userAgent}`,
                `--window-size=${this.persona.viewport.width},${this.persona.viewport.height}`,
                ...(config.PROXY_URL ? [`--proxy-server=${config.PROXY_URL}`] : [])
            ]
        });
    }

    private async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async visit(url: string, durationType: 'short' | 'long' | 'extra_long' = 'short') {
        try {
            await this.checkMemory();
            await this.initBrowser();

            if (!this.browser) return;

            const context = this.browser.defaultBrowserContext();
            // Permissions override if needed
            await context.overridePermissions(url, ['geolocation']);

            const page = await this.browser.newPage();

            // Set extra headers and viewport
            await page.setViewport(this.persona.viewport);

            // Spoof Referrer to look like organic traffic
            const referer = config.REFERRERS[randomInt(0, config.REFERRERS.length - 1)];
            await page.setExtraHTTPHeaders({
                'Accept-Language': this.persona.locale,
                'Referer': referer
            });

            // SPOOFING: Inject properties before page loads
            await page.evaluateOnNewDocument((persona: any) => {
                // Navigator Overrides
                Object.defineProperty(navigator, 'platform', { get: () => persona.platform });
                Object.defineProperty(navigator, 'vendor', { get: () => persona.vendor });
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => persona.hardwareConcurrency });
                Object.defineProperty(navigator, 'deviceMemory', { get: () => persona.deviceMemory });

                // WebGL Override
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function (parameter) {
                    // 37445 = UNMASKED_VENDOR_WEBGL
                    // 37446 = UNMASKED_RENDERER_WEBGL
                    if (parameter === 37445) return 'Google Inc. (Intel)';
                    if (parameter === 37446) return persona.renderer;
                    return getParameter.apply(this, [parameter]);
                };
            }, this.persona);

            // Block heavy resources (Minimal)
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (config.BLOCKED_RESOURCES.includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            this.state.status = 'running';
            this.state.currentUrl = url;
            this.state.totalVisits++;

            logger.info(`Visiting ${url}...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Behavior actions
            await ActionSimulator.simulateReading(page);
            await ActionSimulator.humanScroll(page);

            // Interaction cycle
            if (Math.random() > 0.7) await ActionSimulator.fillForms(page);
            if (Math.random() > 0.7) await ActionSimulator.playVideo(page);
            if (Math.random() > 0.5) await ActionSimulator.interactWithElements(page);

            let visitTime;
            if (durationType === 'short') {
                visitTime = randomInt(config.SHORT_VISIT_MIN, config.SHORT_VISIT_MAX);
            } else if (durationType === 'long') {
                visitTime = randomInt(config.LONG_VISIT_MIN, config.LONG_VISIT_MAX);
            } else {
                visitTime = randomInt(config.EXTRA_LONG_VISIT_MIN, config.EXTRA_LONG_VISIT_MAX);
            }

            logger.info(`Staying for ${visitTime / 1000} seconds...`);
            await sleep(visitTime);

            // Screenshot for verification if needed
            if (url.includes('sannysoft')) {
                const path = 'sannysoft_result.png';
                await page.screenshot({ path, fullPage: true });
                this.state.lastScreenshot = path;
                logger.info('Screenshot saved: sannysoft_result.png');
            }

            await page.close();

            // Random rest after visit
            this.state.status = 'resting';
            this.state.currentUrl = null;
            const restTime = randomInt(2000, 10000);
            logger.info(`Resting for ${restTime / 1000} seconds...`);
            await sleep(restTime);

        } catch (error) {
            logger.error(`Error visiting ${url}:`, error);
            // If critical error, restart browser
            await this.closeBrowser();
        }
    }

    async start(targets: string[]) {
        // Run continuously
        while (true) {
            for (const url of targets) {
                // Randomly decide duration
                // 80% Short (3-7s), 15% Long (1-3m), 5% Extra Long (5-10m)
                const rand = Math.random();
                let durationType: 'short' | 'long' | 'extra_long' = 'short';

                if (rand > 0.95) {
                    durationType = 'extra_long'; // Top 5%
                } else if (rand > 0.80) {
                    durationType = 'long';       // Next 15%
                } else {
                    durationType = 'short';      // Bottom 80%
                }

                await this.visit(url, durationType);

                // Check memory again at top level 
                await this.checkMemory();
            }
        }
    }
}

// Entry point for testing
if (require.main === module) {
    const bot = new BotEngine();
    // Example targets
    bot.start([
        'https://www.effectivegatecpm.com/j7zbnug3?key=6d61e432f43f295a3df95b127be03643'
    ]);
}
