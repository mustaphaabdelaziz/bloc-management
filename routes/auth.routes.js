
const express = require("express");
const router = express.Router();
const passport = require("passport");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");
const { isLoggedIn, isAdmin } = require("../middleware/auth");

// Show login form
router.get("/login", (req, res) => {
    res.render("auth/login", {
        title: "Connexion"
    });
});

// Handle login
router.post("/login", (req, res, next) => {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', req.body.email);
    console.log('Password provided:', !!req.body.password);
    console.log('====================');

    passport.authenticate("user", (err, user, info) => {
        console.log('=== PASSPORT AUTH RESULT ===');
        console.log('Error:', err);
        console.log('User:', user ? { id: user._id, email: user.email } : null);
        console.log('Info:', info);
        console.log('============================');

        if (err) {
            console.error('Login error:', err);
            return next(err);
        }
        if (!user) {
            console.log('Login failed: no user found');
            req.flash('error', info.message || 'Échec de la connexion');
            return res.redirect('/login');
        }

        req.logIn(user, (err) => {
            if (err) {
                console.error('Login error during logIn:', err);
                return next(err);
            }
            console.log('=== LOGIN SUCCESS ===');
            console.log('User logged in:', user.email);
            console.log('Redirecting to dashboard...');
            console.log('====================');
            req.flash('success', 'Connexion réussie');
            res.redirect('/');
        });
    })(req, res, next);
});

// Handle logout
router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash('success', 'Vous êtes maintenant déconnecté');
        res.redirect("/login");
    });
});

// Show register form (admin only)
router.get("/register", isLoggedIn, isAdmin, (req, res) => {
    res.render("auth/register", {
        title: "Inscription"
    });
});

// Handle register (admin only)
router.post("/register", isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    try {
        const { email, password, firstname, lastname, privileges } = req.body;
            if (!password || password.length < 6) {
                req.flash('error', 'Le mot de passe est requis et doit contenir au moins 6 caractères');
                return res.redirect('/register');
            }

            const bcrypt = require('bcrypt');
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const user = new User({
                email,
                password: undefined, // do not store raw password
                hash,
                salt,
                firstname,
                lastname,
                privileges: Array.isArray(privileges) ? privileges : (privileges ? privileges.split(',').map(p => p.trim()) : [])
            });
        await user.save();
        req.flash('success', 'Utilisateur créé avec succès');
        res.redirect("/");
    } catch (error) {
        req.flash('error', error.message);
        res.redirect("/register");
    }
}));

module.exports = router;