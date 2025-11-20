// routes/materials.js
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureMaterialsAccess, ensureViewMaterials } = require('../middleware/rbac');
const {
  createMaterial,
  createMaterialArrival,
  updateMaterialArrival,
  deleteMaterialArrival,
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
} = require("../controller/material.controller");

// headDepart, buyer, admin, direction can view materials list
// Only admin and buyer can create/modify
router
  .route("/")
  .get(isLoggedIn, ensureViewMaterials, catchAsync(materialList))
  .post(isLoggedIn, ensureMaterialsAccess, catchAsync(createMaterial));

// Nouveau matériau - only buyer/admin
router.get("/new", isLoggedIn, ensureMaterialsAccess, renderCreateMateirialForm);

router
  .route("/:id")
  .get(isLoggedIn, ensureViewMaterials, catchAsync(showMaterial)) // headDepart can view
  .put(isLoggedIn, ensureMaterialsAccess, catchAsync(updateMaterial))
  .delete(isLoggedIn, ensureMaterialsAccess, catchAsync(deleteMaterial));

// Ajouter arrivage - only buyer/admin
router.post("/:id/arrival", isLoggedIn, ensureMaterialsAccess, catchAsync(createMaterialArrival));

// Modifier arrivage - only buyer/admin
router.post("/:id/arrival/:arrivalIndex", isLoggedIn, ensureMaterialsAccess, catchAsync(updateMaterialArrival));

// Supprimer arrivage - only buyer/admin
router.post("/:id/arrival/:arrivalIndex/delete", isLoggedIn, ensureMaterialsAccess, catchAsync(deleteMaterialArrival));

// Modifier matériau - only buyer/admin
router.get("/:id/edit", isLoggedIn, ensureMaterialsAccess, catchAsync(renderEditMaterialForm));

// Unit management routes (for patient-type materials)
router.post("/:id/units", isLoggedIn, ensureMaterialsAccess, catchAsync(addUnit));
router.get("/:id/units", isLoggedIn, ensureViewMaterials, catchAsync(getUnits));
router.get("/:id/arrivals/:arrivalId/units", isLoggedIn, ensureViewMaterials, catchAsync(getArrivalUnits));
router.put("/:id/units/:unitId", isLoggedIn, ensureMaterialsAccess, catchAsync(updateUnit));
router.put("/:id/units/:unitId/status", isLoggedIn, ensureMaterialsAccess, catchAsync(updateUnitStatus));
router.post("/:id/units/:unitId/mark-used", isLoggedIn, ensureMaterialsAccess, catchAsync(markUnitUsed));
router.delete("/:id/units/:unitId", isLoggedIn, ensureMaterialsAccess, catchAsync(deleteUnit));

module.exports = router;
