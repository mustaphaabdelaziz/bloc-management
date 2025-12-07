// routes/asaPricing.routes.js
const express = require('express');
const router = express.Router();
const asaPricingController = require('../controller/asaPricing.controller');
const { isLoggedIn } = require('../middleware/auth');
const { requireAny } = require('../middleware/rbac');

// All routes require admin or direction access
router.use(isLoggedIn);
router.use(requireAny('admin', 'direction'));

// List all ASA pricing
router.get('/', asaPricingController.asaPricingList);

// Initialize default pricing
router.post('/initialize', asaPricingController.initializeDefaultPricing);

// Edit specific ASA class pricing
router.get('/:class/edit', asaPricingController.renderEditAsaPricingForm);
router.put('/:class', asaPricingController.updateAsaPricing);

module.exports = router;
