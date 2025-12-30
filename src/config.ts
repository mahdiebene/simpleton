export const config = {
    // Memory limit in MB. The bot should try to stay below this.
    // Note: This is soft limit enforcement via forced garbage collection or restart.
    MAX_MEMORY_MB: 450,

    // Concurrency: 1 browser instance to save RAM
    CONCURRENCY: 1,

    // Time ranges in milliseconds
    SHORT_VISIT_MIN: 3000,   // 3s
    SHORT_VISIT_MAX: 7000,   // 7s

    LONG_VISIT_MIN: 60000,   // 1m
    LONG_VISIT_MAX: 180000,  // 3m

    EXTRA_LONG_VISIT_MIN: 300000, // 5m
    EXTRA_LONG_VISIT_MAX: 600000, // 10m

    // Dimensions for the browser window
    VIEWPORT: {
        width: 1366,
        height: 768
    },

    // Resources to block to save bandwidth/memory
    // Resources to block (Minimal blocking to pass detection)
    // Blocking images/fonts is a high-risk bot signal. 
    // We only block heavy media (video) or beacons.
    BLOCKED_RESOURCES: [
        'media',
        'csp_report'
    ],

    // Common referrers to masquerade traffic source
    REFERRERS: [
        'https://www.google.com/',
        'https://www.bing.com/',
        'https://duckduckgo.com/',
        'https://www.facebook.com/',
        'https://t.co/', // Twitter shortener
        'https://www.reddit.com/',
        'https://www.linkedin.com/'
    ],

    // Proxy URL (e.g., http://user:pass@host:port)
    PROXY_URL: process.env.PROXY_URL || ''
};
