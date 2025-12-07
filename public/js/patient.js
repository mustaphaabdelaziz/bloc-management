// public/js/patient.js
// Client-side logic for patient birthdate/presumed age handling

document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('birthdateKnownToggle');
    const fullBirthdateSection = document.getElementById('fullBirthdateSection');
    const presumedSection = document.getElementById('presumedSection');
    
    const dateOfBirthInput = document.getElementById('dateOfBirth');
    const presumedAgeInput = document.getElementById('presumedAge');
    const presumedYearInput = document.getElementById('presumedYear');
    
    if (!toggle) return; // Not on patient form page
    
    // Toggle between full birthdate and presumed age sections
    toggle.addEventListener('change', function() {
        if (this.checked) {
            // Full birthdate known
            fullBirthdateSection.style.display = '';
            presumedSection.style.display = 'none';
            
            // Clear presumed fields
            presumedAgeInput.value = '';
            presumedYearInput.value = '';
        } else {
            // Date unknown - use presumed
            fullBirthdateSection.style.display = 'none';
            presumedSection.style.display = '';
            
            // Clear full birthdate
            dateOfBirthInput.value = '';
        }
    });
    
    // Auto-calculate year from age
    presumedAgeInput.addEventListener('input', function() {
        const age = parseInt(this.value);
        if (!isNaN(age) && age >= 0 && age <= 120) {
            const currentYear = new Date().getFullYear();
            const presumedYear = currentYear - age;
            presumedYearInput.value = presumedYear;
        } else {
            presumedYearInput.value = '';
        }
    });
    
    // Auto-calculate age from year
    presumedYearInput.addEventListener('input', function() {
        const year = parseInt(this.value);
        const currentYear = new Date().getFullYear();
        if (!isNaN(year) && year > 1900 && year <= currentYear) {
            const age = currentYear - year;
            presumedAgeInput.value = age;
        } else {
            presumedAgeInput.value = '';
        }
    });
    
    // Form submission validation - ensure mutual exclusivity
    const form = document.querySelector('.patient-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            // Validate required fields
            const firstNameInput = document.getElementById('firstName');
            const lastNameInput = document.getElementById('lastName');
            const ninInput = document.getElementById('nin');
            
            // Check if required fields are filled
            if (!firstNameInput.value.trim() || !lastNameInput.value.trim() || !ninInput.value.trim()) {
                e.preventDefault();
                alert('Veuillez remplir tous les champs obligatoires (Prénom, Nom, NIN)');
                return false;
            }
            
            // If full birthdate is filled, clear presumed fields
            if (dateOfBirthInput.value) {
                presumedAgeInput.value = '';
                presumedYearInput.value = '';
            }
            // If presumed fields are filled, clear full birthdate
            else if (presumedAgeInput.value || presumedYearInput.value) {
                dateOfBirthInput.value = '';
            }
            
            return true;
        });
    }
});
