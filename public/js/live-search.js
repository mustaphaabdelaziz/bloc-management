/**
 * Google-style live search implementation
 * Usage: Initialize with initLiveSearch(config)
 * 
 * Config options:
 * - searchInputId: ID of search input element
 * - formId: ID of search form (optional)
 * - contentSelector: CSS selector of content to update
 * - filterSelectors: Array of additional filter element selectors
 * - debounceTime: Milliseconds to wait before searching (default: 500)
 * - endpoint: URL endpoint to fetch from (default: current page URL)
 */

function initLiveSearch(config) {
    const {
        searchInputId,
        formId,
        contentSelector,
        filterSelectors = [],
        debounceTime = 500,
        endpoint = window.location.pathname
    } = config;

    let searchTimeout;
    const searchInput = document.getElementById(searchInputId);
    const contentElement = document.querySelector(contentSelector);
    const filters = filterSelectors.map(sel => document.querySelector(sel));

    if (!searchInput || !contentElement) {
        console.warn('Live search: Missing required elements', { searchInputId, contentSelector });
        return;
    }

    /**
     * Perform live search via AJAX
     */
    async function performSearch() {
        try {
            const params = new URLSearchParams();
            
            // Add search input value
            const searchValue = searchInput.value.trim();
            if (searchValue) {
                params.append('search', searchValue);
            }

            // Add all filter values
            filters.forEach(filterEl => {
                if (filterEl && filterEl.name && filterEl.value) {
                    params.append(filterEl.name, filterEl.value);
                }
            });

            const url = `${endpoint}?${params.toString()}`;
            
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const html = await response.text();
                
                // Parse the response
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newContent = doc.querySelector(contentSelector);
                
                // Update content if found
                if (newContent) {
                    contentElement.innerHTML = newContent.innerHTML;
                }
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            // Always keep focus on search input
            searchInput.focus();
        }
    }

    /**
     * Debounce search - wait for user to stop typing
     */
    function debounceSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, debounceTime);
    }

    // Event listeners
    searchInput.addEventListener('input', debounceSearch);
    
    // Add listeners to all filters
    filters.forEach(filterEl => {
        if (filterEl) {
            filterEl.addEventListener('change', performSearch);
        }
    });

    // Focus on page load if search value exists
    document.addEventListener('DOMContentLoaded', function() {
        if (searchInput.value) {
            searchInput.focus();
        }
    });
}
