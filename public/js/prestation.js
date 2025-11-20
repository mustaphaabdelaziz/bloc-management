// public/js/prestation.js
// Prestation Management - Client Side Validation and Utilities

/**
 * Initialize prestation import functionality
 */
document.addEventListener('DOMContentLoaded', function() {
  initializeImportForm();
  setupTemplateDownload();
});

/**
 * Initialize the import form with validation and file handling
 */
function initializeImportForm() {
  const importForm = document.getElementById('importForm');
  const fileInput = document.getElementById('excelFileInput');
  const importBtn = document.getElementById('importBtn');

  if (!importForm) return;

  // File input change validation
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        validateFileSelection(file, importBtn);
      }
    });
  }

  // Form submit handler
  if (importForm) {
    importForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const file = fileInput.files[0];
      if (!file) {
        showNotification('Veuillez sélectionner un fichier', 'warning');
        return;
      }

      if (!validateFileType(file)) {
        showNotification('Format de fichier invalide. Utilisez .xlsx ou .xls', 'error');
        return;
      }

      if (!validateFileSize(file)) {
        showNotification('Le fichier dépasse la taille maximale de 5 MB', 'error');
        return;
      }

      // Submit form with loading state
      submitImportForm(importForm, importBtn);
    });
  }
}

/**
 * Validate file selection
 */
function validateFileSelection(file, importBtn) {
  const fileError = document.getElementById('fileError');
  const fileInfo = document.getElementById('fileInfo');

  // Remove previous error/info if exists
  if (fileError) fileError.remove();
  if (fileInfo) fileInfo.remove();

  if (!validateFileType(file)) {
    showFileError('Format invalide. Utilisez .xlsx ou .xls');
    importBtn.disabled = true;
    return;
  }

  if (!validateFileSize(file)) {
    showFileError('Le fichier dépasse 5 MB');
    importBtn.disabled = true;
    return;
  }

  // Show file info
  const fileSize = (file.size / 1024).toFixed(2);
  showFileInfo(`${file.name} (${fileSize} KB) - Prêt à importer`);
  importBtn.disabled = false;
}

/**
 * Validate file type
 */
function validateFileType(file) {
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
 * Validate file size
 */
function validateFileSize(file) {
  const maxSizeInBytes = 5 * 1024 * 1024; // 5 MB
  return file.size <= maxSizeInBytes;
}

/**
 * Show file error message
 */
function showFileError(message) {
  const fileInput = document.getElementById('excelFileInput');
  const errorDiv = document.createElement('div');
  errorDiv.id = 'fileError';
  errorDiv.className = 'alert alert-danger mt-2';
  errorDiv.innerHTML = `<i class="bi bi-exclamation-circle me-2"></i>${message}`;
  fileInput.parentNode.appendChild(errorDiv);
}

/**
 * Show file info message
 */
function showFileInfo(message) {
  const fileInput = document.getElementById('excelFileInput');
  const infoDiv = document.createElement('div');
  infoDiv.id = 'fileInfo';
  infoDiv.className = 'alert alert-info mt-2';
  infoDiv.innerHTML = `<i class="bi bi-check-circle me-2"></i>${message}`;
  fileInput.parentNode.appendChild(infoDiv);
}

/**
 * Submit import form with loading state
 */
function submitImportForm(form, importBtn) {
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
function showNotification(message, type = 'info') {
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
function setupTemplateDownload() {
  const downloadBtn = document.getElementById('downloadTemplate');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      downloadExcelTemplate();
    });
  }
}

/**
 * Download Excel template
 */
function downloadExcelTemplate() {
  try {
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
      alert('La bibliothèque Excel n\'est pas disponible. Le modèle ne peut pas être généré.');
      return;
    }

    // Create workbook and worksheet
    const ws_data = [
      ['Code', 'Désignation', 'Spécialité', 'Prix HT (DA)', 'TVA (%)', 'Durée (minutes)', 'Unité Dépassement (min)', 'Frais Dépassement (DA)', 'Frais Urgents (%)'],
      ['', 'Pontage Aorto-Coronarien', 'Cardiologie', 250000, 9, 120, 15, 500, 10],
      ['', 'Appendicectomie', 'Chirurgie Générale', 80000, 9, 45, 15, 300, 0],
      ['', 'Césarienne', 'Gynécologie', 150000, 9, 90, 15, 400, 20]
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Style header row
    ws['A1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    ws['B1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    ws['C1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    ws['D1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    ws['E1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    ws['F1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    ws['G1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    ws['H1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };
    ws['I1'].s = { fill: { fgColor: { rgb: '4472C4' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 20 },
      { wch: 18 },
      { wch: 15 }
    ];

    // Create workbook and add worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prestations');

    // Download file
    XLSX.writeFile(wb, 'Modele_Prestations.xlsx');
  } catch (error) {
    console.error('Error generating template:', error);
    alert('Erreur lors de la génération du modèle: ' + error.message);
  }
}

/**
 * Clear search functionality (reuse from global)
 */
function clearSearch(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }
}
