const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { dashboard } = require("../controller/index.controller");
const { isLoggedIn } = require("../middleware/auth");

// Dashboard principal
router.get("/", isLoggedIn, catchAsync(dashboard));

module.exports = router;
