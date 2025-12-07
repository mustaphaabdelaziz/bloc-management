// Liste des chirurgiens
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection, ensureViewSurgeons } = require('../middleware/rbac');
const multer = require('multer');
const {
  createSurgeon,
  renderCreateSurgeonForm,
  renderEditSurgeonForm,
  surgeonList,
  updateSurgeon,
  viewSurgeon,
  deleteSurgeon,
  getNextCode,
  importSurgeons,
  downloadSurgeonTemplate,
} = require("../controller/surgeon.controller");

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

// headDepart can view surgeons (headDepart sees limited info)
// Only admin/direction can create/modify
router.route("/")
  .get(isLoggedIn, ensureViewSurgeons, catchAsync(surgeonList))
  .post(isLoggedIn, ensureAdminOrDirection, catchAsync(createSurgeon));

// Import/Export routes
router.post("/import", isLoggedIn, ensureAdminOrDirection, upload.single('excelFile'), catchAsync(importSurgeons));
router.get("/template", isLoggedIn, ensureAdminOrDirection, catchAsync(downloadSurgeonTemplate));

// API endpoint for getting next surgeon code
router.get("/next-code", isLoggedIn, ensureAdminOrDirection, catchAsync(getNextCode));

router.get("/new", isLoggedIn, ensureAdminOrDirection, renderCreateSurgeonForm);
router
  .route("/:id")
  .get(isLoggedIn, ensureViewSurgeons, catchAsync(viewSurgeon))
  .put(isLoggedIn, ensureAdminOrDirection, catchAsync(updateSurgeon))
  .delete(isLoggedIn, ensureAdminOrDirection, catchAsync(deleteSurgeon));
router.get("/:id/edit", isLoggedIn, ensureAdminOrDirection, renderEditSurgeonForm);

module.exports = router;
