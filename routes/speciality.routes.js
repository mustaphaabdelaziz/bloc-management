const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection, ensureHeadDepartManagement } = require('../middleware/rbac');
const multer = require('multer');
const {
  updateSpecialty,
  renderEditSpecialtyForm,
  deleteSpecialty,
  createSpecialty,
  renderCreateSpecialtyForm,
  specialityList,
  importSpecialties,
  downloadSpecialtyTemplate
} = require("../controller/speciality.controller");

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
  .get(isLoggedIn, catchAsync(specialityList))
  .post(isLoggedIn, ensureHeadDepartManagement, catchAsync(createSpecialty));

router.post("/import", isLoggedIn, ensureHeadDepartManagement, upload.single('excelFile'), catchAsync(importSpecialties));
router.get("/template", isLoggedIn, ensureHeadDepartManagement, catchAsync(downloadSpecialtyTemplate));

router.get("/new", isLoggedIn, ensureHeadDepartManagement, renderCreateSpecialtyForm);

router.get("/:id/edit", isLoggedIn, ensureHeadDepartManagement, renderEditSpecialtyForm);

router
  .route("/:id")
  .put(isLoggedIn, ensureHeadDepartManagement, catchAsync(updateSpecialty))
  .delete(isLoggedIn, ensureHeadDepartManagement, catchAsync(deleteSpecialty));

module.exports = router;
