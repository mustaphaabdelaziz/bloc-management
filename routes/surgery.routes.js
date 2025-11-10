const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureHeadChief, ensureOwnerOrRole } = require('../middleware/rbac');
const Surgery = require('../models/Surgery');
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

// Debug: ensure handlers are defined
const handlers = { isLoggedIn, surgeryList, createSurgery, renderCreateSurgeryForm, viewSurgery, updateSurgery, deleteSurgery, calculateFees, updateSurgeryStatus, renderEditSurgeryForm };
for (const [k, v] of Object.entries(handlers)) {
  if (typeof v === 'undefined') console.error(`HANDLER UNDEFINED: ${k}`);
}

router.route("/").get(isLoggedIn, catchAsync(surgeryList)).post(isLoggedIn, ensureHeadChief, catchAsync(createSurgery));
router.get("/new", isLoggedIn, ensureHeadChief, renderCreateSurgeryForm);

router
  .route("/:id")
  .get(isLoggedIn, ensureOwnerOrRole(async (req) => {
    const s = await Surgery.findById(req.params.id).select('surgeon');
    return s ? s.surgeon : null;
  }), catchAsync(viewSurgery))
  .put(isLoggedIn, ensureHeadChief, catchAsync(updateSurgery))
  .delete(isLoggedIn, ensureHeadChief, catchAsync(deleteSurgery));

router.post("/:id/calculate-fees", isLoggedIn, ensureHeadChief, catchAsync(calculateFees));
router.post("/:id/update-status", isLoggedIn, ensureHeadChief, catchAsync(updateSurgeryStatus));
router.get("/:id/edit", isLoggedIn, ensureHeadChief, renderEditSurgeryForm);

module.exports = router;
