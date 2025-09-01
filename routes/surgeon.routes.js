// Liste des chirurgiens
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const {
  createSurgeon,
  renderCreateSurgeonForm,
  renderEditSurgeonForm,
  surgeonList,
  updateSurgeon,
  viewSurgeon,
  deleteSurgeon,
} = require("../controller/surgeon.controller");

router.route("/").get(catchAsync(surgeonList)).post(catchAsync(createSurgeon));

router.get("/new", renderCreateSurgeonForm);
router
  .route("/:id")
  .get(catchAsync(viewSurgeon))
  .put(catchAsync(updateSurgeon))
  .delete(catchAsync(deleteSurgeon));
router.get("/:id/edit", renderEditSurgeonForm);

module.exports = router;
