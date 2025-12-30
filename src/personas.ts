export interface Persona {
    userAgent: string;
    locale: string;
    platform: string;
    vendor: string;
    renderer: string;
    viewport: { width: number, height: number };
}

const commonResolutions = [
    { width: 1920, height: 1080 }, // FHD
    { width: 1366, height: 768 },  // HD
    { width: 1440, height: 900 },  // Mac common
    { width: 1536, height: 864 },  // Surface/Modern laptops
    { width: 2560, height: 1440 }  // 2K
];

// Helper to generate personas with version variations to ensure uniqueness
export const generatePersonas = (count: number): Persona[] => {
    const personas: Persona[] = [];
    const baseUAs = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{ver}.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{ver}.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{ver}.0.0.0 Safari/537.36"
    ];

    for (let i = 0; i < count; i++) {
        const base = baseUAs[i % baseUAs.length];
        // Generate a random version between 115 and 121
        const majorVer = 115 + (i % 7);
        const minorVer = Math.floor(Math.random() * 1000);

        const ua = base.replace('{ver}', `${majorVer}.0.${minorVer}`);

        const isMac = ua.includes('Macintosh');
        const isWindows = ua.includes('Windows');

        // Randomized viewport
        let viewport = commonResolutions[Math.floor(Math.random() * commonResolutions.length)];
        if (isMac && Math.random() > 0.6) {
            viewport = { width: 1440, height: 900 };
        }

        personas.push({
            userAgent: ua,
            locale: 'en-US',
            platform: isMac ? 'MacIntel' : (isWindows ? 'Win32' : 'Linux x86_64'),
            vendor: 'Google Inc.',
            renderer: 'Intel Iris OpenGL Engine',
            viewport: viewport
        });
    }
    return personas;
};

// Generating 60 unique personas
export const PERSONAS = generatePersonas(60);
