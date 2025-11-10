const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

passport.use(
    "user",
    new LocalStrategy(
        {
            usernameField: "email",
            passwordField: "password",
        },
        async (email, password, done) => {
            try {
                console.log('=== PASSPORT STRATEGY DEBUG ===');
                console.log('Email received:', email);
                console.log('Password received length:', password ? password.length : 0);
                
                const user = await User.findOne({ email: email.toLowerCase() });
                
                if (!user) {
                    console.log("the user n'existe pas");
                    return done(null, false, { message: "User avec cet email n'existe pas" });
                }
                
                console.log("User found:", user.email);
                console.log("User has hash:", !!user.hash);
                console.log("Hash length:", user.hash ? user.hash.length : 0);
                console.log("the user exists but verify password first");

                // Direct bcrypt comparison
                const bcrypt = require('bcrypt');
                const directComparison = bcrypt.compareSync(password, user.hash);
                console.log("Direct bcrypt.compareSync result:", directComparison);
                
                const methodComparison = user.verifyPassword(password, user.hash);
                console.log("verifyPassword method result:", methodComparison);

                if (methodComparison) {
                    console.log("the user exists and password verified");
                    return done(null, user);
                } else {
                    console.log("the user exists and password not verified");
                    return done(
                        null,
                        false,
                        { message: "Mot de passe incorrect, verifier votre mot de passe" }
                    );
                }
            } catch (err) {
                console.error('Passport strategy error:', err);
                return done(err);
            }
        }
    )
);

// authentication user data will be stored in the session
// serialization refers to how to store user's ID in session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// deserialization refers to how to retrieve user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});
module.exports = passport;