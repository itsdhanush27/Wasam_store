// Products JavaScript - Load and display products from JSON

// Product data store
let allProducts = [];

// Initialize products
async function initProducts() {
  try {
    // Determine API query based on URL parameters
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const searchParam = params.get('search');

    let apiQuery = 'bestselling products'; // Default for homepage

    // If on products.html with params, customize the query
    // If on products.html (or extensionless /products), customize the query
    // We can detecting this by checking if we are not on the home page or detail page, 
    // or simply reuse the container check logic (but container isn't grabbed yet).
    // Let's use a broader path check.
    if (window.location.pathname.match(/products(\.html)?$/)) {
      if (searchParam) {
        apiQuery = searchParam;
        updatePageHeader(`Search Results for "${searchParam}"`);
      } else if (categoryParam) {
        apiQuery = `bestselling ${categoryParam}`;
        updatePageHeader(`${categoryParam}`);
      } else {
        apiQuery = 'bestselling products';
        updatePageHeader('All Products');
      }
    } else {
      // Just homepage defaults
      apiQuery = 'bestselling tech gadgets';
    }

    // Initialize Filter Dropdown
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
      // Set current value
      if (categoryParam) {
        filterSelect.value = categoryParam;
      } else {
        filterSelect.value = 'all';
      }

      // Add change listener
      filterSelect.addEventListener('change', function () {
        const selectedCategory = this.value;
        if (selectedCategory === 'all') {
          window.location.href = 'products.html';
        } else {
          window.location.href = `products.html?category=${encodeURIComponent(selectedCategory)}`;
        }
      });
    }

    console.log(`Fetching API with query: ${apiQuery}`);
    const response = await fetch(`http://localhost:3000/api/search?query=${encodeURIComponent(apiQuery)}`);
    const data = await response.json();

    if (data.data && data.data.products) {
      allProducts = data.data.products.map(item => ({
        id: item.asin,
        title: item.product_title,
        price: parseFloat(item.product_price ? item.product_price.replace('$', '').replace(',', '') : 0),
        // assign category to searched category if available, else generic
        category: categoryParam || 'General',
        subcategory: 'Deals',
        image: item.product_photo,
        badge: item.product_badge || (item.is_best_seller ? 'Best Seller' : ''),
        amazon_url: item.product_url,
        description: '',
        rating: item.product_star_rating,
        reviews: item.product_num_ratings
      }));
    } else {
      console.warn('API returned unexpected structure, falling back to static data.');
      // Fallback logic remains...
      const staticResponse = await fetch('data/products.json');
      const staticData = await staticResponse.json();
      allProducts = staticData.products;
    }

    // Render Logic
    // Render Logic
    const allProductsContainer = document.getElementById('allProducts');
    if (allProductsContainer) {
      // On products page (has #allProducts container), show everything
      loadAllProducts('all');
    } else {
      // On homepage, try to populate sections
      // Since we only made ONE query (e.g. tech), most other sections might be empty
      // unless we multi-fetch. For now, let's just populate Latest.
      loadLatestProducts();

      // Optional: If we want to populate other sections on homepage, we need more API calls or a mix.
      // For now, let's clear them or show duplicates to avoid broken feel?
      // Let's just try to load generic 'General' items into sections if they fit broad types,
      // but strictly our map set category='General'.
      // So loadCategoryProducts('Electronics'...) will find 0 items.
      // We will leave as is for now, focus on functional category pages.
    }

    // Load sidebar products if on products page
    if (document.getElementById('sidebarProducts')) {
      loadSidebarProducts();
    }

    // Dispatch event to signal products are loaded
    window.dispatchEvent(new CustomEvent('productsLoaded'));

  } catch (error) {
    console.error('Error loading products:', error);
    // Silent fallback...
    try {
      const response = await fetch('data/products.json');
      const data = await response.json();
      allProducts = data.products;
      window.dispatchEvent(new CustomEvent('productsLoaded'));
      if (document.getElementById('allProducts')) loadAllProducts('all');
      else loadLatestProducts();
    } catch (e) { console.error('Fallback failed'); }
  }
}

// Helper to update header on products.html
function updatePageHeader(title) {
  const titleEl = document.querySelector('.section-title');
  const breadcrumbEl = document.querySelector('.breadcrumb-current'); // if exists
  if (titleEl) titleEl.textContent = title;
}

// Load latest products (products with "Latest" badge)
function loadLatestProducts() {
  const container = document.getElementById('latestProducts');
  if (!container) return;

  const latestProducts = allProducts.filter(p => p.badge === 'Latest').slice(0, 8);
  container.innerHTML = latestProducts.map(product => createProductCard(product)).join('');
}

// Load products by category
function loadCategoryProducts(category, containerId, limit = 4) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const categoryProducts = allProducts.filter(p => p.category === category).slice(0, limit);
  container.innerHTML = categoryProducts.map(product => createProductCard(product)).join('');
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

  const sidebarProducts = allProducts.slice(0, 5);
  container.innerHTML = sidebarProducts.map(product => createSidebarProduct(product)).join('');
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
        <p class="product-price">$${product.price.toFixed(2)}</p>
        <button class="product-btn">See Details</button>
      </div>
    </a>
  `;
}

// Create sidebar product HTML
function createSidebarProduct(product) {
  return `
    <a href="product.html?id=${product.id}" class="sidebar-product">
      <div class="sidebar-product-image">
        <img src="${product.image}" alt="${product.title}" loading="lazy">
      </div>
      <div class="sidebar-product-info">
        <h4 class="sidebar-product-title">${product.title}</h4>
        <p class="sidebar-product-price">$${product.price.toFixed(2)}</p>
      </div>
    </a>
  `;
}

// Search products
function searchProducts(query) {
  const searchQuery = query.toLowerCase().trim();

  if (!searchQuery) {
    return allProducts;
  }

  return allProducts.filter(product =>
    product.title.toLowerCase().includes(searchQuery) ||
    product.category.toLowerCase().includes(searchQuery) ||
    (product.subcategory && product.subcategory.toLowerCase().includes(searchQuery))
  );
}

// Get product by ID
function getProductById(id) {
  return allProducts.find(product => product.id === id); // id is now string (ASIN)
}

// Filter products by category
function filterByCategory(category) {
  if (category === 'all') {
    return allProducts;
  }
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
