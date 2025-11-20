// public/js/forms.js
// Form validation and interaction functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeFormValidation();
    initializePasswordConfirmation();
    initializeFormEnhancements();
});

function initializeFormValidation() {
    // Bootstrap form validation
    const forms = document.querySelectorAll('.needs-validation');

    Array.from(forms).forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
}

function initializePasswordConfirmation() {
    const confirmPasswordField = document.getElementById('confirmedPassword');
    const passwordField = document.getElementById('registerPassword');
    const checkMatchElement = document.getElementById('checkPasswordMatch');

    if (confirmPasswordField && passwordField && checkMatchElement) {
        confirmPasswordField.addEventListener('keyup', function() {
            const password = passwordField.value;
            const confirmPassword = confirmPasswordField.value;

            if (password !== confirmPassword) {
                checkMatchElement.innerHTML = 'Le mot de passe ne correspond pas !';
                checkMatchElement.style.color = 'red';
            } else {
                checkMatchElement.innerHTML = 'Correspondance du mot de passe !';
                checkMatchElement.style.color = 'green';
            }
        });
    }
}

function initializeFormEnhancements() {
    // Auto-calculate totals
    initializeTotalCalculations();

    // Initialize select enhancements
    initializeSelectEnhancements();

    // Initialize date/time pickers
    initializeDateTimePickers();
}

function initializeTotalCalculations() {
    const calculateInputs = document.querySelectorAll('[data-calculate]');
    const totalElement = document.getElementById('total');

    if (calculateInputs.length > 0 && totalElement) {
        calculateInputs.forEach(input => {
            input.addEventListener('input', calculateTotal);
        });

        // Initial calculation
        calculateTotal();
    }
}

function calculateTotal() {
    const inputs = document.querySelectorAll('[data-calculate]');
    let total = 0;

    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });

    const totalElement = document.getElementById('total');
    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }
}

function initializeSelectEnhancements() {
    // Add search functionality to select elements with data-search attribute
    const searchableSelects = document.querySelectorAll('select[data-search]');

    searchableSelects.forEach(select => {
        // This would require additional libraries like Select2 or Choices.js
        // For now, we'll keep it simple
        select.addEventListener('change', function() {
            this.classList.add('selected');
        });
    });
}

function initializeDateTimePickers() {
    // Add datetime-local input enhancements
    const dateTimeInputs = document.querySelectorAll('input[type="datetime-local"]');

    dateTimeInputs.forEach(input => {
        // Set default value to current date/time if empty
        if (!input.value) {
            const now = new Date();
            const formatted = now.toISOString().slice(0, 16); // Format for datetime-local
            input.value = formatted;
        }
    });
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'currency',
        currency: 'DZD'
    }).format(amount);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhoneNumber(phone) {
    const phoneRegex = /^(\+213|0)[5-7]\d{8}$/; // Algerian phone number format
    return phoneRegex.test(phone);
}

function showFormError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const feedback = field.parentNode.querySelector('.invalid-feedback');

    field.classList.add('is-invalid');
    if (feedback) {
        feedback.textContent = message;
    }
}

function clearFormError(fieldId) {
    const field = document.getElementById(fieldId);
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
}