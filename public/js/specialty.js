// public/js/specialty.js

/**
 * Download Excel template for specialties import
 * Uses the XLSX library loaded in the view to generate a sample file
 */
document.addEventListener('DOMContentLoaded', function() {
  const downloadTemplateBtn = document.getElementById('downloadTemplate');
  
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', function(e) {
      e.preventDefault();
      downloadTemplateViaLibrary();
    });
  }

  // Handle form submission for import
  const importForm = document.getElementById('importForm');
  if (importForm) {
    importForm.addEventListener('submit', function(e) {
      const fileInput = document.getElementById('excelFileInput');
      
      if (!fileInput.value) {
        e.preventDefault();
        alert('Veuillez sélectionner un fichier Excel');
        return;
      }

      // Validate file type
      const file = fileInput.files[0];
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      
      if (!validTypes.includes(file.type)) {
        e.preventDefault();
        alert('Veuillez sélectionner un fichier Excel valide (.xlsx ou .xls)');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        e.preventDefault();
        alert('Le fichier est trop volumineux (max: 5 MB)');
        return;
      }
    });
  }
});

/**
 * Generate and download template using XLSX library
 */
function downloadTemplateViaLibrary() {
  if (typeof XLSX === 'undefined') {
    alert('La librairie XLSX n\'est pas chargée. Veuillez utiliser le lien "Télécharger (Serveur)"');
    return;
  }

  const worksheetData = [
    ['Code', 'Nom', 'Description'],
    ['CARDIO', 'Cardiologie', 'Spécialité des maladies du cœur et des vaisseaux'],
    ['CHGEN', 'Chirurgie Générale', 'Chirurgie générale et interventions diverses'],
    ['GYNECO', 'Gynécologie', 'Obstétrique et gynécologie'],
    ['ORTHO', 'Orthopédie', 'Chirurgie des os et des articulations'],
    ['NEURO', 'Neurochirurgie', 'Chirurgie du système nerveux'],
    ['OPHTALMOLOGUE', 'Ophtalmologie', 'Chirurgie et maladies des yeux'],
    ['ORL', 'Oto-Rhino-Laryngologie', 'Chirurgie de l\'oreille, nez et gorge'],
    ['ANESTHESIE', 'Anesthésiologie', 'Anesthésie et soins périopératoires']
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 50 }
  ];

  const notesData = [
    ['INSTRUCTIONS POUR L\'IMPORT DES SPÉCIALITÉS'],
    [''],
    ['COLONNES OBLIGATOIRES:'],
    ['Code', 'Code unique et court pour la spécialité (ex: CARDIO)'],
    ['Nom', 'Nom complet et lisible de la spécialité (ex: Cardiologie)'],
    [''],
    ['COLONNES OPTIONNELLES:'],
    ['Description', 'Brève description de la spécialité (jusqu\'à 500 caractères)'],
    [''],
    ['REMARQUES IMPORTANTES:'],
    ['- Le code doit être unique dans le système'],
    ['- Le nom doit être unique également'],
    ['- Le code doit contenir au moins 2 caractères'],
    ['- Taille maximale du fichier: 5 MB'],
    ['- Les caractères spéciaux sont autorisés dans la description'],
    ['- Les lignes vides seront ignorées']
  ];

  const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
  wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Spécialités');
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

  XLSX.writeFile(wb, 'Modele_Import_Specialites.xlsx');
}

/**
 * Show import modal
 */
function showImportModal() {
  const modal = new bootstrap.Modal(document.getElementById('importExcelModal'));
  modal.show();
}
