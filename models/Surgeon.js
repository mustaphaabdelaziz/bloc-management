const mongoose = require("mongoose");
// models/Surgeon.js
const surgeonSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
    },
    phone: {
      type: String,
    },
    specialty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specialty",
      required: true,
    },
    contractType: {
      type: String,
      enum: ["allocation", "percentage"],
      required: true,
    },
    allocationRate: {
      type: Number, // Prix horaire pour méthode allocation
    },
    percentageRate: {
      type: Number, // Pourcentage pour méthode pourcentage
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Surgeon", surgeonSchema);
