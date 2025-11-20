// Payment Module JavaScript
// Handles payment form validation, modal interactions, and dynamic updates

document.addEventListener('DOMContentLoaded', function() {
    // Initialize payment-related functionality
    initializePaymentModals();
    initializePaymentForms();
    initializePaymentFilters();
});

/**
 * Initialize payment modal interactions
 */
function initializePaymentModals() {
    const recordPaymentModal = document.getElementById('recordPaymentModal');
    if (!recordPaymentModal) return;

    // Handle modal show event
    recordPaymentModal.addEventListener('show.bs.modal', function(event) {
        const button = event.relatedTarget;
        if (!button) return;

        const paymentId = button.getAttribute('data-payment-id');
        const remaining = parseFloat(button.getAttribute('data-remaining') || 0);
        const surgeryCode = button.getAttribute('data-surgery-code') || '';

        const form = document.getElementById('recordPaymentForm');
        if (!form) return;

        // Update form action
        form.action = `/payments/${paymentId}/record`;

        // Update modal content
        const remainingAmountEl = document.getElementById('remainingAmount');
        const surgeryCodeEl = document.getElementById('surgeryCode');

        if (remainingAmountEl) {
            remainingAmountEl.textContent = remaining.toFixed(2);
        }
        if (surgeryCodeEl) {
            surgeryCodeEl.textContent = surgeryCode;
        }

        // Set amount input constraints
        const amountInput = form.querySelector('input[name="amount"]');
        if (amountInput) {
            amountInput.max = remaining.toFixed(2);
            amountInput.value = ''; // Clear previous value
        }

        // Reset form
        form.reset();
    });

    // Handle modal hide event
    recordPaymentModal.addEventListener('hide.bs.modal', function() {
        const form = document.getElementById('recordPaymentForm');
        if (form) {
            form.reset();
        }
    });
}

/**
 * Initialize payment form validation
 */
function initializePaymentForms() {
    const recordPaymentForm = document.getElementById('recordPaymentForm');
    if (!recordPaymentForm) return;

    recordPaymentForm.addEventListener('submit', function(event) {
        const amountInput = this.querySelector('input[name="amount"]');
        if (!amountInput) return;

        const maxAmount = parseFloat(amountInput.max);
        const enteredAmount = parseFloat(amountInput.value);

        // Validate amount
        if (isNaN(enteredAmount) || enteredAmount <= 0) {
            event.preventDefault();
            showAlert('Le montant doit être supérieur à 0', 'danger');
            return false;
        }

        if (enteredAmount > maxAmount) {
            event.preventDefault();
            showAlert(`Le montant ne peut pas dépasser ${maxAmount.toFixed(2)} MAD`, 'danger');
            return false;
        }

        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Traitement...';
        }
    });
}

/**
 * Initialize payment filter functionality
 */
function initializePaymentFilters() {
    const filterForm = document.querySelector('.payment-filters form');
    if (!filterForm) return;

    // Auto-submit on filter change (optional - can be enabled if desired)
    // const filterInputs = filterForm.querySelectorAll('select, input');
    // filterInputs.forEach(input => {
    //     input.addEventListener('change', function() {
    //         filterForm.submit();
    //     });
    // });

    // Clear filters functionality
    const clearBtn = filterForm.querySelector('button[type="button"]');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            const inputs = filterForm.querySelectorAll('select, input');
            inputs.forEach(input => {
                if (input.type === 'date') {
                    input.value = '';
                } else {
                    input.selectedIndex = 0;
                }
            });
            filterForm.submit();
        });
    }
}

/**
 * Show alert messages
 */
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

/**
 * Format currency amounts
 */
function formatCurrency(amount, currency = 'MAD') {
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Calculate payment completion percentage
 */
function calculateCompletionPercentage(paid, total) {
    if (total === 0) return 100;
    return Math.round((paid / total) * 100);
}

/**
 * Update payment progress bar
 */
function updateProgressBar(elementId, paid, total) {
    const progressBar = document.getElementById(elementId);
    if (!progressBar) return;

    const percentage = calculateCompletionPercentage(paid, total);
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
}

/**
 * Handle payment status updates (for future real-time updates)
 */
function updatePaymentStatus(paymentId, newStatus) {
    const statusElements = document.querySelectorAll(`[data-payment-id="${paymentId}"] .payment-status`);
    statusElements.forEach(element => {
        element.className = `badge bg-${getStatusColor(newStatus)}`;
        element.textContent = getStatusText(newStatus);
    });
}

/**
 * Get status color class
 */
function getStatusColor(status) {
    const colors = {
        'pending': 'info',
        'partial': 'warning',
        'complete': 'success',
        'cancelled': 'secondary'
    };
    return colors[status] || 'secondary';
}

/**
 * Get status text
 */
function getStatusText(status) {
    const texts = {
        'pending': 'En attente',
        'partial': 'Partiel',
        'complete': 'Complet',
        'cancelled': 'Annulé'
    };
    return texts[status] || status;
}

/**
 * Export functions for global use
 */
window.PaymentUtils = {
    formatCurrency,
    calculateCompletionPercentage,
    updateProgressBar,
    updatePaymentStatus,
    showAlert
};
