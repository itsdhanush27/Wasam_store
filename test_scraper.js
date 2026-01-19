const axios = require('axios');
const cheerio = require('cheerio');

async function testScraper() {
    console.log('--- Testing Custom Scraper (Axios + Cheerio) ---');
    try {
        const res = await axios.get('https://www.amazon.com/s?k=laptop', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        console.log('Status:', res.status);
        const $ = cheerio.load(res.data);
        const products = [];

        $('.s-result-item[data-asin]').each((i, el) => {
            const asin = $(el).attr('data-asin');
            if (!asin) return;

            const title = $(el).find('h2 span').text().trim();
            const price = $(el).find('.a-price .a-offscreen').first().text().trim();
            const image = $(el).find('.s-image').attr('src');
            const url = 'https://amazon.com' + $(el).find('h2 a').attr('href');

            if (title) {
                products.push({ asin, title, price, image, url });
            }
        });

        console.log(`Found ${products.length} products.`);
        if (products.length > 0) {
            console.log('First Product:', products[0]);
        } else {
            console.log('No products found. Selectors might be wrong or page is different.');
        }

    } catch (err) {
        console.error('Scrape Failed:', err.message);
    }

    console.log('\n--- Testing Product Details Scraper ---');
    try {
        const asin = 'B09RPLMSGZ'; // Example ASIN from user screenshot
        const url = `https://www.amazon.com/dp/${asin}`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const $ = cheerio.load(res.data);
        const title = $('#productTitle').text().trim();
        const price = $('.a-price .a-offscreen').first().text().trim(); // Selector might need adjustment
        const description = $('#feature-bullets ul').html() || '';
        const image = $('#landingImage').attr('src');

        console.log('Product Details Found:');
        console.log('Title:', title.substring(0, 50) + '...');
        console.log('Price:', price);
        console.log('Image:', image ? 'Found' : 'Missing');
        console.log('Description Length:', description.length);

    } catch (err) {
        console.error('Product Detail Scrape Failed:', err.message);
    }
}

testScraper();
