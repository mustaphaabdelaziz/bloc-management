const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection } = require('../middleware/rbac');
const {
  statisticsReport,
  materialConsumptionReport,
  materialUsageReport,
  medicalStaffActivityReport,
  surgeonFeesReport,
  clinicRevenueReport,
  mainPageReports,
} = require("../controller/report.controller");

// Only admin/direction can access reports
// Page principale des rapports
router.get("/", isLoggedIn, ensureAdminOrDirection, catchAsync(mainPageReports));

// Rapport des honoraires des chirurgiens
router.get("/surgeon-fees", isLoggedIn, ensureAdminOrDirection, catchAsync(surgeonFeesReport));

// Rapport d'activité du personnel médical
router.get("/medical-staff-activity", isLoggedIn, ensureAdminOrDirection, catchAsync(medicalStaffActivityReport));

// Rapport de consommation des matériaux (legacy)
router.get("/material-consumption", isLoggedIn, ensureAdminOrDirection, catchAsync(materialConsumptionReport));

// Rapport d'utilisation des matériaux (nouveau avec statistiques détaillées)
router.get("/material-usage", isLoggedIn, ensureAdminOrDirection, catchAsync(materialUsageReport));

// Rapport des revenus cliniques
router.get("/clinic-revenue", isLoggedIn, ensureAdminOrDirection, catchAsync(clinicRevenueReport));

// Rapport statistiques générales
router.get("/statistics", isLoggedIn, ensureAdminOrDirection, catchAsync(statisticsReport));

module.exports = router;
