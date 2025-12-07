// models/AsaPricing.js
const mongoose = require("mongoose");

const asaPricingSchema = new mongoose.Schema(
  {
    class: {
      type: String,
      enum: ["I", "II", "III"],
      required: true,
      unique: true,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    description: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
  },
  { timestamps: true }
);

// Static method to get all pricing with fallback to defaults
asaPricingSchema.statics.getAllPricing = async function() {
  const pricing = await this.find({ isActive: true }).sort({ class: 1 });
  
  // Return pricing if found, otherwise return defaults
  if (pricing.length === 0) {
    return [
      { class: 'I', fee: 5000, description: 'Patient en bonne santé' },
      { class: 'II', fee: 7000, description: 'Maladie systémique légère' },
      { class: 'III', fee: 8000, description: 'Maladie systémique grave' },
    ];
  }
  
  return pricing;
};

// Static method to get pricing by class
asaPricingSchema.statics.getPricingByClass = async function(asaClass) {
  const pricing = await this.findOne({ class: asaClass, isActive: true });
  
  // Fallback to defaults if not found
  if (!pricing) {
    const defaults = {
      'I': { fee: 5000 },
      'II': { fee: 7000 },
      'III': { fee: 8000 },
    };
    return defaults[asaClass] || null;
  }
  
  return pricing;
};

module.exports = mongoose.model("AsaPricing", asaPricingSchema);
