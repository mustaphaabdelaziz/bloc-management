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
  const datalist = document.getElementById('prestationsList');
  if (!datalist || !specialtyId) return;

  // Clear current options
  datalist.innerHTML = '';

  // Get all prestations from window object or from initial data
  // Assuming we have window.prestationsData or similar
  // For now, since it's server-rendered, we need to store initial options
  if (!window.initialPrestations) {
    window.initialPrestations = Array.from(datalist.children);
  }

  // Add options that match specialty
  window.initialPrestations.forEach(option => {
    const optionSpecialty = option.getAttribute('data-specialty');
    if (!optionSpecialty || optionSpecialty === specialtyId) {
      datalist.appendChild(option.cloneNode(true));
    }
  });
}

/**
 * Filter materials by specialty
 * @param {string} specialtyId - The specialty ID to filter by
 */
function filterMaterialsBySpecialty(specialtyId) {
  if (!specialtyId) return;
  
  // Filter consumable materials
  const consumableDatalist = document.getElementById('consumableMaterialsList');
  if (consumableDatalist) {
    if (!window.initialConsumableMaterials) {
      window.initialConsumableMaterials = Array.from(consumableDatalist.children);
    }
    consumableDatalist.innerHTML = '';
    window.initialConsumableMaterials.forEach(option => {
      const optionSpecialties = option.getAttribute('data-specialty') || '';
      const appliesToAll = option.getAttribute('data-applies-to-all') === 'true';
      const specialtyList = optionSpecialties.split(',').filter(s => s);
      // Show if: applies to all, no specialty assigned, or matches the selected specialty
      if (appliesToAll || specialtyList.length === 0 || specialtyList.includes(specialtyId)) {
        consumableDatalist.appendChild(option.cloneNode(true));
      }
    });
  }

  // Filter patient materials
  const patientDatalist = document.getElementById('patientMaterialsList');
  if (patientDatalist) {
    if (!window.initialPatientMaterials) {
      window.initialPatientMaterials = Array.from(patientDatalist.children);
    }
    patientDatalist.innerHTML = '';
    window.initialPatientMaterials.forEach(option => {
      const optionSpecialties = option.getAttribute('data-specialty') || '';
      const appliesToAll = option.getAttribute('data-applies-to-all') === 'true';
      const specialtyList = optionSpecialties.split(',').filter(s => s);
      // Show if: applies to all, no specialty assigned, or matches the selected specialty
      if (appliesToAll || specialtyList.length === 0 || specialtyList.includes(specialtyId)) {
        patientDatalist.appendChild(option.cloneNode(true));
      }
    });
  }
}

/**
 * Update role dropdown based on selected medical staff
 * Filters rolePlayedId options to only show the staff member's assigned functions
 * @param {HTMLElement} inputElement - The medical staff input element
 */
function updateRolesForStaff(inputElement) {
  const row = inputElement.closest('.staff-row');
  if (!row) return;
  
  const hiddenInput = row.querySelector('input[type="hidden"][name="medicalStaff"]');
  const roleSelect = row.querySelector('select[name="rolePlayedId"]');
  const roleDropdown = row.querySelector('.role-select-dropdown');
  const roleText = row.querySelector('.role-select-text');
  
  if (!roleSelect || !hiddenInput) return;
  
  const staffId = hiddenInput.value;
  const staffName = inputElement.value.trim();

  // Get the staff's fonctions from the datalist
  let allowedFunctions = [];
  const datalist = document.getElementById('medicalStaffList');
  if (datalist && staffName) {
    const options = datalist.querySelectorAll('option');
    for (let option of options) {
      if (option.value === staffName) {
        const fonctionsAttr = option.getAttribute('data-fonctions');
        if (fonctionsAttr) {
          allowedFunctions = fonctionsAttr.split(',').filter(f => f.trim());
        }
        break;
      }
    }
  }

  // Fallback to staffFunctionsMap if no fonctions found from datalist
  if (allowedFunctions.length === 0 && staffId && staffFunctionsMap[staffId]) {
    allowedFunctions = staffFunctionsMap[staffId];
  }

  // Clear current options except the placeholder
  roleSelect.innerHTML = '<option value="">Sélectionner rôle</option>';

  if (!staffId && !staffName) {
    roleSelect.disabled = true;
    if (roleText) roleText.textContent = 'Sélectionner rôle';
    updateRoleDropdownOptions(roleDropdown, [], window.fonctionsOptions || []);
    return;
  }

  if (allowedFunctions.length === 0) {
    roleSelect.disabled = true;
    roleSelect.innerHTML = '<option value="">Ce personnel n\'a pas de fonction</option>';
    if (roleText) roleText.textContent = 'Aucune fonction disponible';
    updateRoleDropdownOptions(roleDropdown, [], window.fonctionsOptions || []);
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

  // Update the custom dropdown to show only allowed functions
  updateRoleDropdownOptions(roleDropdown, allowedFunctions, allFonctions);
  
  // Reset role text
  if (roleText) roleText.textContent = 'Sélectionner rôle';
}

/**
 * Update the custom role dropdown options based on allowed functions
 * @param {HTMLElement} dropdown - The role dropdown element
 * @param {Array} allowedFunctions - Array of allowed function IDs
 * @param {Array} allFonctions - Array of all fonction objects {id, name}
 */
function updateRoleDropdownOptions(dropdown, allowedFunctions, allFonctions) {
  if (!dropdown) return;
  
  // Get all role options except the placeholder
  const options = dropdown.querySelectorAll('.role-select-option');
  
  options.forEach(option => {
    const value = option.getAttribute('data-value');
    if (!value) {
      // Keep placeholder visible
      option.style.display = '';
      return;
    }
    
    // Show/hide based on whether this function is in the allowed list
    if (allowedFunctions.length === 0 || allowedFunctions.includes(value)) {
      option.style.display = '';
    } else {
      option.style.display = 'none';
    }
  });
}

/**
 * Add a new medical staff row
 */
function addStaffRow() {
  const container = document.getElementById('medicalStaffContainer');
  if (!container) return;
  
  const rowCount = container.querySelectorAll('.staff-row').length;
  const newRow = document.createElement('div');
  newRow.className = 'staff-row';
  newRow.innerHTML = `
    <div class="input-wrapper-modern">
      <i class="input-icon-wrapper bi bi-person"></i>
      <input type="text" class="form-control-modern" name="medicalStaffName" list="medicalStaffList" placeholder="Rechercher personnel..." onchange="updateRolesForStaff(this)">
      <input type="hidden" name="medicalStaff" id="medicalStaffId_${rowCount}">
    </div>

    <div class="custom-role-select">
      <select name="rolePlayedId" class="form-select-modern" style="display: none;">
        <option value="">Sélectionner rôle</option>
        ${window.fonctionsOptions ? window.fonctionsOptions.map(fonction => 
          `<option value="${fonction.id}">${fonction.name}</option>`
        ).join('') : ''}
      </select>
      <div class="role-select-trigger">
        <div class="role-select-content">
          <div class="role-select-icon">
            <i class="bi bi-person-badge"></i>
          </div>
          <div class="role-select-text" id="roleText_${rowCount}">Sélectionner rôle</div>
        </div>
        <div class="role-select-arrow">
          <i class="bi bi-chevron-down"></i>
        </div>
      </div>
      <div class="role-select-dropdown">
        <div class="role-select-option" data-value="">
          <div class="role-option-icon">
            <i class="bi bi-dash-circle"></i>
          </div>
          <div class="role-option-text">Sélectionner rôle</div>
        </div>
        ${window.fonctionsOptions ? window.fonctionsOptions.map(fonction => {
          const roleName = fonction.name.toLowerCase();
          let iconClass = 'bi-person-fill';
          if (roleName.includes('anesthésie')) iconClass = 'bi-heart-pulse';
          else if (roleName.includes('instrumentistes')) iconClass = 'bi-tools';
          else if (roleName.includes('hygiene')) iconClass = 'bi-shield-check';
          else if (roleName.includes('médecin') || roleName.includes('anesthésiste')) iconClass = 'bi-stethoscope';
          else if (roleName.includes('panseuse')) iconClass = 'bi-bandage';
          
          return `
            <div class="role-select-option" data-value="${fonction.id}">
              <div class="role-option-icon">
                <i class="bi ${iconClass}"></i>
              </div>
              <div class="role-option-text">${fonction.name}</div>
            </div>
          `;
        }).join('') : ''}
      </div>
    </div>

    <button type="button" class="btn-staff-action btn-delete" onclick="removeStaffRow(this)">
      <i class="bi bi-trash"></i>
    </button>
  `;
  container.appendChild(newRow);

  // Setup datalist handler for the new row
  const input = newRow.querySelector('input[list="medicalStaffList"]');
  const hidden = newRow.querySelector('input[type="hidden"][name="medicalStaff"]');
  if (input && hidden) {
    setupDatalistHandler(input.id || `medicalStaffInput_${rowCount}`, 'medicalStaffList', hidden.id);
  }

  // Initialize role select for the new row
  initializeRoleSelect(newRow, rowCount);
}

/**
 * Remove a medical staff row
 * @param {HTMLElement} button - The delete button element
 */
function removeStaffRow(button) {
  const row = button.closest('.staff-row');
  if (row && document.querySelectorAll('.staff-row').length > 1) {
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
  const prestationInput = document.getElementById('prestationInput');
  const hiddenInput = document.getElementById('prestationId');
  const basePriceDisplay = document.getElementById('basePrice');

  if (!basePriceDisplay || !prestationInput || !hiddenInput) return;

  const selectedId = hiddenInput.value;
  if (selectedId) {
    // Find the option with matching data-id
    const datalist = document.getElementById('prestationsList');
    const options = datalist.querySelectorAll('option');
    for (let option of options) {
      if (option.getAttribute('data-id') === selectedId) {
        const basePriceValue = option.getAttribute('data-price');
        if (basePriceValue && !isNaN(parseFloat(basePriceValue))) {
          const basePrice = parseFloat(basePriceValue);
          basePriceDisplay.textContent = new Intl.NumberFormat('fr-DZ', {
            style: 'currency',
            currency: 'DZD'
          }).format(basePrice);
        } else {
          basePriceDisplay.textContent = 'Prix non disponible';
        }
        return;
      }
    }
  }
  basePriceDisplay.textContent = 'Sélectionnez une prestation';
}

/**
 * Toggle adjusted price visibility based on surgeon selection
 */
function toggleAdjustedPriceVisibility() {
  const surgeonInput = document.getElementById('surgeon');
  const adjustedPriceGroup = document.getElementById('adjustedPrice')?.closest('.form-group');
  
  if (adjustedPriceGroup) {
    // Show adjusted price field only if a surgeon is selected
    if (surgeonInput && surgeonInput.value) {
      adjustedPriceGroup.style.display = 'block';
    } else {
      adjustedPriceGroup.style.display = 'none';
    }
  }
}

/**
 * Add consumable material row
 */
function addConsumableMaterialRow() {
  const container = document.getElementById('consumableMaterialsContainer');
  if (!container) return;
  const rowCount = container.querySelectorAll('.consumable-material-row').length;
  const newRow = document.createElement('div');
  newRow.className = 'row mb-3 consumable-material-row';
  newRow.innerHTML = `
    <div class="col-md-6">
      <div class="input-wrapper-modern">
        <i class="input-icon-wrapper bi bi-tools"></i>
        <input type="text" class="form-control-modern" name="consumableMaterialName" list="consumableMaterialsList" placeholder="Rechercher matériau consommable...">
        <input type="hidden" name="consumableMaterialId" id="consumableMaterialId_${rowCount}">
      </div>
    </div>
    <div class="col-md-4">
      <input type="number" name="consumableMaterialQuantity" class="form-control-modern" min="1" step="0.01" placeholder="Quantité">
    </div>
    <div class="col-md-2">
      <button type="button" class="btn-staff-action btn-delete" onclick="removeConsumableMaterialRow(this)">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
  container.appendChild(newRow);
  
  // Setup datalist handler
  const input = newRow.querySelector('input[list="consumableMaterialsList"]');
  const hidden = newRow.querySelector('input[type="hidden"][name="consumableMaterialId"]');
  if (input && hidden) {
    setupDatalistHandler(input.id || `consumableMaterialInput_${rowCount}`, 'consumableMaterialsList', hidden.id);
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
  const rowCount = container.querySelectorAll('.patient-material-row').length;
  const newRow = document.createElement('div');
  newRow.className = 'row mb-3 patient-material-row';
  newRow.innerHTML = `
    <div class="col-md-5">
      <div class="input-wrapper-modern">
        <i class="input-icon-wrapper bi bi-person"></i>
        <input type="text" class="form-control-modern" name="patientMaterialName" list="patientMaterialsList" placeholder="Rechercher matériau patient...">
        <input type="hidden" name="patientMaterialId" id="patientMaterialId_${rowCount}">
      </div>
    </div>
    <div class="col-md-2">
      <input type="number" name="patientMaterialQuantity" class="form-control-modern" min="1" step="0.01" placeholder="Qté">
    </div>
    <div class="col-md-3">
      <input type="text" name="patientMaterialReference" class="form-control-modern" placeholder="Référence/N° série" title="Référence ou numéro de série du matériau">
    </div>
    <div class="col-md-2">
      <button type="button" class="btn-staff-action btn-delete" onclick="removePatientMaterialRow(this)">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
  container.appendChild(newRow);
  
  // Setup datalist handler
  const input = newRow.querySelector('input[list="patientMaterialsList"]');
  const hidden = newRow.querySelector('input[type="hidden"][name="patientMaterialId"]');
  if (input && hidden) {
    setupDatalistHandler(input.id || `patientMaterialInput_${rowCount}`, 'patientMaterialsList', hidden.id);
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
  const prestationInput = document.getElementById('prestationInput');
  const prestationIdInput = document.getElementById('prestationId');
  const entreeBloc = document.getElementById('entreeBloc');
  const entreeSalle = document.getElementById('entreeSalle');
  const incisionTime = document.getElementById('incisionTime');
  const closingIncisionTime = document.getElementById('closingIncisionTime');

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
  if (!prestationInput.value || !prestationIdInput.value) {
    alert('Veuillez sélectionner une prestation valide.');
    prestationInput.focus();
    return false;
  }
  if (!entreeBloc.value) {
    alert('Veuillez saisir l\'heure d\'entrée au bloc.');
    entreeBloc.focus();
    return false;
  }
  if (!entreeSalle.value) {
    alert('Veuillez saisir l\'heure d\'entrée en salle d\'opération.');
    entreeSalle.focus();
    return false;
  }
  if (!incisionTime.value) {
    alert('Veuillez saisir l\'heure d\'incision.');
    incisionTime.focus();
    return false;
  }
  if (!closingIncisionTime.value) {
    alert('Veuillez saisir l\'heure de fermeture d\'incision.');
    closingIncisionTime.focus();
    return false;
  }

  // Validate chronological order of events
  const entreeBlocDate = new Date(entreeBloc.value);
  const entreeSalleDate = new Date(entreeSalle.value);
  const incisionDate = new Date(incisionTime.value);
  const closingDate = new Date(closingIncisionTime.value);

  if (entreeBlocDate >= entreeSalleDate) {
    alert('L\'entrée au bloc doit être avant l\'entrée en salle.');
    entreeSalle.focus();
    return false;
  }

  if (entreeSalleDate >= incisionDate) {
    alert('L\'entrée en salle doit être avant l\'incision.');
    incisionTime.focus();
    return false;
  }

  if (incisionDate >= closingDate) {
    alert('L\'heure d\'incision doit être avant la fermeture d\'incision.');
    closingIncisionTime.focus();
    return false;
  }

  const materialRows = document.querySelectorAll(
    '.consumable-material-row, .patient-material-row'
  );
  for (let row of materialRows) {
    const hiddenInput = row.querySelector(
      'input[type="hidden"][name="consumableMaterialId"], input[type="hidden"][name="patientMaterialId"]'
    );
    const quantityInput = row.querySelector(
      'input[name="consumableMaterialQuantity"], input[name="patientMaterialQuantity"]'
    );
    if (hiddenInput && hiddenInput.value) {
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
      // For material datalists, the value IS the ID, so direct match
      // For other datalists, match by value (which is the display text)
      const isMatch = opts[i].value === val;
      
      if (isMatch) {
        // For materials: value is already the ID, so use it directly
        const attrValue = opts[i].getAttribute(attr) || opts[i].value;
        hiddenInput.value = attrValue;
        
        // If this is a material input and we have a data-designation, update the display text
        const designation = opts[i].getAttribute('data-designation');
        if (designation && listId.includes('Material')) {
          input.value = designation;
        }

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
  setupDatalistHandler('prestationInput', 'prestationsList', 'prestationId');
  
  // Setup for initial medical staff row
  setupDatalistHandler('medicalStaffInput_0', 'medicalStaffList', 'medicalStaffId_0');
  
  // Setup for initial material rows
  setupDatalistHandler('consumableMaterialInput_0', 'consumableMaterialsList', 'consumableMaterialId_0');
  setupDatalistHandler('patientMaterialInput_0', 'patientMaterialsList', 'patientMaterialId_0');
  
  // Add event listener for surgeon change to toggle adjustedPrice visibility
  const surgeonInput = document.getElementById('surgeon');
  if (surgeonInput) {
    surgeonInput.addEventListener('change', toggleAdjustedPriceVisibility);
    surgeonInput.addEventListener('input', toggleAdjustedPriceVisibility);
  }

  // Set up prestation change listener
  const prestationInput = document.getElementById('prestationInput');
  if (prestationInput) {
    prestationInput.addEventListener('change', updateBasePrice);
    prestationInput.addEventListener('input', updateBasePrice);
  }
  updateBasePrice();
  
  // Initialize adjustedPrice visibility
  toggleAdjustedPriceVisibility();

  // Initialize role filtering for existing medical staff rows
  const existingStaffInputs = document.querySelectorAll('.staff-row input[list="medicalStaffList"]');
  existingStaffInputs.forEach(input => {
    const hidden = input.parentNode.querySelector('input[type="hidden"][name="medicalStaff"]');
    if (hidden && hidden.value) {
      updateRolesForStaff(input);
    }
  });

  // Initialize role selects for existing rows
  const existingStaffRows = document.querySelectorAll('.staff-row');
  existingStaffRows.forEach((row, index) => {
    initializeRoleSelect(row, index);
  });

  // Store initial datalist options for filtering
  if (!window.initialPrestations) {
    const datalist = document.getElementById('prestationsList');
    window.initialPrestations = Array.from(datalist.children);
  }
  if (!window.initialConsumableMaterials) {
    const datalist = document.getElementById('consumableMaterialsList');
    window.initialConsumableMaterials = Array.from(datalist.children);
  }
  if (!window.initialPatientMaterials) {
    const datalist = document.getElementById('patientMaterialsList');
    window.initialPatientMaterials = Array.from(datalist.children);
  }
}

// Initialize Role Selects
function initializeRoleSelect(container, index) {
  const customSelect = container.querySelector('.custom-role-select');
  if (!customSelect) return;

  const selectTrigger = customSelect.querySelector('.role-select-trigger');
  const selectDropdown = customSelect.querySelector('.role-select-dropdown');
  const selectOptions = customSelect.querySelectorAll('.role-select-option');
  const hiddenSelect = customSelect.querySelector('select');
  const roleText = customSelect.querySelector('.role-select-text');

  let isOpen = false;

  // Toggle dropdown
  selectTrigger.addEventListener('click', function(e) {
    e.stopPropagation();
    isOpen = !isOpen;
    toggleDropdown();
  });

  // Handle option selection
  selectOptions.forEach(option => {
    option.addEventListener('click', function() {
      const value = this.getAttribute('data-value');
      const text = this.querySelector('.role-option-text').textContent;

      // Update hidden select
      hiddenSelect.value = value;

      // Update trigger text
      roleText.textContent = text;

      // Update selected state
      selectOptions.forEach(opt => opt.classList.remove('selected'));
      this.classList.add('selected');

      // Close dropdown
      isOpen = false;
      toggleDropdown();

      // Trigger change event
      hiddenSelect.dispatchEvent(new Event('change'));
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!customSelect.contains(e.target)) {
      isOpen = false;
      toggleDropdown();
    }
  });

  // Toggle dropdown function
  function toggleDropdown() {
    if (isOpen) {
      selectDropdown.classList.add('open');
      selectTrigger.classList.add('active');
    } else {
      selectDropdown.classList.remove('open');
      selectTrigger.classList.remove('active');
    }
  }

  // Initialize with default selection
  const defaultValue = hiddenSelect.value || '';
  if (defaultValue) {
    const defaultOption = customSelect.querySelector(`[data-value="${defaultValue}"]`);
    if (defaultOption) {
      defaultOption.click();
    }
  }
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
