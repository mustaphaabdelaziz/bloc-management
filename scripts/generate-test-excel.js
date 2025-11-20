// scripts/generate-test-excel.js
// Script to generate a test Excel file for prestation import

const XLSX = require('xlsx');
const path = require('path');

const testData = [
  ['Code', 'Désignation', 'Spécialité', 'Prix HT (DA)', 'TVA (%)', 'Durée (minutes)', 'Unité Dépassement (min)', 'Frais Dépassement (DA)', 'Frais Urgents (%)'],
  ['', 'Pontage Aorto-Coronarien', 'Cardiologie', 250000, 9, 120, 15, 500, 10],
  ['', 'Appendicectomie', 'Chirurgie Générale', 80000, 9, 45, 15, 300, 0],
  ['', 'Césarienne', 'Gynécologie', 150000, 9, 90, 15, 400, 20],
  ['', 'Thyroïdectomie', 'Chirurgie Générale', 120000, 9, 60, 15, 250, 5],
  ['', 'Cholécystectomie', 'Chirurgie Générale', 95000, 9, 50, 15, 280, 0]
];

// Create workbook
const ws = XLSX.utils.aoa_to_sheet(testData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Prestations');

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

// Write file
const outputPath = path.join(__dirname, '../test-prestations.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Test Excel file created: ${outputPath}`);
console.log(`📊 Total rows: ${testData.length - 1} (excluding header)`);
