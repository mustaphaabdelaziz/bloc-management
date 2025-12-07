// routes/medicalStaff.js
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection, ensureViewMedicalStaff } = require('../middleware/rbac');
const catchAsync = require("../utils/catchAsync");
const multer = require('multer');
const {
  createMedicalStaff,
  deleteMedicalStaff,
  updateMedicalStaff,
  medicalStaffList,
  renderEditMedicalStaffForm,
  renderMedicalStaffForm,
  showMedicalStaff,
  importMedicalStaff,
  downloadMedicalStaffTemplate
} = require("../controller/medicalStaff.controller");

// Multer config for Excel file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
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

// headDepart can view, only admin/direction can manage
router
  .route("/")
  .get(isLoggedIn, ensureViewMedicalStaff, catchAsync(medicalStaffList))
  .post(isLoggedIn, ensureAdminOrDirection, catchAsync(createMedicalStaff));

router.post("/import", isLoggedIn, ensureAdminOrDirection, upload.single('excelFile'), catchAsync(importMedicalStaff));
router.get("/template", isLoggedIn, ensureAdminOrDirection, catchAsync(downloadMedicalStaffTemplate));

router.get("/new", isLoggedIn, ensureAdminOrDirection, renderMedicalStaffForm);
router.get("/:id/edit", isLoggedIn, ensureAdminOrDirection, catchAsync(renderEditMedicalStaffForm));

router
  .route("/:id")
  .get(isLoggedIn, ensureViewMedicalStaff, catchAsync(showMedicalStaff))
  .put(isLoggedIn, ensureAdminOrDirection, catchAsync(updateMedicalStaff))
  .delete(isLoggedIn, ensureAdminOrDirection, catchAsync(deleteMedicalStaff));

module.exports = router;
