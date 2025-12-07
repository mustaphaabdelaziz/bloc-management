const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const { ensureManagementAccess } = require('../middleware/rbac');
const {
    operatingRoomList,
    newOperatingRoomForm,
    createOperatingRoom,
    viewOperatingRoom,
    editOperatingRoomForm,
    updateOperatingRoom,
    deleteOperatingRoom,
    toggleActiveStatus
} = require('../controller/operatingRoom.controller');

// List and create
router.route('/')
    .get(isLoggedIn, ensureManagementAccess, operatingRoomList)
    .post(isLoggedIn, ensureManagementAccess, createOperatingRoom);

// New form
router.get('/new', isLoggedIn, ensureManagementAccess, newOperatingRoomForm);

// Single room operations
router.route('/:id')
    .get(isLoggedIn, ensureManagementAccess, viewOperatingRoom)
    .put(isLoggedIn, ensureManagementAccess, updateOperatingRoom)
    .delete(isLoggedIn, ensureManagementAccess, deleteOperatingRoom);

// Edit form
router.get('/:id/edit', isLoggedIn, ensureManagementAccess, editOperatingRoomForm);

// Toggle active status
router.post('/:id/toggle-status', isLoggedIn, ensureManagementAccess, toggleActiveStatus);

module.exports = router;
