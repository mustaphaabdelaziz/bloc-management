// Liste des chirurgiens
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection, ensureViewSurgeons } = require('../middleware/rbac');
const {
  createSurgeon,
  renderCreateSurgeonForm,
  renderEditSurgeonForm,
  surgeonList,
  updateSurgeon,
  viewSurgeon,
  deleteSurgeon,
  getNextCode,
} = require("../controller/surgeon.controller");

// headDepart can view surgeons (headDepart sees limited info)
// Only admin/direction can create/modify
router.route("/")
  .get(isLoggedIn, ensureViewSurgeons, catchAsync(surgeonList))
  .post(isLoggedIn, ensureAdminOrDirection, catchAsync(createSurgeon));

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
