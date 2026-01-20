const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const cron = require('node-cron');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const { runDailyScrape } = require('./services/scraper');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect Database
connectDB();

// Monitor Connection for Initial Scrape
mongoose.connection.once('connected', async () => {
    try {
        const count = await Product.countDocuments();
        console.log(`[Server] Database has ${count} products.`);

        if (count === 0) {
            console.log('[Server] Database is empty. Starting initial scrape to populate data...');
            runDailyScrape();
        }
    } catch (err) {
        console.error('[Server] Failed to check product count:', err);
    }
});

// Init Cron Job (Runs daily at 10:05 AM)
cron.schedule('5 10 * * *', () => {
    runDailyScrape();
});

app.use(cors());
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
app.use(express.json());

// Global Error Handlers to prevent crash on DB fail
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    // Keep running
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    // Keep running
});

// Helper: User-Agent Rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
];

function getRandomHeaders() {
    return {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
    };
}

// Helper: safe fetch
async function fetchAmazonPage(url) {
    try {
        const headers = getRandomHeaders();
        const response = await axios.get(url, { headers, timeout: 8000 }); // 8s timeout for Vercel safety
        return response.data;
    } catch (error) {
        console.error('Scrape fetch error:', error.message);
        return null; // Return null to handle gracefully
    }
}

// Search Endpoint
// Helper: Load static products
const staticProductsData = require('./data/products.json');

// --- NEW API ENDPOINTS ---

// Get Cached Products (Primary Endpoint)
app.get('/api/top-products', async (req, res) => {
    const { category, limit } = req.query;
    try {
        // Fast-fail if DB is not connected
        if (mongoose.connection.readyState !== 1) {
            console.warn('[API] MongoDB not connected. Skipping DB query.');
            return res.json({ data: { products: [], source: 'offline_fallback' } });
        }

        let query = {};
        if (category && category !== 'all') {
            query.category = category;
        }

        const products = await Product.find(query)
            .sort({ lastScraped: -1 })
            .limit(parseInt(limit) || 20);

        if (products.length > 0) {
            const formatted = products.map(p => ({
                asin: p.asin,
                product_title: p.title,
                product_price: p.price,
                product_photo: p.image,
                product_url: p.url,
                category: p.category,
                is_best_seller: p.isBestSeller
            }));
            return res.json({ data: { products: formatted, source: 'database' } });
        }

        return res.json({ data: { products: [], source: 'empty_db' } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Manual Trigger for Scraper (Useful for testing)
app.get('/api/trigger-scrape', async (req, res) => {
    runDailyScrape();
    res.json({ message: 'Scraper started in background' });
});

// --- LEGACY ENDPOINTS (Backup) ---

// Search Endpoint
app.get('/api/search', async (req, res) => {
    const { query } = req.query;
    console.log(`[Scraper] Searching for: ${query}`);

    if (!query) return res.status(400).json({ error: 'Missing query' });

    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
    const html = await fetchAmazonPage(searchUrl);

    if (!html || html.includes('api-services-support@amazon.com')) {
        console.warn('[Scraper] Amazon blocked or failed. Falling back to static data.');
        const fallbackResults = searchStaticProducts(query);
        return res.json({ data: { products: fallbackResults } });
    }

    const $ = cheerio.load(html);
    const products = [];

    $('.s-result-item[data-asin]').each((i, el) => {
        const asin = $(el).attr('data-asin');
        if (!asin) return;

        // robust selectors
        const title = $(el).find('h2 span').text().trim() || $(el).find('.a-text-normal').first().text().trim();

        let priceRaw = $(el).find('.a-price .a-offscreen').first().text().trim();
        if (!priceRaw) {
            const priceWhole = $(el).find('.a-price-whole').first().text().trim();
            const priceFraction = $(el).find('.a-price-fraction').first().text().trim();
            if (priceWhole) priceRaw = `${priceWhole}.${priceFraction}`;
        }

        // Parse float
        let price = 0; // Default for legacy API view
        if (priceRaw) {
            price = parseFloat(priceRaw.replace(/[^\d.]/g, '')) || 0;
        }

        const image = $(el).find('.s-image').attr('src');
        let link = $(el).find('a.a-link-normal').first().attr('href');

        if (link && !link.startsWith('http')) {
            link = 'https://www.amazon.com' + link;
        }

        if (title && image) {
            products.push({
                asin,
                product_title: title,
                product_price: price || null,
                product_photo: image,
                product_url: link,
                product_star_rating: 'N/A',
                product_num_ratings: 0
            });
        }
    });

    if (products.length === 0) {
        console.warn('[Scraper] No products parsed from HTML. Falling back to static data.');
        const fallbackResults = searchStaticProducts(query);
        return res.json({ data: { products: fallbackResults } });
    }

    console.log(`[Scraper] Found ${products.length} items`);
    res.json({ data: { products: products.slice(0, 40) } });
});

// Product Details Endpoint (Basic)
app.get('/api/product', async (req, res) => {
    const { asin } = req.query;
    if (!asin) return res.status(400).json({ error: 'Missing ASIN' });

    console.log(`[Scraper] Fetching product: ${asin}`);
    const productUrl = `https://www.amazon.com/dp/${asin}`;
    const html = await fetchAmazonPage(productUrl);

    if (!html) {
        console.warn('[Scraper] Product fetch failed. Trying static lookup.');
        // Try to find in static data (though ID might not match exactly if ASIN is real)
        // For demo, we just return a generic static error or mock
        const staticMatch = staticProductsData.products.find(p => p.amazon_url.includes(asin) || p.id == asin);
        if (staticMatch) {
            return res.json({
                data: {
                    product_title: staticMatch.title,
                    product_price: `$${staticMatch.price}`,
                    product_photo: staticMatch.image,
                    product_description: staticMatch.description,
                    about_product: []
                }
            });
        }
        return res.status(500).json({ error: 'Failed to fetch product' });
    }

    const $ = cheerio.load(html);

    // Basic Parsing
    const title = $('#productTitle').text().trim();
    const price = $('.a-price .a-offscreen').first().text().trim();
    const description = $('#feature-bullets ul').html() ||
        $('#productDescription').html() ||
        $('meta[name="description"]').attr('content') ||
        'No description available.';
    const image = $('#landingImage').attr('src');

    res.json({
        data: {
            product_title: title,
            product_price: price,
            product_photo: image,
            product_description: description,
            about_product: []
        }
    });
});

// Helper: Search static products
function searchStaticProducts(query) {
    const q = query.toLowerCase();
    const all = staticProductsData.products.map(transformStaticProduct);

    // Simple filter
    const matches = all.filter(p =>
        p.product_title.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        q.includes(p.category ? p.category.toLowerCase() : 'xyz')
    );

    // If no specific matches, return a subset of "Latest" or random to fill UI
    if (matches.length < 4) {
        return all.sort(() => 0.5 - Math.random()).slice(0, 8);
    }

    return matches;
}

function transformStaticProduct(p) {
    return {
        asin: p.id, // map numeric ID to asin field
        product_title: p.title,
        product_price: `$${p.price.toFixed(2)}`,
        product_photo: p.image,
        product_url: p.amazon_url,
        product_star_rating: '4.5',
        product_num_ratings: 100,
        category: p.category
    };
}

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
