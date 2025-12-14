// public/js/medicalStaff.js

document.addEventListener('DOMContentLoaded', function() {
  const downloadTemplateBtn = document.getElementById('downloadTemplate');
  
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', function(e) {
      e.preventDefault();
      downloadTemplateViaLibrary();
    });
  }

  const importForm = document.getElementById('importForm');
  if (importForm) {
    importForm.addEventListener('submit', function(e) {
      const fileInput = document.getElementById('excelFileInput');
      
      if (!fileInput.value) {
        e.preventDefault();
        alert('Veuillez sélectionner un fichier Excel');
        return;
      }

      const file = fileInput.files[0];
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      
      if (!validTypes.includes(file.type)) {
        e.preventDefault();
        alert('Veuillez sélectionner un fichier Excel valide (.xlsx ou .xls)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        e.preventDefault();
        alert('Le fichier est trop volumineux (max: 5 MB)');
        return;
      }
    });
  }
});

function downloadTemplateViaLibrary() {
  if (typeof XLSX === 'undefined') {
    alert('La librairie XLSX n\'est pas chargée. Veuillez utiliser le lien "Télécharger (Serveur)"');
    return;
  }

  const worksheetData = [
    ['Code', 'Prénom', 'Nom', 'Date de Naissance', 'Téléphone', 'Fonction', 'Frais Personnels'],
    ['MED001', 'Jean', 'Dupont', '1980-05-15', '0123456789', 'Chirurgien', '500'],
    ['MED002', 'Marie', 'Martin', '1985-08-22', '0987654321', 'Infirmière', '300'],
    ['MED003', 'Pierre', 'Bernard', '1978-11-30', '0555555555', 'Anesthésiste', '600'],
    ['MED004', 'Sophie', 'Lefevre', '1988-03-18', '0666666666', 'Aide Opératoire', '250']
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];

  const notesData = [
    ['INSTRUCTIONS POUR L\'IMPORT DU PERSONNEL MÉDICAL'],
    [''],
    ['COLONNES OBLIGATOIRES:'],
    ['Code', 'Identifiant unique du personnel'],
    ['Prénom', 'Prénom de la personne'],
    ['Nom', 'Nom de famille de la personne'],
    [''],
    ['COLONNES OPTIONNELLES:'],
    ['Date de Naissance', 'Format: YYYY-MM-DD (ex: 1980-05-15)'],
    ['Téléphone', 'Numéro de téléphone (ex: 0123456789)'],
    ['Fonction', 'Fonction médicale existante (ex: Chirurgien)'],
    ['Frais Personnels', 'Frais horaires en DA (ex: 500)'],
    [''],
    ['REMARQUES IMPORTANTES:'],
    ['- Si fournie, la date doit être au format YYYY-MM-DD'],
    ['- Les frais personnels doivent être positifs'],
    ['- La fonction doit exister dans le système'],
    ['- Les lignes vides seront ignorées'],
    ['- Taille maximale: 5 MB']
  ];

  const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
  wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Personnel');
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

  XLSX.writeFile(wb, 'Modele_Import_Personnel_Medical.xlsx');
}

function showImportModal() {
  // Ensure Bootstrap is loaded before using it
  if (typeof bootstrap !== 'undefined') {
    const modal = new bootstrap.Modal(document.getElementById('importExcelModal'));
    modal.show();
  } else {
    console.error('Bootstrap not loaded yet');
  }
}
