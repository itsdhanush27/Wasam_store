// Main JavaScript - Core functionality

// Globe button country dropdown
document.addEventListener('DOMContentLoaded', function () {
    const globeBtn = document.getElementById('globeBtn');
    const countryDropdown = document.getElementById('countryDropdown');

    // Comprehensive Country List
    const countries = [
        { code: "US", name: "United States", flag: "🇺🇸" },
        { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
        { code: "CA", name: "Canada", flag: "🇨🇦" },
        { code: "DE", name: "Germany", flag: "🇩🇪" },
        { code: "FR", name: "France", flag: "🇫🇷" },
        { code: "AU", name: "Australia", flag: "🇦🇺" },
        { code: "IT", name: "Italy", flag: "🇮🇹" },
        { code: "ES", name: "Spain", flag: "🇪🇸" },
        { code: "JP", name: "Japan", flag: "🇯🇵" },
        { code: "CN", name: "China", flag: "🇨🇳" },
        { code: "IN", name: "India", flag: "🇮🇳" },
        { code: "BR", name: "Brazil", flag: "🇧🇷" },
        { code: "MX", name: "Mexico", flag: "🇲🇽" },
        { code: "RU", name: "Russia", flag: "🇷🇺" },
        { code: "ZA", name: "South Africa", flag: "🇿🇦" },
        { code: "KR", name: "South Korea", flag: "🇰🇷" },
        { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
        { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
        { code: "TR", name: "Turkey", flag: "🇹🇷" },
        { code: "NL", name: "Netherlands", flag: "🇳🇱" },
        { code: "SE", name: "Sweden", flag: "🇸🇪" },
        { code: "CH", name: "Switzerland", flag: "🇨🇭" },
        { code: "PL", name: "Poland", flag: "🇵🇱" },
        { code: "BE", name: "Belgium", flag: "🇧🇪" },
        { code: "AT", name: "Austria", flag: "🇦🇹" },
        { code: "NO", name: "Norway", flag: "🇳🇴" },
        { code: "DK", name: "Denmark", flag: "🇩🇰" },
        { code: "FI", name: "Finland", flag: "🇫🇮" },
        { code: "IE", name: "Ireland", flag: "🇮🇪" },
        { code: "PT", name: "Portugal", flag: "🇵🇹" },
        { code: "GR", name: "Greece", flag: "🇬🇷" },
        { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
        { code: "HU", name: "Hungary", flag: "🇭🇺" },
        { code: "RO", name: "Romania", flag: "🇷🇴" },
        { code: "TH", name: "Thailand", flag: "🇹🇭" },
        { code: "ID", name: "Indonesia", flag: "🇮🇩" },
        { code: "MY", name: "Malaysia", flag: "🇲🇾" },
        { code: "SG", name: "Singapore", flag: "🇸🇬" },
        { code: "VN", name: "Vietnam", flag: "🇻🇳" },
        { code: "PH", name: "Philippines", flag: "🇵🇭" },
        { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
        { code: "IL", name: "Israel", flag: "🇮🇱" },
        { code: "EG", name: "Egypt", flag: "🇪🇬" },
        { code: "NG", name: "Nigeria", flag: "🇳🇬" },
        { code: "KE", name: "Kenya", flag: "🇰🇪" },
        { code: "AR", name: "Argentina", flag: "🇦🇷" },
        { code: "CL", name: "Chile", flag: "🇨🇱" },
        { code: "CO", name: "Colombia", flag: "🇨🇴" },
        { code: "PE", name: "Peru", flag: "🇵🇪" },
        { code: "PK", name: "Pakistan", flag: "🇵🇰" },
        { code: "BD", name: "Bangladesh", flag: "🇧🇩" }
    ];

    if (globeBtn && countryDropdown) {
        // Initialize Dropdown Structure
        countryDropdown.innerHTML = `
            <input type="text" class="country-search" placeholder="Search country..." id="countrySearch">
            <div class="country-list" id="countryList"></div>
        `;

        const countryListEl = document.getElementById('countryList');
        const countrySearchEl = document.getElementById('countrySearch');
        const currentCountryDisplay = document.getElementById('currentCountryDisplay');
        const initialSelected = localStorage.getItem('selectedCountry') || 'US';

        // Function to update header display
        // Function to update header display
        function updateHeaderDisplay(code) {
            const country = countries.find(c => c.code === code);
            if (country && currentCountryDisplay) {
                // Display Code only (e.g. US) to avoid Windows emoji duplication
                currentCountryDisplay.textContent = country.code;
                currentCountryDisplay.style.fontWeight = '700';
                currentCountryDisplay.style.fontSize = '16px';
            }
        }

        // Initial Display Update
        updateHeaderDisplay(initialSelected);

        // Function to render countries
        function renderCountries(filter = '') {
            countryListEl.innerHTML = '';
            // Get latest selection
            const currentSelected = localStorage.getItem('selectedCountry') || 'US';

            const filtered = countries.filter(c =>
                c.name.toLowerCase().includes(filter.toLowerCase()) ||
                c.code.toLowerCase().includes(filter.toLowerCase())
            );

            if (filtered.length === 0) {
                countryListEl.innerHTML = '<div style="padding:10px; color:#999; text-align:center;">No results found</div>';
                return;
            }

            filtered.forEach(country => {
                const item = document.createElement('div');
                item.className = `country-item ${country.code === currentSelected ? 'selected' : ''}`;
                item.dataset.code = country.code;
                item.innerHTML = `<span>${country.flag}</span> <span>${country.name}</span>`;

                item.addEventListener('click', function () {
                    localStorage.setItem('selectedCountry', country.code);
                    showToast(`Country set to ${country.name}`);
                    updateHeaderDisplay(country.code); // Update header
                    countryDropdown.classList.remove('active');

                    // Update selection visual
                    document.querySelectorAll('.country-item').forEach(el => el.classList.remove('selected'));
                    this.classList.add('selected');
                });

                countryListEl.appendChild(item);
            });
        }

        // Initial Render
        renderCountries();

        // Search Listener
        countrySearchEl.addEventListener('input', (e) => {
            renderCountries(e.target.value);
        });

        // Prevent closing when clicking search
        countrySearchEl.addEventListener('click', (e) => e.stopPropagation());

        // Toggle Dropdown
        globeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            countryDropdown.classList.toggle('active');
            if (countryDropdown.classList.contains('active')) {
                countrySearchEl.focus();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function () {
            countryDropdown.classList.remove('active');
        });
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navContainer = document.querySelector('.nav-container');

    if (mobileMenuBtn && navContainer) {
        mobileMenuBtn.addEventListener('click', function () {
            navContainer.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active'); // Animate the button icon
        });

        // Mobile Dropdown Toggle (Accordion Style)
        const navLinks = document.querySelectorAll('.nav-link svg');
        navLinks.forEach(arrow => {
            arrow.addEventListener('click', function (e) {
                // Only act if on mobile (or if we want this behavior everywhere, checking window width is safer if distinguishing)
                // But generally, on desktop hover works, so checking if navContainer is fixed/mobile view is good practice
                // However, simpler is to just allow it since desktop uses hover which won't conflict with click usually, 
                // but let's be safe and stopPropagation.
                if (window.innerWidth <= 768) {
                    e.preventDefault(); // Prevent link navigation
                    e.stopPropagation(); // Stop bubbling

                    const navItem = this.closest('.nav-item');
                    // Close other open items (optional, but nice for accordion feel)
                    // document.querySelectorAll('.nav-item.active').forEach(item => {
                    //     if (item !== navItem) item.classList.remove('active');
                    // });

                    navItem.classList.toggle('active');
                }
            });
        });
    }

    // Animate elements on scroll
    animateOnScroll();
});

// Perform search
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();

    if (query) {
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
    }
}

// Show toast notification
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1F2937;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    animation: slideUp 0.3s ease;
  `;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Animate elements on scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.fade-in');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}

// Add toast animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes slideDown {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(20px); }
  }
`;
document.head.appendChild(style);
