// public/js/utils.js
// General utility functions and helpers

// Confirmation dialogs
function confirmDelete(message = 'Êtes-vous sûr de vouloir supprimer cet élément ?') {
    return confirm(message);
}

function confirmAction(message = 'Êtes-vous sûr de vouloir effectuer cette action ?') {
    return confirm(message);
}

// Currency and number formatting
function formatCurrency(amount, currency = 'DZD', locale = 'fr-DZ') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatNumber(number, locale = 'fr-DZ') {
    return new Intl.NumberFormat(locale).format(number);
}

function formatPercentage(value, decimals = 2) {
    return `${(value * 100).toFixed(decimals)}%`;
}

// Date and time formatting
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };

    return new Intl.DateTimeFormat('fr-DZ', { ...defaultOptions, ...options }).format(new Date(date));
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat('fr-DZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

function formatTime(date) {
    return new Intl.DateTimeFormat('fr-DZ', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// Duration formatting
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}min`;
}

// DOM manipulation utilities
function showElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.style.display = 'block';
    }
}

function hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.style.display = 'none';
    }
}

function toggleElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
}

function addClass(selector, className) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.add(className);
    }
}

function removeClass(selector, className) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.remove(className);
    }
}

function toggleClass(selector, className) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.toggle(className);
    }
}

// Table utilities
function makeTableRowsClickable(tableSelector, callback) {
    const rows = document.querySelectorAll(`${tableSelector} tbody tr`);
    rows.forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', function() {
            if (callback) {
                callback(this);
            }
        });
    });
}

function sortTable(tableSelector, columnIndex) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();

        // Try to parse as numbers
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }

        // String comparison
        return aValue.localeCompare(bValue);
    });

    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
}

// Loading states
function showLoading(buttonSelector) {
    const button = document.querySelector(buttonSelector);
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Chargement...';
    }
}

function hideLoading(buttonSelector, originalText = 'Soumettre') {
    const button = document.querySelector(buttonSelector);
    if (button) {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// AJAX utilities
function makeAjaxRequest(url, method = 'GET', data = null) {
    return fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : null
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
}

// Local storage utilities
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Local storage not available:', e);
    }
}

function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.warn('Local storage not available:', e);
        return defaultValue;
    }
}

function removeLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn('Local storage not available:', e);
    }
}

// Debounce utility for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        formatDate,
        formatDuration,
        confirmDelete,
        makeAjaxRequest
    };
}