// routes/medicalStaff.js
const express = require("express");
const router = express.Router();

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
router
  .route("/")
  .get(catchAsync(medicalStaffList))
  .post(catchAsync(createMedicalStaff));
router.get("/new", renderMedicalStaffForm);
router.get("/:id/edit", catchAsync(renderEditMedicalStaffForm));
router
  .route("/:id")
  .get(catchAsync(showMedicalStaff))
  .put(catchAsync(updateMedicalStaff))
  .delete(catchAsync(deleteMedicalStaff));

module.exports = router;
