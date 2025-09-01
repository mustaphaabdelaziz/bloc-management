const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { dashboard } = require("../controller/index.controller");
// Dashboard principal
router.get("/", catchAsync(dashboard));
module.exports = router;
