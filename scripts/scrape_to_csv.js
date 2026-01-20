const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_FILE = path.join(__dirname, '../data/products.csv');
const CATEGORIES = [
    { query: 'trending amazon finds', category: 'Latest', limit: 15 },
    { query: 'best electronics gadgets', category: 'Electronics', limit: 15 },
    { query: 'home kitchen essentials', category: 'Home', limit: 15 },
    { query: 'latest fashion trends clothing', category: 'Fashion', limit: 15 },
    { query: 'trending beauty personal care', category: 'Beauty', limit: 15 },
    { query: 'health household best sellers', category: 'Health', limit: 15 }
];

// User-Agent Rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomHeaders() {
    return {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
    };
}

async function fetchAmazonPage(url) {
    try {
        const headers = getRandomHeaders();
        const response = await axios.get(url, { headers, timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error.message);
        return null; // Handle gracefully
    }
}

const scrapeCategory = async (query, category, limit) => {
    console.log(`[Scraper] Starting: ${category} (${query})...`);
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
    const html = await fetchAmazonPage(searchUrl);

    if (!html || html.includes('api-services-support@amazon.com')) {
        console.warn(`[Scraper] Blocked/Failed for ${category}.`);
        return [];
    }

    const $ = cheerio.load(html);
    let count = 0;
    const items = [];

    $('.s-result-item[data-asin]').each((i, el) => {
        if (count >= limit) return;

        const asin = $(el).attr('data-asin');
        if (!asin) return;

        const title = $(el).find('h2 span').text().trim() || $(el).find('.a-text-normal').first().text().trim();
        
        let priceRaw = $(el).find('.a-price .a-offscreen').first().text().trim();
        if (!priceRaw) {
             const priceWhole = $(el).find('.a-price-whole').first().text().trim();
             const priceFraction = $(el).find('.a-price-fraction').first().text().trim();
             if (priceWhole) {
                 priceRaw = `${priceWhole}.${priceFraction || '00'}`;
             }
        }

        let price = ''; 
        if (priceRaw) {
             const cleanPrice = priceRaw.replace(/[^\d.]/g, '');
             const p = parseFloat(cleanPrice);
             if (!isNaN(p)) price = p;
        }

        const image = $(el).find('.s-image').attr('src');
        let link = $(el).find('a.a-link-normal').first().attr('href');
        if (link && !link.startsWith('http')) link = 'https://www.amazon.com' + link;

        if (title && image) {
            items.push({
                asin,
                title,
                price,
                image,
                url: link,
                category,
                isBestSeller: i < 3 ? 'true' : 'false'
            });
            count++;
        }
    });

    console.log(`[Scraper] Found ${items.length} items for ${category}`);
    return items;
};

// CSV Helper
function escapeCsv(str) {
    if (str === null || str === undefined) return '';
    const stringValue = String(str);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

const generateCsv = async () => {
    console.log('--- STARTING BULK SCRAPE ---');
    let allItems = [];

    for (const section of CATEGORIES) {
        const items = await scrapeCategory(section.query, section.category, section.limit);
        allItems = [...allItems, ...items];
        // Polite delay
        await new Promise(r => setTimeout(r, 2000));
    }

    // CSV Header
    let csvContent = "asin,title,price,image,url,category,isBestSeller\n";

    // CSV Rows
    allItems.forEach(item => {
        const row = [
            item.asin,
            item.title,
            item.price,
            item.image,
            item.url,
            item.category,
            item.isBestSeller
        ].map(escapeCsv).join(",");
        csvContent += row + "\n";
    });

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, csvContent);
    console.log(`--- COMPLETE. Saved ${allItems.length} products to ${OUTPUT_FILE} ---`);
};

generateCsv();
