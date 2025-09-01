// models/Fonction.js
const mongoose = require("mongoose");
const fonctionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Fonction", fonctionSchema);
