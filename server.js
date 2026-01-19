const express = require('express');
const cors = require('cors');
// axios is no longer needed for main logic but check if you want to keep it.
// We will simply require amazon-buddy.
const amazonBuddy = require('amazon-buddy');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and serve static files
app.use(cors());
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
app.use(express.json());

// Search Endpoint using amazon-buddy
app.get('/api/search', async (req, res) => {
    const { query } = req.query;

    console.log(`[Scraper] Searching for: ${query}`);

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        // Fetch products using amazon-buddy
        // Limit to 40 items to prevent Vercel timeouts (10s limit)
        const results = await amazonBuddy.products({ 
            keyword: query, 
            number: 40, 
            country: 'US' 
        });

        if (!results || !results.result || results.result.length === 0) {
            console.log('[Scraper] No results found.');
            return res.json({ data: { products: [] } });
        }

        console.log(`[Scraper] Found ${results.result.length} products.`);

        // Map amazon-buddy structure to our frontend's expected format (RapidAPI style)
        const mappedProducts = results.result.map(item => ({
            asin: item.asin,
            product_title: item.title,
            product_price: item.price && item.price.current_price ? `$${item.price.current_price}` : '$0.00',
            product_photo: item.thumbnail,
            product_star_rating: item.score,
            product_num_ratings: item.reviews,
            product_url: item.url,
            is_best_seller: false // scraper might not return this, default false
            // badge: not always available
        }));

        res.json({
            data: {
                products: mappedProducts
            }
        });

    } catch (error) {
        console.error('[Scraper] Error:', error.message);
        res.status(500).json({
            error: 'Failed to scrape data',
            details: error.message
        });
    }
});

// Product Details Endpoint using amazon-buddy
app.get('/api/product', async (req, res) => {
    const { asin } = req.query;

    if (!asin) {
        return res.status(400).json({ error: 'ASIN parameter is required' });
    }

    try {
        console.log(`[Scraper] Fetching details for ASIN: ${asin}`);
        const details = await amazonBuddy.asin({ asin: asin, country: 'US' });

        if (!details || !details.result || details.result.length === 0) {
             return res.status(404).json({ error: 'Product not found' });
        }

        const product = details.result[0];

        // Map to expected format
        res.json({
            data: {
                product_title: product.title,
                product_price: product.price ? product.price.current_price : '',
                product_photo: product.main_image,
                product_description: product.description,
                about_product: product.features, // amazon-buddy often calls bullet points 'features'
                product_star_rating: product.score,
                product_num_ratings: product.reviews
            }
        });

    } catch (error) {
        console.error('[Scraper] Detail Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch product details' });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Export the app for Vercel
module.exports = app;

// Only listen if not running in production/serverless environment
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Using amazon-buddy scraper logic.`);
    });
}
