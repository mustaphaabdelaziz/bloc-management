const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const {
  updateSpecialty,
  renderEditSpecialtyForm,
  deleteSpecialty,
  createSpecialty,
  renderCreateSpecialtyForm,
  specialityList,
} = require("../controller/speciality.controller");

router
  .route("/")
  .get(catchAsync(specialityList))
  .post(catchAsync(createSpecialty));

router.get("/new", renderCreateSpecialtyForm);

router.get("/:id/edit", renderEditSpecialtyForm);

router
  .route("/:id")
  .put(catchAsync(updateSpecialty))
  .delete(catchAsync(deleteSpecialty));

module.exports = router;
