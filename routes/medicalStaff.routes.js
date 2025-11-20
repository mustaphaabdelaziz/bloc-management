// routes/medicalStaff.js
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection, ensureViewMedicalStaff } = require('../middleware/rbac');
const catchAsync = require("../utils/catchAsync");
const {
  createMedicalStaff,
  deleteMedicalStaff,
  updateMedicalStaff,
  medicalStaffList,
  renderEditMedicalStaffForm,
  renderMedicalStaffForm,
  showMedicalStaff
} = require("../controller/medicalStaff.controller");

// headDepart can view, only admin/direction can manage
router
  .route("/")
  .get(isLoggedIn, ensureViewMedicalStaff, catchAsync(medicalStaffList))
  .post(isLoggedIn, ensureAdminOrDirection, catchAsync(createMedicalStaff));

router.get("/new", isLoggedIn, ensureAdminOrDirection, renderMedicalStaffForm);
router.get("/:id/edit", isLoggedIn, ensureAdminOrDirection, catchAsync(renderEditMedicalStaffForm));

router
  .route("/:id")
  .get(isLoggedIn, ensureViewMedicalStaff, catchAsync(showMedicalStaff))
  .put(isLoggedIn, ensureAdminOrDirection, catchAsync(updateMedicalStaff))
  .delete(isLoggedIn, ensureAdminOrDirection, catchAsync(deleteMedicalStaff));

module.exports = router;
