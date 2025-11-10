const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
//  This strategy integrates Mongoose with the passport-local strategy.
const passportLocalMongoose = require("passport-local-mongoose");
const Schema = mongoose.Schema;
const userSchema = new mongoose.Schema({

    // raw `password` should not be stored in DB for security; keep for compatibility if needed
    // but don't require it. We store `hash` and `salt` instead.
    password: {
        type: String,
        required: false
    },
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    privileges: [{
        type: String,
        // Add additional roles that views and seeds use
        enum: ['admin', 'medecin', 'acheteur', 'chefBloc', 'technicien', 'assistant']
    }],
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },

    hash: {
        type: String,
        required: true,
    },
    salt: {
        type: String,
        required: true,
        default: "undefined",
    },
}, { timestamps: true });


// Remove passport-local-mongoose plugin to avoid username index

// Virtual field for fullname
userSchema.virtual("fullname").get(function () {
    return this.firstname + " " + this.lastname;
});

// Remove pre-save hook (hashing is done in seeding and registration)

// comparer function
userSchema.methods.verifyPassword = function (password, hash) {
    return bcrypt.compareSync(password, hash);
};
module.exports = mongoose.model("User", userSchema);
