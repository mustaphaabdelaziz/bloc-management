// routes/fonctions.js
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection, ensureHeadDepartManagement } = require('../middleware/rbac');
const catchAsync = require("../utils/catchAsync");
const multer = require('multer');
const {
  RenderfonctionForm,
  createfonction,
  updatefonction,
  deletefonction,
  fonctionlist,
  renderEditfonctionForm,
  importFonctions,
  downloadFonctionTemplate
} = require("../controller/fonction.controller");

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
  .get(isLoggedIn, catchAsync(fonctionlist))
  .post(isLoggedIn, ensureHeadDepartManagement, catchAsync(createfonction));

router.post("/import", isLoggedIn, ensureHeadDepartManagement, upload.single('excelFile'), catchAsync(importFonctions));
router.get("/template", isLoggedIn, ensureHeadDepartManagement, catchAsync(downloadFonctionTemplate));

router.get("/new", isLoggedIn, ensureHeadDepartManagement, RenderfonctionForm);
router.get("/:id/edit", isLoggedIn, ensureHeadDepartManagement, catchAsync(renderEditfonctionForm));

router
  .route("/:id")
  .put(isLoggedIn, ensureHeadDepartManagement, catchAsync(updatefonction))
  .delete(isLoggedIn, ensureHeadDepartManagement, catchAsync(deletefonction));

module.exports = router;
