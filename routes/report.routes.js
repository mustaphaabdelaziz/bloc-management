const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const {
  statisticsReport,
  materialConsumptionReport,
  medicalStaffActivityReport,
  surgeonFeesReport,
  mainPageReports,
} = require("../controller/report.controller");

// Page principale des rapports
router.get("/", catchAsync(mainPageReports));

// Rapport des honoraires des chirurgiens
router.get("/surgeon-fees", catchAsync(surgeonFeesReport));

// Rapport d'activité du personnel médical
router.get("/medical-staff-activity", catchAsync(medicalStaffActivityReport));

// Rapport de consommation des matériaux
router.get("/material-consumption", catchAsync(materialConsumptionReport));

// Rapport statistiques générales
router.get("/statistics", catchAsync(statisticsReport));

module.exports = router;
