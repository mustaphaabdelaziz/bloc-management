const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const {
  deleteSurgery,
  updateSurgery,
  renderEditSurgeryForm,
  surgeryList,
  viewSurgery,
  createSurgery,
  renderCreateSurgeryForm,
  calculateFees,
  updateSurgeryStatus,
} = require("../controller/surgery.controller");

router.route("/").get(catchAsync(surgeryList)).post(catchAsync(createSurgery));
router.get("/new", renderCreateSurgeryForm);

router
  .route("/:id")
  .get(catchAsync(viewSurgery))
  .put(catchAsync(updateSurgery))
  .delete(catchAsync(deleteSurgery));

router.post("/:id/calculate-fees", catchAsync(calculateFees));
router.post("/:id/update-status", catchAsync(updateSurgeryStatus));
router.get("/:id/edit", renderEditSurgeryForm);

module.exports = router;
