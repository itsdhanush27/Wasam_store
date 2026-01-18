const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and serve static files
app.use(cors());
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));
app.use(express.json());

// RapidAPI Configuration
// NOTE: These defaults are for "Real-Time Amazon Data" by LetsScrape.
// If you use a different provider, updates these host/updates headers.
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Search Endpoint
app.get('/api/search', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    if (!RAPIDAPI_KEY) {
        return res.status(500).json({ error: 'API Key is missing on server' });
    }

    try {
        const response = await axios.get(`https://${RAPIDAPI_HOST}/search`, {
            params: {
                query: query,
                page: '1',
                country: 'US',
                sort_by: 'RELEVANCE',
                product_condition: 'ALL'
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error.message);
        // Return mock data fallback if API fails (optional, good for dev)
        res.status(500).json({
            error: 'Failed to fetch data from Amazon API',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Product Details Endpoint
app.get('/api/product', async (req, res) => {
    const { asin } = req.query;

    if (!asin) {
        return res.status(400).json({ error: 'ASIN parameter is required' });
    }

    try {
        const response = await axios.get(`https://${RAPIDAPI_HOST}/product-details`, {
            params: {
                asin: asin,
                country: 'US'
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('API Error:', error.message);
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
        console.log(`Make sure to set your RAPIDAPI_KEY in the .env file!`);
    });
}
