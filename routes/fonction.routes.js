// routes/fonctions.js
const express = require("express");
const router = express.Router();

const catchAsync = require("../utils/catchAsync");
const {
  RenderfonctionForm,
  createfonction,
  updatefonction,
  deletefonction,
  fonctionlist,
  renderEditfonctionForm,
} = require("../controller/fonction.controller");
router
  .route("/")
  .get(catchAsync(fonctionlist))
  .post(catchAsync(createfonction));
router.get("/new", RenderfonctionForm);
router.get("/:id/edit", catchAsync(renderEditfonctionForm));
router
  .route("/:id")
  .put(catchAsync(updatefonction))
  .delete(catchAsync(deletefonction));

module.exports = router;
