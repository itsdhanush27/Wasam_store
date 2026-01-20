const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// [MEMORY CACHE] Load products from CSV
let PRODUCTS_CACHE = [];

function loadCsvData() {
    const csvPath = path.join(__dirname, 'data', 'products.csv');
    if (!fs.existsSync(csvPath)) {
        console.warn('[Server] No products.csv found. Please run "npm run scrape" locally.');
        return;
    }

    try {
        const raw = fs.readFileSync(csvPath, 'utf8');
        const lines = raw.split('\n').filter(l => l.trim() !== '');

        // Simple CSV Parser (Handle quoted strings)
        const parseRow = (row) => {
            const result = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    if (inQuotes && row[i + 1] === '"') {
                        current += '"';
                        i++; // skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current);
            return result;
        };

        // Skip header (i=0 is header)
        const products = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = parseRow(lines[i]);
            if (cols.length < 5) continue; // Invalid row

            // csv header: asin,title,price,image,url,category,isBestSeller
            products.push({
                asin: cols[0],
                title: cols[1],
                price: cols[2] ? parseFloat(cols[2]) : null,
                image: cols[3],
                url: cols[4],
                category: cols[5],
                isBestSeller: cols[6] === 'true'
            });
        }

        PRODUCTS_CACHE = products;
        console.log(`[Server] Loaded ${PRODUCTS_CACHE.length} products from CSV.`);
    } catch (e) {
        console.error('[Server] Failed to load CSV:', e);
    }
}

// Load data on start
loadCsvData();

app.use(cors());
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
app.use(express.json());

// Main API: Get Cached Products
app.get('/api/top-products', (req, res) => {
    const { category, limit } = req.query;

    let results = PRODUCTS_CACHE;

    if (category && category !== 'all') {
        results = results.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
    }

    if (limit) {
        results = results.slice(0, parseInt(limit));
    }

    if (results.length > 0) {
        const formatted = results.map(p => ({
            asin: p.asin,
            product_title: p.title,
            product_price: p.price,
            product_photo: p.image,
            product_url: p.url,
            category: p.category,
            is_best_seller: p.isBestSeller
        }));
        return res.json({ data: { products: formatted, source: 'csv' } });
    }

    return res.json({ data: { products: [], source: 'empty_csv' } });
});

// Helper for single product (search by ASIN in memory)
app.get('/api/product', (req, res) => {
    const { asin } = req.query;
    const product = PRODUCTS_CACHE.find(p => p.asin === asin);
    if (product) {
        return res.json({
            status: 'OK',
            data: {
                product_title: product.title,
                product_price: product.price,
                product_photo: product.image,
                product_url: product.url,
                category: product.category,
                product_description: product.title // Fallback description
            }
        });
    }
    res.status(404).json({ error: 'Product not found' });
});

// Search API (Filter memory)
app.get('/api/search', (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    const lowerQ = query.toLowerCase();
    const results = PRODUCTS_CACHE.filter(p =>
        (p.title && p.title.toLowerCase().includes(lowerQ)) ||
        (p.category && p.category.toLowerCase().includes(lowerQ))
    );

    const formatted = results.slice(0, 40).map(p => ({
        asin: p.asin,
        product_title: p.title,
        product_price: p.price || 0,
        product_photo: p.image,
        product_url: p.url,
        is_best_seller: p.isBestSeller,
        product_star_rating: '4.5',
        product_num_ratings: 0
    }));

    res.json({
        status: 'OK',
        data: {
            products: formatted
        }
    });
});

// Export for serverless
module.exports = app;

// Only listen if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
