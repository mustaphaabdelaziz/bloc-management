/**
 * Surgery Creation Form - JavaScript Logic
 * Handles: prestation filtering, medical staff role filtering, form validation
 */

// Data structure to store staff-to-functions mapping (will be populated from page data)
let staffFunctionsMap = {};

/**
 * Initialize staff-to-functions mapping from page data
 * @param {Object} staffData - Medical staff data with their functions
 */
function initializeStaffFunctionsMap(staffData) {
  staffFunctionsMap = {};
  staffData.forEach(staff => {
    if (staff._id && staff.fonctions) {
      staffFunctionsMap[staff._id] = staff.fonctions.map(f => f._id || f);
    }
  });
}

/**
 * Filter prestation dropdown by surgeon specialty
 * @param {string} specialtyId - The specialty ID to filter by
 */
function filterPrestationsBySpecialty(specialtyId) {
  const prestationSelect = document.getElementById('prestation');
  if (!prestationSelect || !specialtyId) return;

  const options = prestationSelect.querySelectorAll('option');
  options.forEach((option, idx) => {
    // Always show the placeholder option
    if (idx === 0) {
      option.hidden = false;
      return;
    }

    const optionSpecialty = option.getAttribute('data-specialty');
    const isMatch = optionSpecialty === specialtyId;
    option.hidden = !isMatch;
  });

  // Reset selection if current selection is now hidden
  if (prestationSelect.value) {
    const selectedOption = prestationSelect.selectedOptions[0];
    if (selectedOption && selectedOption.hidden) {
      prestationSelect.value = '';
      updateBasePrice(); // Update price display
    }
  }
}

/**
 * Filter materials by specialty
 * @param {string} specialtyId - The specialty ID to filter by
 */
function filterMaterialsBySpecialty(specialtyId) {
  if (!specialtyId) return;
  
  const materialSelects = document.querySelectorAll(
    'select[name="consumableMaterialId"], select[name="patientMaterialId"]'
  );
  
  materialSelects.forEach(select => {
    const options = select.querySelectorAll('option');
    options.forEach((option, idx) => {
      if (idx === 0) return (option.hidden = false);
      
      const optionSpecialties = option.getAttribute('data-specialty') || '';
      const specialtyList = optionSpecialties.split(',').filter(s => s);
      option.hidden = specialtyList.length > 0 && !specialtyList.includes(specialtyId);
    });
    
    // Reset selection if not visible
    if (select.value) {
      const selectedOpt = select.selectedOptions[0];
      if (selectedOpt && selectedOpt.hidden) {
        select.value = '';
      }
    }
  });
}

/**
 * Update role dropdown based on selected medical staff
 * @param {HTMLElement} selectElement - The medical staff select element
 */
function updateRolesForStaff(selectElement) {
  const row = selectElement.closest('.medical-staff-row');
  if (!row) return;
  
  const roleSelect = row.querySelector('select[name="rolePlayedId"]');
  if (!roleSelect) return;
  
  const staffId = selectElement.value;

  // Clear current options except the placeholder
  roleSelect.innerHTML = '<option value="">Sélectionner rôle</option>';

  if (!staffId) {
    roleSelect.disabled = true;
    return;
  }

  const allowedFunctions = staffFunctionsMap[staffId] || [];

  if (allowedFunctions.length === 0) {
    roleSelect.disabled = true;
    roleSelect.innerHTML = '<option value="">Ce personnel n\'a pas de fonction</option>';
    return;
  }

  roleSelect.disabled = false;

  // Get all available functions from the window object set in the view
  const allFonctions = window.fonctionsOptions || [];
  
  // Add only the functions this staff member has
  allFonctions.forEach(fonction => {
    if (allowedFunctions.includes(fonction.id)) {
      const option = document.createElement('option');
      option.value = fonction.id;
      option.textContent = fonction.name;
      roleSelect.appendChild(option);
    }
  });
}

/**
 * Add a new medical staff row
 */
function addStaffRow() {
  const container = document.getElementById('medicalStaffContainer');
  if (!container) return;
  
  const newRow = document.createElement('div');
  newRow.className = 'row mb-3 medical-staff-row';
  newRow.innerHTML = `
    <div class="col-md-5">
      <select name="medicalStaff" class="form-select" onchange="updateRolesForStaff(this)">
        <option value="">Sélectionner personnel</option>
        ${getStaffOptionsHTML()}
      </select>
    </div>
    <div class="col-md-5">
      <select name="rolePlayedId" class="form-select">
        <option value="">Sélectionner rôle</option>
      </select>
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-outline-danger" onclick="removeStaffRow(this)">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
  container.appendChild(newRow);
}

/**
 * Remove a medical staff row
 * @param {HTMLElement} button - The delete button element
 */
function removeStaffRow(button) {
  const row = button.closest('.medical-staff-row');
  if (row && document.querySelectorAll('.medical-staff-row').length > 1) {
    row.remove();
  }
}

/**
 * Get HTML for staff options (used when adding new rows)
 * @returns {string} HTML string of staff options
 */
function getStaffOptionsHTML() {
  // This will be populated from the global window object set in the view
  if (window.staffOptions) {
    return window.staffOptions;
  }
  return '';
}

/**
 * Update base price display
 */
function updateBasePrice() {
  const prestationSelect = document.getElementById('prestation');
  const basePriceDisplay = document.getElementById('basePrice');

  if (!basePriceDisplay || !prestationSelect) return;

  const selectedOption = prestationSelect.selectedOptions[0];
  if (selectedOption && selectedOption.value) {
    const basePriceValue = selectedOption.getAttribute('data-price');
    if (basePriceValue && !isNaN(parseFloat(basePriceValue))) {
      const basePrice = parseFloat(basePriceValue);
      basePriceDisplay.textContent = new Intl.NumberFormat('fr-DZ', {
        style: 'currency',
        currency: 'DZD'
      }).format(basePrice);
    } else {
      basePriceDisplay.textContent = 'Prix non disponible';
    }
  } else {
    basePriceDisplay.textContent = 'Sélectionnez une prestation';
  }
}

/**
 * Add consumable material row
 */
function addConsumableMaterialRow() {
  const container = document.getElementById('consumableMaterialsContainer');
  if (!container) return;
  const newRow = document.createElement('div');
  newRow.className = 'row mb-3 consumable-material-row';
  newRow.innerHTML = `
    <div class="col-md-6">
      <select class="form-select" name="consumableMaterialId">
        <option value="">Choisir un matériau...</option>
        ${window.consumableMaterialOptions || ''}
      </select>
    </div>
    <div class="col-md-4">
      <input type="number" name="consumableMaterialQuantity" class="form-control" min="1" step="0.01" placeholder="Quantité">
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-outline-danger" onclick="removeConsumableMaterialRow(this)">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
  container.appendChild(newRow);
  
  // Apply specialty filter if surgeon is selected
  const surgeon = document.getElementById('surgeon');
  if (surgeon && surgeon.getAttribute('data-selected-specialty')) {
    filterMaterialsBySpecialty(surgeon.getAttribute('data-selected-specialty'));
  }
}

/**
 * Remove consumable material row
 * @param {HTMLElement} button - The delete button element
 */
function removeConsumableMaterialRow(button) {
  const row = button.closest('.consumable-material-row');
  if (row && document.querySelectorAll('.consumable-material-row').length > 1) {
    row.remove();
  }
}

/**
 * Add patient material row
 */
function addPatientMaterialRow() {
  const container = document.getElementById('patientMaterialsContainer');
  if (!container) return;
  const newRow = document.createElement('div');
  newRow.className = 'row mb-3 patient-material-row';
  newRow.innerHTML = `
    <div class="col-md-6">
      <select class="form-select" name="patientMaterialId">
        <option value="">Choisir un matériau patient...</option>
        ${window.patientMaterialOptions || ''}
      </select>
    </div>
    <div class="col-md-4">
      <input type="number" name="patientMaterialQuantity" class="form-control" min="1" step="0.01" placeholder="Quantité">
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-outline-danger" onclick="removePatientMaterialRow(this)">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
  container.appendChild(newRow);
  
  // Apply specialty filter if surgeon is selected
  const surgeon = document.getElementById('surgeon');
  if (surgeon && surgeon.getAttribute('data-selected-specialty')) {
    filterMaterialsBySpecialty(surgeon.getAttribute('data-selected-specialty'));
  }
}

/**
 * Remove patient material row
 * @param {HTMLElement} button - The delete button element
 */
function removePatientMaterialRow(button) {
  const row = button.closest('.patient-material-row');
  if (row && document.querySelectorAll('.patient-material-row').length > 1) {
    row.remove();
  }
}

/**
 * Validate surgery form
 * @returns {boolean} True if form is valid, false otherwise
 */
function validateSurgeryForm() {
  const patientInput = document.getElementById('patient');
  const patientIdInput = document.getElementById('patientId');
  const surgeonInput = document.getElementById('surgeon');
  const surgeonIdInput = document.getElementById('surgeonId');
  const prestationInput = document.getElementById('prestation');
  const beginDateTime = document.getElementById('beginDateTime');
  const endDateTime = document.getElementById('endDateTime');

  if (!patientInput.value || !patientIdInput.value) {
    alert('Veuillez sélectionner un patient valide.');
    patientInput.focus();
    return false;
  }
  if (!surgeonInput.value || !surgeonIdInput.value) {
    alert('Veuillez sélectionner un chirurgien valide.');
    surgeonInput.focus();
    return false;
  }
  if (!prestationInput.value) {
    alert('Veuillez sélectionner une prestation valide.');
    prestationInput.focus();
    return false;
  }
  if (!beginDateTime.value) {
    alert('Veuillez saisir la date et l\'heure de début.');
    beginDateTime.focus();
    return false;
  }
  if (!endDateTime.value) {
    alert('Veuillez saisir la date et l\'heure de fin.');
    endDateTime.focus();
    return false;
  }

  const beginDate = new Date(beginDateTime.value);
  const endDate = new Date(endDateTime.value);
  if (endDate <= beginDate) {
    alert('La date et l\'heure de fin doit être après la date et l\'heure de début.');
    endDateTime.focus();
    return false;
  }

  const materialRows = document.querySelectorAll(
    '.consumable-material-row, .patient-material-row'
  );
  for (let row of materialRows) {
    const select = row.querySelector(
      'select[name="consumableMaterialId"], select[name="patientMaterialId"]'
    );
    const quantityInput = row.querySelector(
      'input[name="consumableMaterialQuantity"], input[name="patientMaterialQuantity"]'
    );
    if (select && select.value) {
      if (!quantityInput.value || quantityInput.value <= 0) {
        alert('Veuillez saisir une quantité valide pour le matériau.');
        quantityInput.focus();
        return false;
      }
    }
  }
  return true;
}

/**
 * Handle datalist selection and link to hidden input
 * @param {string} inputId - ID of the text input
 * @param {string} listId - ID of the datalist
 * @param {string} hiddenInputId - ID of the hidden input
 * @param {string} attr - Attribute name to extract (default: 'data-id')
 */
function setupDatalistHandler(inputId, listId, hiddenInputId, attr = 'data-id') {
  const input = document.getElementById(inputId);
  const datalist = document.getElementById(listId);
  const hiddenInput = document.getElementById(hiddenInputId);

  if (!input || !datalist || !hiddenInput) return;

  // Handler function that checks if value matches a datalist option
  function handleSelection() {
    const val = input.value.trim();
    const opts = datalist.options;

    for (let i = 0; i < opts.length; i++) {
      if (opts[i].value === val) {
        const attrValue = opts[i].getAttribute(attr);
        hiddenInput.value = attrValue;

        if (inputId === 'surgeon') {
          const specialty = opts[i].getAttribute('data-specialty');
          input.setAttribute('data-selected-specialty', specialty);
          // Trigger prestation and material filtering
          setTimeout(() => {
            filterPrestationsBySpecialty(specialty);
            filterMaterialsBySpecialty(specialty);
          }, 10);
        }
        return;
      }
    }
    // No match found
    hiddenInput.value = '';
    if (inputId === 'surgeon') input.removeAttribute('data-selected-specialty');
  }

  // Listen to input event (for typing)
  input.addEventListener('input', handleSelection);
  
  // Also listen to change event (for datalist selection)
  input.addEventListener('change', handleSelection);
  
  // Also listen to blur to ensure selection is processed
  input.addEventListener('blur', handleSelection);
}


/**
 * Initialize the surgery form
 * Called when the page loads
 */
function initializeSurgeryForm() {
  // Set up datalist handlers
  setupDatalistHandler('patient', 'patientsList', 'patientId');
  setupDatalistHandler('surgeon', 'surgeonsList', 'surgeonId');
  
  // Add event listener for surgeon change to toggle adjustedPrice visibility
  const surgeonInput = document.getElementById('surgeon');
  if (surgeonInput) {
    surgeonInput.addEventListener('change', toggleAdjustedPriceVisibility);
    surgeonInput.addEventListener('input', toggleAdjustedPriceVisibility);
  }

  // Set up prestation change listener
  const prestationSelect = document.getElementById('prestation');
  if (prestationSelect) {
    prestationSelect.addEventListener('change', updateBasePrice);
  }
  updateBasePrice();
  
  // Initialize adjustedPrice visibility
  toggleAdjustedPriceVisibility();

  // Initialize role filtering for existing medical staff rows
  const existingStaffSelects = document.querySelectorAll(
    '.medical-staff-row select[name="medicalStaff"]'
  );
  existingStaffSelects.forEach(select => {
    if (select.value) {
      updateRolesForStaff(select);
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize staff-to-functions mapping if data is available
  if (typeof staffData !== 'undefined' && staffData) {
    initializeStaffFunctionsMap(staffData);
  }
  
  // Call form initialization
  initializeSurgeryForm();
});
