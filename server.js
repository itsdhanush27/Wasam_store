const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
app.use(express.json());

// Helper: Custom Scraper Headers
const SCRAPER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

// Helper: safe fetch
async function fetchAmazonPage(url) {
    try {
        const response = await axios.get(url, { headers: SCRAPER_HEADERS, timeout: 8000 }); // 8s timeout for Vercel safety
        return response.data;
    } catch (error) {
        console.error('Scrape fetch error:', error.message);
        return null; // Return null to handle gracefully
    }
}

// Search Endpoint
app.get('/api/search', async (req, res) => {
    const { query } = req.query;
    console.log(`[Scraper] Searching for: ${query}`);

    if (!query) return res.status(400).json({ error: 'Missing query' });

    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
    const html = await fetchAmazonPage(searchUrl);

    if (!html) {
        return res.status(500).json({ error: 'Failed to fetch Amazon page' });
    }

    if (html.includes('api-services-support@amazon.com')) {
        console.error('CAPTCHA detected');
        return res.status(503).json({ error: 'Amazon blocked request (CAPTCHA)' });
    }

    const $ = cheerio.load(html);
    const products = [];

    $('.s-result-item[data-asin]').each((i, el) => {
        const asin = $(el).attr('data-asin');
        if (!asin) return;

        // robust selectors
        const title = $(el).find('h2 span').text().trim() || $(el).find('.a-text-normal').first().text().trim();
        const priceWhole = $(el).find('.a-price-whole').first().text().trim();
        const priceFraction = $(el).find('.a-price-fraction').first().text().trim();
        const price = priceWhole ? `$${priceWhole}.${priceFraction}` : null;
        const image = $(el).find('.s-image').attr('src');
        let link = $(el).find('a.a-link-normal').first().attr('href');

        if (link && !link.startsWith('http')) {
            link = 'https://www.amazon.com' + link;
        }

        if (title && image) {
            products.push({
                asin,
                product_title: title,
                product_price: price || '$0.00',
                product_photo: image,
                product_url: link,
                product_star_rating: 'N/A', // scraping stars is harder (class names vary)
                product_num_ratings: 0
            });
        }
    });

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

    if (!html) return res.status(500).json({ error: 'Failed to fetch product' });

    const $ = cheerio.load(html);

    // Basic Parsing
    const title = $('#productTitle').text().trim();
    const price = $('.a-price .a-offscreen').first().text().trim();
    const description = $('#feature-bullets ul').html() || ''; // Get HTML of bullets
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
