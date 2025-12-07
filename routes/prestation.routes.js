// routes/prestations.js
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection, ensureViewPrestations } = require('../middleware/rbac');
const multer = require('multer');
const {
  createPrestation,
  deletePrestation,
  prestationList,
  renderEditPrestationForm,
  renderPrestationForm,
  updatePrestation,
  showPrestation,
  importPrestations,
  downloadTemplate
} = require("../controller/prestation.controller");

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

// headDepart can view prestations (including headDepart)
// Only admin/direction can create/modify
router
  .route("/")
  .get(isLoggedIn, ensureViewPrestations, catchAsync(prestationList))
  .post(isLoggedIn, ensureAdminOrDirection, catchAsync(createPrestation));

router.post("/import", isLoggedIn, ensureAdminOrDirection, upload.single('excelFile'), catchAsync(importPrestations));
router.get("/template", isLoggedIn, ensureViewPrestations, catchAsync(downloadTemplate));

router.get("/new", isLoggedIn, ensureAdminOrDirection, renderPrestationForm);
router.get("/:id/edit", isLoggedIn, ensureAdminOrDirection, catchAsync(renderEditPrestationForm));
router
  .route("/:id")
  .get(isLoggedIn, ensureViewPrestations, catchAsync(showPrestation))
  .put(isLoggedIn, ensureAdminOrDirection, catchAsync(updatePrestation))
  .delete(isLoggedIn, ensureAdminOrDirection, catchAsync(deletePrestation));

module.exports = router;
