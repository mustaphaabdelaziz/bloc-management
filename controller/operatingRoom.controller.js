const OperatingRoom = require('../models/OperatingRoom');
const catchAsync = require('../utils/catchAsync');

// List all operating rooms
module.exports.operatingRoomList = catchAsync(async (req, res) => {
    const filters = {};
    
    // Search filter
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        filters.$or = [
            { code: searchRegex },
            { name: searchRegex },
            { location: searchRegex }
        ];
    }
    
    // Active status filter
    if (req.query.status) {
        filters.isActive = req.query.status === 'active';
    }
    
    const operatingRooms = await OperatingRoom.find(filters).sort({ code: 1 });
    
    res.render('operatingRooms/index', {
        title: 'Salles Opératoires',
        operatingRooms,
        filters: req.query
    });
});

// Show form for new operating room
module.exports.newOperatingRoomForm = catchAsync(async (req, res) => {
    const operatingRoom = {};
    res.render('operatingRooms/new', { 
        title: 'Nouvelle Salle Opératoire',
        operatingRoom 
    });
});

// Create new operating room
module.exports.createOperatingRoom = catchAsync(async (req, res) => {
    const operatingRoom = new OperatingRoom(req.body);
    
    // Handle equipment array
    if (req.body.equipment) {
        if (Array.isArray(req.body.equipment)) {
            operatingRoom.equipment = req.body.equipment.filter(e => e.trim());
        } else {
            operatingRoom.equipment = req.body.equipment.split(',').map(e => e.trim()).filter(e => e);
        }
    }
    
    await operatingRoom.save();
    
    req.flash('success', 'Salle opératoire créée avec succès');
    res.redirect('/operating-rooms');
});

// Show single operating room
module.exports.viewOperatingRoom = catchAsync(async (req, res) => {
    const operatingRoom = await OperatingRoom.findById(req.params.id);
    
    if (!operatingRoom) {
        req.flash('error', 'Salle opératoire introuvable');
        return res.redirect('/operating-rooms');
    }
    
    // Get upcoming reservations for this room
    const Surgery = require('../models/Surgery');
    const upcomingReservations = await Surgery.find({
        operatingRoom: req.params.id,
        scheduledStartTime: { $gte: new Date() },
        reservationStatus: { $in: ['reserved', 'confirmed'] }
    })
    .populate('surgeon', 'firstName lastName')
    .populate('patient', 'firstName lastName')
    .populate('prestation', 'designation')
    .sort({ scheduledStartTime: 1 })
    .limit(10);
    
    res.render('operatingRooms/show', { 
        title: `Salle ${operatingRoom.code}`,
        operatingRoom,
        upcomingReservations
    });
});

// Show edit form
module.exports.editOperatingRoomForm = catchAsync(async (req, res) => {
    const operatingRoom = await OperatingRoom.findById(req.params.id);
    
    if (!operatingRoom) {
        req.flash('error', 'Salle opératoire introuvable');
        return res.redirect('/operating-rooms');
    }
    
    res.render('operatingRooms/edit', { 
        title: `Modifier ${operatingRoom.code}`,
        operatingRoom 
    });
});

// Update operating room
module.exports.updateOperatingRoom = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // Handle equipment array
    if (req.body.equipment) {
        if (Array.isArray(req.body.equipment)) {
            req.body.equipment = req.body.equipment.filter(e => e.trim());
        } else {
            req.body.equipment = req.body.equipment.split(',').map(e => e.trim()).filter(e => e);
        }
    }
    
    const operatingRoom = await OperatingRoom.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
    });
    
    if (!operatingRoom) {
        req.flash('error', 'Salle opératoire introuvable');
        return res.redirect('/operating-rooms');
    }
    
    req.flash('success', 'Salle opératoire mise à jour avec succès');
    res.redirect(`/operating-rooms/${operatingRoom._id}`);
});

// Delete operating room
module.exports.deleteOperatingRoom = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // Check if room has active reservations
    const Surgery = require('../models/Surgery');
    const activeReservations = await Surgery.countDocuments({
        operatingRoom: id,
        scheduledStartTime: { $gte: new Date() },
        reservationStatus: { $in: ['reserved', 'confirmed'] }
    });
    
    if (activeReservations > 0) {
        req.flash('error', `Impossible de supprimer cette salle. Elle a ${activeReservations} réservation(s) active(s).`);
        return res.redirect('/operating-rooms');
    }
    
    await OperatingRoom.findByIdAndDelete(id);
    
    req.flash('success', 'Salle opératoire supprimée avec succès');
    res.redirect('/operating-rooms');
});

// Toggle active status
module.exports.toggleActiveStatus = catchAsync(async (req, res) => {
    const operatingRoom = await OperatingRoom.findById(req.params.id);
    
    if (!operatingRoom) {
        req.flash('error', 'Salle opératoire introuvable');
        return res.redirect('/operating-rooms');
    }
    
    operatingRoom.isActive = !operatingRoom.isActive;
    await operatingRoom.save();
    
    const status = operatingRoom.isActive ? 'activée' : 'désactivée';
    req.flash('success', `Salle opératoire ${status} avec succès`);
    res.redirect(`/operating-rooms/${operatingRoom._id}`);
});
