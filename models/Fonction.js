// models/Fonction.js
const mongoose = require("mongoose");
const fonctionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    }
  },
  { timestamps: true }
);

// Auto-generate code if not provided (pattern: FCT0001)
fonctionSchema.pre("save", async function (next) {
  if (!this.code) {
    try {
      const count = await this.constructor.countDocuments();
      this.code = "FCT" + String(count + 1).padStart(4, "0");
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model("Fonction", fonctionSchema);
