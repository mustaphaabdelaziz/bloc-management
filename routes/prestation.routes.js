// routes/prestations.js
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const {
  createPrestation,
  deletePrestation,
  prestationList,
  renderEditPrestationForm,
  renderPrestationForm,
  updatePrestation,
  showPrestation
} = require("../controller/prestation.controller");
router
  .route("/")
  .get(catchAsync(prestationList))
  .post(catchAsync(createPrestation));

router.get("/new", renderPrestationForm);
router.get("/:id/edit", catchAsync(renderEditPrestationForm));
router
  .route("/:id")
  .get(catchAsync(showPrestation))
  .put(catchAsync(updatePrestation))
  .delete(catchAsync(deletePrestation));

module.exports = router;
