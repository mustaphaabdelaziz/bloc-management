const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection } = require('../middleware/rbac');
const {
  updateSpecialty,
  renderEditSpecialtyForm,
  deleteSpecialty,
  createSpecialty,
  renderCreateSpecialtyForm,
  specialityList,
} = require("../controller/speciality.controller");

// All logged users can view, only admin/direction can manage
router
  .route("/")
  .get(isLoggedIn, catchAsync(specialityList))
  .post(isLoggedIn, ensureAdminOrDirection, catchAsync(createSpecialty));

router.get("/new", isLoggedIn, ensureAdminOrDirection, renderCreateSpecialtyForm);

router.get("/:id/edit", isLoggedIn, ensureAdminOrDirection, renderEditSpecialtyForm);

router
  .route("/:id")
  .put(isLoggedIn, ensureAdminOrDirection, catchAsync(updateSpecialty))
  .delete(isLoggedIn, ensureAdminOrDirection, catchAsync(deleteSpecialty));

module.exports = router;
