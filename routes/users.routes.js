const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");
const Surgeon = require("../models/Surgeon");
const Surgery = require("../models/Surgery");
const { isLoggedIn } = require("../middleware/auth");
const { ensureAdmin } = require('../middleware/rbac');

// Show all users (admin only)
router.get("/", isLoggedIn, ensureAdmin, catchAsync(async (req, res) => {
    const searchTerm = req.query.search ? req.query.search.trim() : '';
    
    let query = {};
    if (searchTerm) {
        // Search by email, firstname, or lastname
        query = {
            $or: [
                { email: { $regex: searchTerm, $options: 'i' } },
                { firstname: { $regex: searchTerm, $options: 'i' } },
                { lastname: { $regex: searchTerm, $options: 'i' } }
            ]
        };
    }
    
    const users = await User.find(query).select('-password').sort({ lastname: 1 });
    
    res.render("users/index", {
        title: "Gestion des Utilisateurs",
        currentUser: req.user,
        users,
        filters: { search: searchTerm }
    });
}));

// Show user details (admin only)
router.get("/:id", isLoggedIn, ensureAdmin, catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        req.flash('error', 'Utilisateur non trouvé');
        return res.redirect('/users');
    }
    res.render("users/show", {
        title: `Utilisateur: ${user.firstname} ${user.lastname}`,
        currentUser: req.user,
        user
    });
}));

// Show edit user form (admin only)
router.get("/:id/edit", isLoggedIn, ensureAdmin, catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        req.flash('error', 'Utilisateur non trouvé');
        return res.redirect('/users');
    }
    res.render("users/edit", {
        title: "Modifier Utilisateur",
        currentUser: req.user,
        user
    });
}));

// Update user (admin only)
router.put("/:id", isLoggedIn, ensureAdmin, catchAsync(async (req, res) => {
    const { firstname, lastname, username, privileges } = req.body;
    
    // Handle privileges: can be array (from multiple select) or string (for compatibility)
    let privilegesArray = [];
    if (privileges) {
        if (Array.isArray(privileges)) {
            privilegesArray = privileges;
        } else if (typeof privileges === 'string') {
            privilegesArray = privileges.split(',').map(p => p.trim());
        }
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, {
        firstname,
        lastname,
        username,
        privileges: privilegesArray
    }, { new: true });

    if (!user) {
        req.flash('error', 'Utilisateur non trouvé');
        return res.redirect('/users');
    }

    req.flash('success', 'Utilisateur modifié avec succès');
    res.redirect(`/users/${user._id}`);
}));

// Delete user (admin only)
router.delete("/:id", isLoggedIn, ensureAdmin, catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        req.flash('error', 'Utilisateur non trouvé');
        return res.redirect('/users');
    }

    // Prevent deleting the current admin user
    if (user._id.equals(req.user._id)) {
        req.flash('error', 'Vous ne pouvez pas supprimer votre propre compte');
        return res.redirect('/users');
    }

    // Check if user is linked to a surgeon that is used in surgeries
    const surgeon = await Surgeon.findOne({ user: req.params.id });
    if (surgeon) {
        const surgeriesCount = await Surgery.countDocuments({ surgeon: surgeon._id });
        if (surgeriesCount > 0) {
            req.flash('error', `Cet utilisateur ne peut pas être supprimé car il est lié à un chirurgien utilisé dans ${surgeriesCount} chirurgie(s)`);
            return res.redirect('/users');
        }
    }

    await User.findByIdAndDelete(req.params.id);
    req.flash('success', 'Utilisateur supprimé avec succès');
    res.redirect('/users');
}));

module.exports = router;