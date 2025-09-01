// routes/materials.js
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
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
  .get(catchAsync(materialList))
  .post(catchAsync(createMaterial));



// Nouveau matériau
router.get("/new", renderCreateMateirialForm);

router
  .route("/:id")
  .get(catchAsync(showMaterial))
  .put(catchAsync(updateMaterial))
  .delete(catchAsync(deleteMaterial));
// Ajouter arrivage
router.post("/:id/arrival", catchAsync(createMaterialArrival));

// Modifier matériau
router.get("/:id/edit", catchAsync(renderEditMaterialForm));

module.exports = router;
