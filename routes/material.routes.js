// routes/materials.js
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensurePurchaser, ensureHeadChief, ensureAdmin } = require('../middleware/rbac');
const {
  createMaterial,
  createMaterialArrival,
  materialList,
  renderCreateMateirialForm,
  deleteMaterial,
  renderEditMaterialForm,
  updateMaterial,
  showMaterial,
} = require("../controller/material.controller");
router
  .route("/")
  .get(isLoggedIn, catchAsync(materialList)) // All logged users can view materials
  .post(isLoggedIn, ensurePurchaser, catchAsync(createMaterial)); // Only admin/acheteur (acheteur) can create

// Nouveau matériau
router.get("/new", isLoggedIn, ensurePurchaser, renderCreateMateirialForm);

router
  .route("/:id")
  .get(isLoggedIn, catchAsync(showMaterial)) // All logged users can view
  .put(isLoggedIn, ensurePurchaser, catchAsync(updateMaterial)) // Only acheteur can update (server will allow admin to set price in controller if needed)
  .delete(isLoggedIn, ensurePurchaser, catchAsync(deleteMaterial)); // Only acheteur can delete

// Ajouter arrivage
router.post("/:id/arrival", isLoggedIn, ensurePurchaser, catchAsync(createMaterialArrival));

// Modifier matériau
router.get("/:id/edit", isLoggedIn, ensurePurchaser, catchAsync(renderEditMaterialForm));

module.exports = router;
