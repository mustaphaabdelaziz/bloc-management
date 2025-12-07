// controller/asaPricing.controller.js
const AsaPricing = require("../models/AsaPricing");
const catchAsync = require("../utils/catchAsync");

// List all ASA pricing
module.exports.asaPricingList = catchAsync(async (req, res) => {
  const pricing = await AsaPricing.getAllPricing();
  
  res.render("asaPricing/index", {
    title: "Gestion des Tarifs ASA",
    pricing,
  });
});

// Render edit form for specific ASA class
module.exports.renderEditAsaPricingForm = catchAsync(async (req, res) => {
  const asaClass = req.params.class;
  
  let pricing = await AsaPricing.findOne({ class: asaClass });
  
  // If not found, create default
  if (!pricing) {
    const defaults = {
      'I': { class: 'I', fee: 5000, description: 'Patient normal et en bonne santé (aucune maladie organique, physiologique ou psychiatrique)' },
      'II': { class: 'II', fee: 7000, description: 'Patient avec maladie systémique légère et bien contrôlée (ex: hypertension légère, diabète contrôlé)' },
      'III': { class: 'III', fee: 8000, description: 'Patient avec maladie systémique grave (impact sur la santé, limite l\'activité, ex: angor stable, diabète mal contrôlé)' },
    };
    pricing = defaults[asaClass];
  }
  
  res.render("asaPricing/edit", {
    title: `Modifier Tarif ASA ${asaClass}`,
    pricing,
  });
});

// Update ASA pricing
module.exports.updateAsaPricing = catchAsync(async (req, res) => {
  const asaClass = req.params.class;
  const { fee, description } = req.body;
  
  // Validate inputs
  if (!fee) {
    req.flash('error', 'Le montant des frais est requis');
    return res.redirect(`/asa-pricing/${asaClass}/edit`);
  }
  
  const feeNum = parseFloat(fee);
  
  if (feeNum < 0) {
    req.flash('error', 'Le montant doit être positif');
    return res.redirect(`/asa-pricing/${asaClass}/edit`);
  }
  
  // Update or create
  const pricing = await AsaPricing.findOneAndUpdate(
    { class: asaClass },
    {
      class: asaClass,
      fee: feeNum,
      description: description || `ASA ${asaClass}`,
      isActive: true,
      updatedBy: req.user ? req.user._id : undefined,
    },
    { upsert: true, new: true, runValidators: true }
  );
  
  req.flash('success', `Tarif ASA ${asaClass} mis à jour avec succès`);
  res.redirect('/asa-pricing');
});

// Initialize default pricing (for first-time setup)
module.exports.initializeDefaultPricing = catchAsync(async (req, res) => {
  const defaults = [
    {
      class: 'I',
      fee: 5000,
      description: 'Patient normal et en bonne santé (aucune maladie organique, physiologique ou psychiatrique)',
      isActive: true,
    },
    {
      class: 'II',
      fee: 7000,
      description: 'Patient avec maladie systémique légère et bien contrôlée (ex: hypertension légère, diabète contrôlé)',
      isActive: true,
    },
    {
      class: 'III',
      fee: 8000,
      description: 'Patient avec maladie systémique grave (impact sur la santé, limite l\'activité)',
      isActive: true,
    },
  ];
  
  for (const pricing of defaults) {
    await AsaPricing.findOneAndUpdate(
      { class: pricing.class },
      pricing,
      { upsert: true, new: true }
    );
  }
  
  req.flash('success', 'Tarifs ASA par défaut initialisés');
  res.redirect('/asa-pricing');
});
