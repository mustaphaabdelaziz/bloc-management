// public/js/navigation.js
// Navigation and UI interaction functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation
    initializeNavigation();
    initializeAlerts();
    initializeDropdowns();
});

function initializeNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === currentPath || (href !== '/' && currentPath.startsWith(href)))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function initializeAlerts() {
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
}

function initializeDropdowns() {
    // Bootstrap 5 handles dropdowns automatically via data-bs-toggle="dropdown"
    // No manual initialization needed - this was causing conflicts

    // Handle click outside to close dropdowns (standard Bootstrap behavior)
    document.addEventListener('click', function(e) {
        // Only close if click is outside dropdown-related elements
        if (!e.target.closest('.dropdown') && !e.target.closest('[data-bs-toggle="dropdown"]')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });

    // Ensure dropdown menus have proper positioning
    const dropdownMenus = document.querySelectorAll('.dropdown-menu');
    dropdownMenus.forEach(menu => {
        // Ensure menu has display properties set properly
        menu.style.position = menu.style.position || 'absolute';
    });
}

// Utility functions for navigation
function navigateTo(path) {
    window.location.href = path;
}

function confirmNavigation(message, path) {
    if (confirm(message)) {
        navigateTo(path);
    }
}

// Mobile menu toggle (if needed)
function toggleMobileMenu() {
    const navbar = document.querySelector('.navbar-collapse');
    if (navbar) {
        const bsCollapse = new bootstrap.Collapse(navbar, {
            toggle: true
        });
    }
}