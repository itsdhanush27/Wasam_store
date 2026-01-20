const axios = require('axios');
const cheerio = require('cheerio');
const Product = require('../models/Product');

// User-Agent Rotation (Shared logic)
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

const scrapeCategory = async (query, category, limit = 10) => {
    console.log(`[Daily Scraper] Starting scrape for: ${category} (${query})`);
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
    const html = await fetchAmazonPage(searchUrl);

    if (!html || html.includes('api-services-support@amazon.com')) {
        console.warn(`[Daily Scraper] Failed/Blocked for ${category}. Skipping.`);
        return;
    }

    const $ = cheerio.load(html);
    let count = 0;

    const items = [];
    $('.s-result-item[data-asin]').each((i, el) => {
        if (count >= limit) return;

        const asin = $(el).attr('data-asin');
        if (!asin) return;

        const title = $(el).find('h2 span').text().trim() || $(el).find('.a-text-normal').first().text().trim();

        // Robust Price Parsing
        let priceRaw = $(el).find('.a-price .a-offscreen').first().text().trim();
        if (!priceRaw) {
            const priceWhole = $(el).find('.a-price-whole').first().text().trim();
            const priceFraction = $(el).find('.a-price-fraction').first().text().trim();
            if (priceWhole) {
                priceRaw = `${priceWhole}.${priceFraction || '00'}`;
            }
        }

        let price = null;
        if (priceRaw) {
            // Remove non-numeric characters (currency, commas) and parse
            const cleanPrice = priceRaw.replace(/[^\d.]/g, '');
            price = parseFloat(cleanPrice);
            if (isNaN(price)) price = null;
        }

        // Fallback for no price (e.g. out of stock or variety)
        // if (!price) price = null; // Already null by default

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
                isBestSeller: i < 4, // Assume top results are "best" for this logic
                lastScraped: new Date()
            });
            count++;
        }
    });

    // Bulk Upsert to MongoDB
    for (const item of items) {
        await Product.findOneAndUpdate(
            { asin: item.asin },
            item,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }
    console.log(`[Daily Scraper] Upserted ${items.length} products for ${category}`);
};

const runDailyScrape = async () => {
    console.log('--- STARTING DAILY SCRAPE ---');
    const sections = [
        { query: 'trending amazon finds', category: 'Latest', limit: 8 },
        { query: 'best electronics gadgets', category: 'Electronics', limit: 6 },
        { query: 'home kitchen essentials', category: 'Home', limit: 6 },
        { query: 'latest fashion trends clothing', category: 'Fashion', limit: 6 },
        { query: 'trending beauty personal care', category: 'Beauty', limit: 6 },
        { query: 'health household best sellers', category: 'Health', limit: 6 }
    ];

    for (const section of sections) {
        await scrapeCategory(section.query, section.category, section.limit);
        // Delay between categories to be nice
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log('--- DAILY SCRAPE COMPLETED ---');
};

module.exports = { runDailyScrape, scrapeCategory };
