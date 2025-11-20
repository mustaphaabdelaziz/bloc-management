const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureManagementAccess, ensureViewSurgeries, ensureOwnerOrRole } = require('../middleware/rbac');
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

// Surgery list - all logged users with viewing permissions can see
router.route("/")
  .get(isLoggedIn, ensureViewSurgeries, catchAsync(surgeryList))
  .post(isLoggedIn, ensureManagementAccess, catchAsync(createSurgery));

// New surgery form - only management roles
router.get("/new", isLoggedIn, ensureManagementAccess, renderCreateSurgeryForm);

router
  .route("/:id")
  .get(isLoggedIn, ensureViewSurgeries, catchAsync(viewSurgery))
  .put(isLoggedIn, ensureManagementAccess, catchAsync(updateSurgery))
  .delete(isLoggedIn, ensureManagementAccess, catchAsync(deleteSurgery));

router.post("/:id/calculate-fees", isLoggedIn, ensureManagementAccess, catchAsync(calculateFees));
router.post("/:id/update-status", isLoggedIn, ensureManagementAccess, catchAsync(updateSurgeryStatus));
router.get("/:id/edit", isLoggedIn, ensureManagementAccess, renderEditSurgeryForm);

module.exports = router;
