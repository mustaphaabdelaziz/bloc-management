// public/js/material.js
// Material Management - Client Side Validation and Utilities

/**
 * Initialize material import functionality
 */
document.addEventListener('DOMContentLoaded', function() {
  initializeMaterialImportForm();
  setupMaterialTemplateDownload();
});

/**
 * Initialize the import form with validation and file handling
 */
function initializeMaterialImportForm() {
  const importForm = document.getElementById('importForm');
  const fileInput = document.getElementById('excelFileInput');
  const importBtn = document.getElementById('importBtn');

  if (!importForm) return;

  // File input change validation
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        validateMaterialFileSelection(file, importBtn);
      }
    });
  }

  // Form submit handler
  if (importForm) {
    importForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const file = fileInput.files[0];
      if (!file) {
        showMaterialNotification('Veuillez sélectionner un fichier', 'warning');
        return;
      }

      if (!validateMaterialFileType(file)) {
        showMaterialNotification('Format de fichier invalide. Utilisez .xlsx ou .xls', 'error');
        return;
      }

      if (!validateMaterialFileSize(file)) {
        showMaterialNotification('Le fichier dépasse la taille maximale de 10 MB', 'error');
        return;
      }

      // Submit form with loading state
      submitMaterialImportForm(importForm, importBtn);
    });
  }
}

/**
 * Validate file selection
 */
function validateMaterialFileSelection(file, importBtn) {
  const fileError = document.getElementById('materialFileError');
  const fileInfo = document.getElementById('materialFileInfo');

  // Remove previous error/info if exists
  if (fileError) fileError.remove();
  if (fileInfo) fileInfo.remove();

  if (!validateMaterialFileType(file)) {
    showMaterialFileError('Format invalide. Utilisez .xlsx ou .xls');
    importBtn.disabled = true;
    return;
  }

  if (!validateMaterialFileSize(file)) {
    showMaterialFileError('Le fichier dépasse 10 MB');
    importBtn.disabled = true;
    return;
  }

  // Show file info
  const fileSize = (file.size / 1024).toFixed(2);
  showMaterialFileInfo(`${file.name} (${fileSize} KB) - Prêt à importer`);
  importBtn.disabled = false;
}

/**
 * Validate file type
 */
function validateMaterialFileType(file) {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  const allowedExtensions = ['.xlsx', '.xls'];
  
  const hasValidMime = allowedTypes.includes(file.type);
  const hasValidExtension = allowedExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );

  return hasValidMime || hasValidExtension;
}

/**
 * Validate file size (10MB for materials)
 */
function validateMaterialFileSize(file) {
  const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
  return file.size <= maxSizeInBytes;
}

/**
 * Show file error message
 */
function showMaterialFileError(message) {
  const fileInput = document.getElementById('excelFileInput');
  const errorDiv = document.createElement('div');
  errorDiv.id = 'materialFileError';
  errorDiv.className = 'alert alert-danger mt-2';
  errorDiv.innerHTML = `<i class="bi bi-exclamation-circle me-2"></i>${message}`;
  fileInput.parentNode.appendChild(errorDiv);
}

/**
 * Show file info message
 */
function showMaterialFileInfo(message) {
  const fileInput = document.getElementById('excelFileInput');
  const infoDiv = document.createElement('div');
  infoDiv.id = 'materialFileInfo';
  infoDiv.className = 'alert alert-info mt-2';
  infoDiv.innerHTML = `<i class="bi bi-check-circle me-2"></i>${message}`;
  fileInput.parentNode.appendChild(infoDiv);
}

/**
 * Submit import form with loading state
 */
function submitMaterialImportForm(form, importBtn) {
  const originalText = importBtn.innerHTML;
  
  // Set loading state
  importBtn.disabled = true;
  importBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Importation en cours...';

  // Submit the form
  form.submit();

  // Note: This will be replaced by the server response, so we don't reset the button
}

/**
 * Show notification message
 */
function showMaterialNotification(message, type = 'info') {
  const alertType = type === 'error' ? 'danger' : type;
  const icon = type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle';
  
  // Create alert element
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${alertType} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    <i class="bi bi-${icon} me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
  `;

  // Insert at the top of the modal body
  const modalBody = document.querySelector('#importExcelModal .modal-body');
  if (modalBody) {
    modalBody.insertBefore(alertDiv, modalBody.firstChild);
  }
}

/**
 * Setup template download functionality
 */
function setupMaterialTemplateDownload() {
  const downloadBtn = document.getElementById('downloadMaterialTemplate');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      downloadMaterialExcelTemplate();
    });
  }
}

/**
 * Download Excel template for materials
 */
function downloadMaterialExcelTemplate() {
  try {
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
      alert('La bibliothèque Excel n\'est pas disponible. Le modèle ne peut pas être généré.');
      return;
    }

    // Create workbook and worksheet with sample data
    const ws_data = [
      ['Code', 'Désignation', 'Prix HT (DA)', 'TVA (%)', 'Catégorie', 'Unité de Mesure', 'Spécialité', 'Marque'],
      ['MAT-001', 'Compresse stérile 10x10', 150, 19, 'consumable', 'Boîte', 'Chirurgie Générale', 'MedSupply'],
      ['MAT-002', 'Seringue 10ml', 80, 19, 'consumable', 'Unité', 'Anesthésie', 'BD Medical'],
      ['MAT-003', 'Prothèse de hanche', 450000, 19, 'patient', 'Unité', 'Orthopédie', 'Zimmer'],
      ['MAT-004', 'Cathéter veineux central', 12000, 19, 'patient', 'Unité', 'Cardiologie', 'Arrow'],
      ['MAT-005', 'Fil de suture absorbable', 2500, 19, 'consumable', 'Boîte', '', 'Ethicon']
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },  // Code
      { wch: 35 },  // Désignation
      { wch: 15 },  // Prix HT
      { wch: 10 },  // TVA
      { wch: 15 },  // Catégorie
      { wch: 18 },  // Unité de Mesure
      { wch: 25 },  // Spécialité
      { wch: 15 }   // Marque
    ];

    // Create instructions sheet
    const notes_data = [
      ['INSTRUCTIONS POUR L\'IMPORT DES MATÉRIAUX'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['Code', 'Code unique du matériau (OBLIGATOIRE, ne sera pas auto-généré)'],
      ['Désignation', 'Nom complet du matériau médical'],
      ['Prix HT (DA)', 'Prix hors taxe en Dinars Algériens (nombre positif)'],
      ['TVA (%)', 'Taux de TVA: 0, 9, ou 19 (sans le symbole %)'],
      ['Catégorie', '"consumable" pour les consommables, "patient" pour matériaux patients'],
      ['Unité de Mesure', 'Unité de mesure (ex: Boîte, Unité, Pièce)'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['Spécialité', 'Nom de la spécialité (doit correspondre à une existante)'],
      ['Marque', 'Marque ou fabricant du matériau'],
      [''],
      ['REMARQUES IMPORTANTES:'],
      ['- Le CODE est OBLIGATOIRE et doit être unique'],
      ['- Les lignes avec des codes déjà existants seront ignorées'],
      ['- Les lignes avec des codes dupliqués dans le fichier seront ignorées'],
      ['- Catégorie: "consumable" pour les consommables clinique'],
      ['- Catégorie: "patient" pour les matériaux facturés au patient'],
      ['- Taille maximale du fichier: 10 MB']
    ];

    const wsNotes = XLSX.utils.aoa_to_sheet(notes_data);
    wsNotes['!cols'] = [{ wch: 25 }, { wch: 60 }];

    // Create workbook and add worksheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matériaux');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    // Download file
    XLSX.writeFile(wb, 'Modele_Import_Materiaux.xlsx');
  } catch (error) {
    console.error('Error generating template:', error);
    alert('Erreur lors de la génération du modèle: ' + error.message);
  }
}
