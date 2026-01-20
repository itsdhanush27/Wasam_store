// Products JavaScript - Load and display products from JSON

// Product data store
let allProducts = [];

// Initialize products
async function initProducts() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Check if we are on the homepage (no search params, basic path)
  const isHomepage = (path === '/' || path.endsWith('index.html')) && !params.toString();

  if (isHomepage) {
    await initHomepage();
  } else {
    await initProductPage();
  }

  // Common initialization
  initFilter(params.get('category'));

  // Dispatch event to signal products are loaded
  window.dispatchEvent(new CustomEvent('productsLoaded'));
}

// Homepage Initialization: Load specific sections
async function initHomepage() {
  const sections = [
    { id: 'latestProducts', query: 'trending amazon finds', limit: 8 }, // 8 for latest
    { id: 'electronicsProducts', query: 'best electronics gadgets', limit: 4 },
    { id: 'homeProducts', query: 'home kitchen essentials', limit: 4 },
    { id: 'fashionProducts', query: 'latest fashion trends clothing', limit: 4 },
    { id: 'beautyProducts', query: 'trending beauty personal care', limit: 4 },
    { id: 'healthProducts', query: 'health household best sellers', limit: 4 }
  ];

  // Fetch sections sequentially with delay to avoid rate limiting
  for (const section of sections) {
    await loadSection(section);
    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 800));
  }
}

async function loadSection({ id, query, limit }) {
  const container = document.getElementById(id);
  if (!container) return;

  container.innerHTML = '<div class="loading-spinner">Loading...</div>';

  try {
    const products = await fetchProductsFromApi(query);
    if (!products || products.length === 0) {
      throw new Error('No products found');
    }

    // Tag them for specific sections if needed, or just render
    const displayProducts = products.slice(0, limit);
    container.innerHTML = displayProducts.map(product => createProductCard(product)).join('');
  } catch (error) {
    console.error(`Error loading section ${id}:`, error);
    // Silent fallback to generic data if API fails individual section
    container.innerHTML = '<p class="error-msg">Check back soon for new products!</p>';
  }
}

// Product Page Initialization
async function initProductPage() {
  try {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const searchParam = params.get('search');
    let apiQuery = 'bestselling products';

    if (searchParam) {
      apiQuery = searchParam;
      updatePageHeader(`Search Results for "${searchParam}"`);
    } else if (categoryParam) {
      apiQuery = `bestselling ${categoryParam}`;
      updatePageHeader(`${categoryParam}`);
    } else {
      updatePageHeader('All Products');
    }

    // Initialize Filter Dropdown Logic
    initFilter(categoryParam);

    console.log(`Fetching API with query: ${apiQuery}`);
    allProducts = await fetchProductsFromApi(apiQuery);

    // Render
    const allProductsContainer = document.getElementById('allProducts');
    if (allProductsContainer) {
      loadAllProducts('all');
    }

    // Sidebar logic
    if (document.getElementById('sidebarProducts')) {
      loadSidebarProducts();
    }

  } catch (error) {
    console.error('Error loading products page:', error);
    // Fallback load
    fallbackLoad();
  }
}

// Valid categories helper
function assignCategory(query, item) {
  // Simple heuristic to assign sensible category strings based on query or item title
  if (query.includes('electronics') || item.product_title.toLowerCase().includes('phone') || item.product_title.toLowerCase().includes('audio')) return 'Electronics & Gadgets';
  if (query.includes('home') || item.product_title.toLowerCase().includes('kitchen')) return 'Home, Kitchen & Living';
  if (query.includes('beauty')) return 'Beauty & Personal Care';
  if (query.includes('health')) return 'Health & Household';
  if (query.includes('fashion')) return 'Fashion & Lifestyle';
  return 'General';
}

// Core Fetch Function
async function fetchProductsFromApi(query) {
  // Use relative path for production compatibility
  try {
    // Try fetching from DB cache first
    try {
      // Try fetching from DB cache first
      try {
        // Mapping queries to DB Categories (Simple heuristic)
        const lowerQuery = query.toLowerCase();
        let dbCategory = 'General';
        if (lowerQuery.includes('electronics')) dbCategory = 'Electronics & Gadgets';
        else if (lowerQuery.includes('home')) dbCategory = 'Home, Kitchen & Living';
        else if (lowerQuery.includes('fashion')) dbCategory = 'Fashion & Lifestyle';
        else if (lowerQuery.includes('beauty')) dbCategory = 'Beauty & Personal Care';
        else if (lowerQuery.includes('health')) dbCategory = 'Health & Household';
        else if (lowerQuery.includes('trending amazon finds')) dbCategory = 'all';

        // Always check DB for mapped categories
        if (dbCategory !== 'General' || lowerQuery.includes('trending') || lowerQuery.includes('best')) {
          const dbRes = await fetch(`/api/top-products?category=${encodeURIComponent(dbCategory)}&limit=10`);
          const dbData = await dbRes.json();

          if (dbData.data && dbData.data.products && dbData.data.products.length > 0) {
            console.log(`[Frontend] Loaded ${dbCategory} from DB Cache`);
            return dbData.data.products.map(item => ({
              id: item.asin,
              title: item.product_title,
              price: typeof item.product_price === 'number' ? item.product_price : null,
              category: item.category || 'General',
              subcategory: 'Deals',
              image: item.product_photo,
              badge: item.is_best_seller ? 'Best Seller' : '',
              amazon_url: item.product_url,
              description: '',
              rating: '4.5',
              reviews: 0
            }));
          }
        }
      } catch (err) {
        console.warn('DB Cache miss, falling back to live search', err);
      }
    } catch (err) {
      console.warn('DB Cache miss, falling back to live search', err);
    }

    // Fallback to Live Search API
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.data && data.data.products) {
      return data.data.products.map(item => ({
        id: item.asin,
        title: item.product_title,
        price: parseFloat(item.product_price ? item.product_price.replace(/[^0-9.]/g, '') : 0),
        displayPrice: item.product_price || 'Check Price', // Fix $0.00
        category: assignCategory(query, item),
        subcategory: 'Deals',
        image: item.product_photo,
        badge: item.is_best_seller ? 'Best Seller' : (item.is_amazon_choice ? 'Choice' : ''),
        amazon_url: item.product_url,
        description: '',
        rating: item.product_star_rating,
        reviews: item.product_num_ratings
      }));
    }
    return [];
  } catch (e) {
    console.error("Fetch API error", e);
    return [];
  }
}

function initFilter(categoryParam) {
  const filterSelect = document.getElementById('categoryFilter');
  if (filterSelect) {
    if (categoryParam) filterSelect.value = categoryParam;
    else filterSelect.value = 'all';

    filterSelect.addEventListener('change', function () {
      const selectedCategory = this.value;
      if (selectedCategory === 'all') {
        window.location.href = 'products.html';
      } else {
        window.location.href = `products.html?category=${encodeURIComponent(selectedCategory)}`;
      }
    });
  }
}

// Helper to update header on products.html
function updatePageHeader(title) {
  const titleEl = document.querySelector('.section-title');
  if (titleEl) titleEl.textContent = title;
}

// Load all products for products page
function loadAllProducts(category = 'all') {
  const container = document.getElementById('allProducts');
  if (!container) return;

  let filteredProducts = allProducts;
  if (category !== 'all') {
    filteredProducts = allProducts.filter(p => p.category === category);
  }

  container.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');

  // Update product count
  const countEl = document.getElementById('productCount');
  if (countEl) {
    countEl.textContent = `${filteredProducts.length} products`;
  }
}

// Load sidebar products
function loadSidebarProducts() {
  const container = document.getElementById('sidebarProducts');
  if (!container) return;
  // Just take first 5 of whatever we have
  const sidebarProducts = allProducts.slice(0, 5);
  container.innerHTML = sidebarProducts.map(product => createSidebarProduct(product)).join('');
}

// Fallback logic for errors
async function fallbackLoad() {
  // ... existing fallback or simplified
  const container = document.getElementById('allProducts');
  if (container) container.innerHTML = '<p>Could not load products. Please try again later.</p>';
}

// Create product card HTML
function createProductCard(product) {
  return `
    <a href="product.html?id=${product.id}" class="product-card">
      <div class="product-image">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <img src="${product.image}" alt="${product.title}" loading="lazy">
      </div>
      <div class="product-info">
        <span class="product-category">${product.subcategory || product.category}</span>
        <h3 class="product-title">${product.title}</h3>
        <p class="product-price">${(product.price !== null && product.price !== undefined && !isNaN(product.price)) ? '$' + Number(product.price).toFixed(2) : 'Check Price'}</p>
        <button class="product-btn">See Details</button>
      </div>
    </a>
  `;
}

// Create sidebar product HTML
function createSidebarProduct(product) {
  const priceDisplay = (product.price !== null && product.price !== undefined && !isNaN(product.price))
    ? '$' + Number(product.price).toFixed(2)
    : 'Check Price';

  return `
    <a href="product.html?id=${product.id}" class="sidebar-product">
      <div class="sidebar-product-image">
        <img src="${product.image}" alt="${product.title}" loading="lazy">
      </div>
      <div class="sidebar-product-info">
        <h4 class="sidebar-product-title">${product.title}</h4>
        <p class="sidebar-product-price">${priceDisplay}</p>
      </div>
    </a>
  `;
}

// Search products
function searchProducts(query) {
  const searchQuery = query.toLowerCase().trim();
  if (!searchQuery) return allProducts;

  return allProducts.filter(product =>
    product.title.toLowerCase().includes(searchQuery) ||
    product.category.toLowerCase().includes(searchQuery)
  );
}

// Get product by ID (Assumes allProducts is populated, likely won't work perfectly on Homepage unless we fetch there too)
// Note: Product details page should handle its own fetching if id not found in memory.
function getProductById(id) {
  return allProducts.find(product => product.id === id);
}

// Filter products by category
function filterByCategory(category) {
  if (category === 'all') return allProducts;
  return allProducts.filter(p => p.category === category);
}

// Get related products
function getRelatedProducts(product, limit = 4) {
  return allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProducts);
