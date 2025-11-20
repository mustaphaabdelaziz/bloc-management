const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdminOrDirection } = require("../middleware/rbac");
const payment = require("../controller/payment.controller");

// All payment routes require admin or direction role
router.use(isLoggedIn);
router.use(ensureAdminOrDirection);

// Payment list with filtering
router.get("/", payment.paymentList);

// Surgeon payment summary
router.get("/surgeon/:id", payment.surgeonPaymentSummary);

// View specific payment
router.get("/:id", payment.viewPayment);

// Record a payment transaction
router.post("/:id/record", payment.recordPayment);

// Update payment notes
router.put("/:id/notes", payment.updatePaymentNotes);

// Cancel payment
router.post("/:id/cancel", payment.cancelPayment);

module.exports = router;
