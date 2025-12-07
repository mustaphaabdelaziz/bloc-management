// public/js/fonction.js

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
    ['Code', 'Nom', 'Description'],
    ['CHIRURGIEN', 'Chirurgien', 'Médecin spécialisé en chirurgie'],
    ['ANESTHESISTE', 'Anesthésiste', 'Spécialiste en anesthésiologie'],
    ['INFIRMIERE', 'Infirmière', 'Personnel infirmier de bloc opératoire'],
    ['AIDE-OP', 'Aide Opératoire', 'Aide technique au bloc opératoire']
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 50 }];

  const notesData = [
    ['INSTRUCTIONS POUR L\'IMPORT DES FONCTIONS'],
    [''],
    ['COLONNES OBLIGATOIRES:'],
    ['Code', 'Code unique et court pour la fonction'],
    ['Nom', 'Nom complet et lisible de la fonction'],
    [''],
    ['COLONNES OPTIONNELLES:'],
    ['Description', 'Brève description de la fonction']
  ];

  const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
  wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fonctions');
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

  XLSX.writeFile(wb, 'Modele_Import_Fonctions.xlsx');
}

function showImportModal() {
  const modal = new bootstrap.Modal(document.getElementById('importExcelModal'));
  modal.show();
}
