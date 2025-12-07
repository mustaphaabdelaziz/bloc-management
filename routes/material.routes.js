// routes/materials.js
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureMaterialsAccess, ensureMaterialsManagement, ensureViewMaterials, ensureMaterialsCreateImport } = require('../middleware/rbac');
const multer = require('multer');
const {
  createMaterial,
  createMaterialArrival,
  updateMaterialArrival,
  deleteMaterialArrival,
  addPurchase,
  updatePricing,
  materialList,
  renderCreateMateirialForm,
  deleteMaterial,
  renderEditMaterialForm,
  updateMaterial,
  showMaterial,
  addUnit,
  getUnits,
  getArrivalUnits,
  updateUnit,
  updateUnitStatus,
  markUnitUsed,
  deleteUnit,
  importMaterials,
  downloadMaterialTemplate,
} = require("../controller/material.controller");

// Multer config for Excel file upload (10MB limit for materials)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error("Seuls les fichiers Excel (.xlsx, .xls) sont autorisés"));
    }
    cb(null, true);
  }
});

// headDepart, buyer, admin, direction can view materials list
// Only admin and buyer can create/modify (headDepart excluded)
router
  .route("/")
  .get(isLoggedIn, ensureViewMaterials, catchAsync(materialList))
  .post(isLoggedIn, ensureMaterialsCreateImport, catchAsync(createMaterial));

// Import materials from Excel - only buyer/admin (headDepart excluded)
router.post("/import", isLoggedIn, ensureMaterialsCreateImport, upload.single('excelFile'), catchAsync(importMaterials));
router.get("/template", isLoggedIn, ensureViewMaterials, catchAsync(downloadMaterialTemplate));

// Nouveau matériau - only buyer/admin (headDepart excluded)
router.get("/new", isLoggedIn, ensureMaterialsCreateImport, renderCreateMateirialForm);

router
  .route("/:id")
  .get(isLoggedIn, ensureViewMaterials, catchAsync(showMaterial)) // headDepart can view
  .put(isLoggedIn, ensureMaterialsManagement, catchAsync(updateMaterial))
  .delete(isLoggedIn, ensureMaterialsManagement, catchAsync(deleteMaterial));

// Ajouter arrivage/achat - only buyer/admin (headDepart excluded)
router.post("/:id/arrival", isLoggedIn, ensureMaterialsManagement, catchAsync(createMaterialArrival));

// Add purchase record (API) - only buyer/admin
router.post("/:id/purchases", isLoggedIn, ensureMaterialsManagement, catchAsync(addPurchase));

// Update pricing settings (markup, price mode) - only buyer/admin
router.put("/:id/pricing", isLoggedIn, ensureMaterialsManagement, catchAsync(updatePricing));

// Modifier arrivage - only buyer/admin (headDepart excluded)
router.post("/:id/arrival/:arrivalIndex", isLoggedIn, ensureMaterialsManagement, catchAsync(updateMaterialArrival));

// Supprimer arrivage - only buyer/admin (headDepart excluded)
router.post("/:id/arrival/:arrivalIndex/delete", isLoggedIn, ensureMaterialsManagement, catchAsync(deleteMaterialArrival));

// Modifier matériau - admin/buyer/direction
router.get("/:id/edit", isLoggedIn, ensureMaterialsManagement, catchAsync(renderEditMaterialForm));

// Unit management routes (for patient-type materials)
router.post("/:id/units", isLoggedIn, ensureMaterialsManagement, catchAsync(addUnit));
router.get("/:id/units", isLoggedIn, ensureViewMaterials, catchAsync(getUnits));
router.get("/:id/arrivals/:arrivalId/units", isLoggedIn, ensureViewMaterials, catchAsync(getArrivalUnits));
router.put("/:id/units/:unitId", isLoggedIn, ensureMaterialsManagement, catchAsync(updateUnit));
router.put("/:id/units/:unitId/status", isLoggedIn, ensureMaterialsManagement, catchAsync(updateUnitStatus));
router.post("/:id/units/:unitId/mark-used", isLoggedIn, ensureMaterialsManagement, catchAsync(markUnitUsed));
router.delete("/:id/units/:unitId", isLoggedIn, ensureMaterialsManagement, catchAsync(deleteUnit));

module.exports = router;
