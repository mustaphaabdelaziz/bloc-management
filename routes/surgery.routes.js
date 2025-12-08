const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureManagementAccess, ensureHeadDepartManagement, ensureViewSurgeries, ensureOwnerOrRole } = require('../middleware/rbac');
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
  closeSurgery,
  reopenSurgery,
  addMaterialsToSurgery,
  showPlanning,
  createOrUpdateReservation,
  cancelReservation,
  checkAvailability,
  getSlots,
  showSlotBooking,
  createReservationFromSlots,
  renderCreateSurgeryFromReservation,
  createSurgeryFromReservation,
  rescheduleSurgery,
  exportPlanningPDF,
  exportPlanningExcel,
} = require("../controller/surgery.controller");

// Debug: ensure handlers are defined
const handlers = { isLoggedIn, surgeryList, createSurgery, renderCreateSurgeryForm, viewSurgery, updateSurgery, deleteSurgery, calculateFees, updateSurgeryStatus, renderEditSurgeryForm };
for (const [k, v] of Object.entries(handlers)) {
  if (typeof v === 'undefined') console.error(`HANDLER UNDEFINED: ${k}`);
}

// Surgery list - all logged users with viewing permissions can see
router.route("/")
  .get(isLoggedIn, ensureViewSurgeries, catchAsync(surgeryList))
  .post(isLoggedIn, ensureHeadDepartManagement, catchAsync(createSurgery));

// New surgery form - admin/direction/headDepart can create
router.get("/new", isLoggedIn, ensureHeadDepartManagement, renderCreateSurgeryForm);

// Convert reservation to surgery
router.get("/new/from-reservation/:id", isLoggedIn, ensureHeadDepartManagement, catchAsync(renderCreateSurgeryFromReservation));
router.post("/new/from-reservation/:id", isLoggedIn, ensureHeadDepartManagement, catchAsync(createSurgeryFromReservation));

router
  .route("/:id")
  .get(isLoggedIn, ensureViewSurgeries, catchAsync(viewSurgery))
  .put(isLoggedIn, ensureHeadDepartManagement, catchAsync(updateSurgery))
  .delete(isLoggedIn, ensureHeadDepartManagement, catchAsync(deleteSurgery));

router.post("/:id/calculate-fees", isLoggedIn, ensureManagementAccess, catchAsync(calculateFees));
router.post("/:id/update-status", isLoggedIn, ensureHeadDepartManagement, catchAsync(updateSurgeryStatus));
router.post("/:id/close", isLoggedIn, ensureManagementAccess, catchAsync(closeSurgery));
router.post("/:id/reopen", isLoggedIn, ensureManagementAccess, catchAsync(reopenSurgery));
router.post("/:id/add-materials", isLoggedIn, ensureHeadDepartManagement, catchAsync(addMaterialsToSurgery));
router.get("/:id/edit", isLoggedIn, ensureHeadDepartManagement, renderEditSurgeryForm);

// Operating Room Reservation Routes
router.get("/planning/view", isLoggedIn, ensureViewSurgeries, catchAsync(showPlanning));
router.get("/planning/export/pdf", isLoggedIn, ensureViewSurgeries, catchAsync(exportPlanningPDF));
router.get("/planning/export/excel", isLoggedIn, ensureViewSurgeries, catchAsync(exportPlanningExcel));
router.get("/planning/book-slots", isLoggedIn, catchAsync(showSlotBooking));
router.get("/planning/slots", isLoggedIn, catchAsync(getSlots));
router.get("/planning/check-availability", isLoggedIn, catchAsync(checkAvailability));
router.post("/new/reservation", isLoggedIn, catchAsync(createReservationFromSlots));
router.post("/:id/reservation", isLoggedIn, catchAsync(createOrUpdateReservation));
router.put("/:id/reschedule", isLoggedIn, ensureHeadDepartManagement, catchAsync(rescheduleSurgery));
router.delete("/:id/reservation", isLoggedIn, catchAsync(cancelReservation));

module.exports = router;
