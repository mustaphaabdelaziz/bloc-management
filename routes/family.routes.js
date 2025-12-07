const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureHeadDepartManagement } = require('../middleware/rbac');
const multer = require('multer');
const {
  updateFamily,
  renderEditFamilyForm,
  deleteFamily,
  createFamily,
  renderFamilyForm,
  familyList,
  getFamiliesBySpecialty,
  importFamilies,
  downloadFamilyTemplate
} = require("../controller/family.controller");

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

// All logged users can view, admin/direction/headDepart can manage
router
  .route("/")
  .get(isLoggedIn, catchAsync(familyList))
  .post(isLoggedIn, ensureHeadDepartManagement, catchAsync(createFamily));

router.post("/import", isLoggedIn, ensureHeadDepartManagement, upload.single('excelFile'), catchAsync(importFamilies));
router.get("/template", isLoggedIn, ensureHeadDepartManagement, catchAsync(downloadFamilyTemplate));

router.get("/new", isLoggedIn, ensureHeadDepartManagement, renderFamilyForm);

// API endpoint for getting families by specialty
router.get("/by-specialty/:specialtyId", isLoggedIn, catchAsync(getFamiliesBySpecialty));

router.get("/:id/edit", isLoggedIn, ensureHeadDepartManagement, renderEditFamilyForm);

router
  .route("/:id")
  .put(isLoggedIn, ensureHeadDepartManagement, catchAsync(updateFamily))
  .delete(isLoggedIn, ensureHeadDepartManagement, catchAsync(deleteFamily));

module.exports = router;
