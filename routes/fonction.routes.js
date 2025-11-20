// routes/fonctions.js
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection } = require('../middleware/rbac');
const catchAsync = require("../utils/catchAsync");
const {
  RenderfonctionForm,
  createfonction,
  updatefonction,
  deletefonction,
  fonctionlist,
  renderEditfonctionForm,
} = require("../controller/fonction.controller");

// All logged users can view, only admin/direction can manage
router
  .route("/")
  .get(isLoggedIn, catchAsync(fonctionlist))
  .post(isLoggedIn, ensureAdminOrDirection, catchAsync(createfonction));

router.get("/new", isLoggedIn, ensureAdminOrDirection, RenderfonctionForm);
router.get("/:id/edit", isLoggedIn, ensureAdminOrDirection, catchAsync(renderEditfonctionForm));

router
  .route("/:id")
  .put(isLoggedIn, ensureAdminOrDirection, catchAsync(updatefonction))
  .delete(isLoggedIn, ensureAdminOrDirection, catchAsync(deletefonction));

module.exports = router;
