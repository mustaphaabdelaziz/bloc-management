const Surgery = require("../models/Surgery");
const Patient = require("../models/Patient");
const Surgeon = require("../models/Surgeon");
const Prestation = require("../models/Prestation");
const MedicalStaff = require("../models/MedicalStaff");
const Fonction = require("../models/Fonction");
const Material = require("../models/Material");

// Liste des chirurgies
module.exports.surgeryList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const statusFilter = req.query.status || "";
    const dateFilter = req.query.date || "";

    let query = {};
    if (statusFilter) query.status = statusFilter;
    if (dateFilter) {
      const date = new Date(dateFilter);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query.beginDateTime = { $gte: date, $lt: nextDay };
    }

    // If the user is a medecin (and not admin/chefBloc), filter surgeries to their own
    if (req.user && req.user.privileges && req.user.privileges.includes('medecin') &&
        !req.user.privileges.includes('admin') && !req.user.privileges.includes('chefBloc')) {
      const getLinkedSurgeonId = require('../utils/getLinkedSurgeonId');
      const linkedId = await getLinkedSurgeonId(req.user);
      if (linkedId) query.surgeon = linkedId;
    }

    const surgeries = await Surgery.find(query)
      .populate("patient", "firstName lastName code")
      .populate("surgeon", "firstName lastName")
      .populate("prestation", "designation duration")
      .sort({ beginDateTime: -1 })
      .skip(skip)
      .limit(limit);

    const totalSurgeries = await Surgery.countDocuments(query);
    const totalPages = Math.ceil(totalSurgeries / limit);

    res.render("surgeries/index", {
      title: "Gestion des Chirurgies",
      surgeries,
      currentPage: page,
      totalPages,
      statusFilter,
      dateFilter,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    console.error("Erreur liste chirurgies:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Créer chirurgie (transactional + authorization)
module.exports.createSurgery = async (req, res) => {
  // Authorization guard: only admin and chefBloc can create surgeries
  if (!req.user || !(req.user.privileges && (req.user.privileges.includes('admin') || req.user.privileges.includes('chefBloc')))) {
    req.flash('error', 'Accès non autorisé - droit création chirurgie requis');
    return res.redirect('/surgeries');
  }

  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate surgeon and prestation specialties (use session reads for consistency)
    const surgeonDoc = await Surgeon.findById(req.body.surgeon).populate('specialty').session(session);
    const prestationDoc = await Prestation.findById(req.body.prestation).populate('specialty').session(session);

    if (!surgeonDoc || !prestationDoc) {
      await session.abortTransaction();
      session.endSession();
      return res.redirect('/surgeries/new?error=Chirurgien ou prestation introuvable');
    }

    if (String(surgeonDoc.specialty._id) !== String(prestationDoc.specialty._id)) {
      await session.abortTransaction();
      session.endSession();
      return res.redirect('/surgeries/new?error=La prestation choisie ne correspond pas \u00e0 la sp\u00e9cialit\u00e9 du chirurgien');
    }

    const surgeryData = {
      patient: req.body.patient,
      surgeon: req.body.surgeon,
      prestation: req.body.prestation,
      beginDateTime: req.body.beginDateTime,
      endDateTime: req.body.endDateTime,
      status: req.body.status,
      notes: req.body.notes,
      applyExtraFees: req.body.applyExtraFees === 'on',
      // Save the effective price used for this surgery to freeze later changes
      adjustedPrice: req.body.adjustedPrice ? parseFloat(req.body.adjustedPrice) : prestationDoc.priceHT,
      // Store audit info if schema allows
      createdBy: req.user ? req.user._id : undefined,
    };

    // Validation des dates: beginDateTime doit être avant endDateTime
    if (req.body.beginDateTime && req.body.endDateTime) {
      const beginDate = new Date(req.body.beginDateTime);
      const endDate = new Date(req.body.endDateTime);
      if (beginDate >= endDate) {
        await session.abortTransaction();
        session.endSession();
        return res.redirect('/surgeries/new?error=La date de d\u00e9but doit \u00eatre ant\u00e9rieure \u00e0 la date de fin');
      }
    }

    // Personnel médical
    if (req.body.medicalStaff && req.body.rolePlayedId) {
      const staffArray = Array.isArray(req.body.medicalStaff) ? req.body.medicalStaff : [req.body.medicalStaff];
      const roleArray = Array.isArray(req.body.rolePlayedId) ? req.body.rolePlayedId : [req.body.rolePlayedId];

      surgeryData.medicalStaff = staffArray.map((staff, index) => ({
        staff: staff,
        rolePlayedId: roleArray[index],
      }));
    }

    // Matériaux consommés
    const consumedMaterials = [];

    // Traiter les matériaux consommables
    if (req.body.consumableMaterialId && req.body.consumableMaterialQuantity) {
      const consumableArray = Array.isArray(req.body.consumableMaterialId) ? req.body.consumableMaterialId : [req.body.consumableMaterialId];
      const consumableQuantityArray = Array.isArray(req.body.consumableMaterialQuantity) ? req.body.consumableMaterialQuantity : [req.body.consumableMaterialQuantity];

      for (let index = 0; index < consumableArray.length; index++) {
        const materialId = consumableArray[index];
        const quantity = consumableQuantityArray[index];
        if (materialId && quantity) {
          // Get current material price to store it permanently (use session reads)
          const materialDoc = await Material.findById(materialId).session(session);
          consumedMaterials.push({
            material: materialId,
            quantity: parseFloat(quantity),
            priceUsed: materialDoc ? (materialDoc.weightedPrice || materialDoc.priceHT || 0) : 0,
          });
        }
      }
    }

    // Traiter les matériaux patient
    if (req.body.patientMaterialId && req.body.patientMaterialQuantity) {
      const patientArray = Array.isArray(req.body.patientMaterialId) ? req.body.patientMaterialId : [req.body.patientMaterialId];
      const patientQuantityArray = Array.isArray(req.body.patientMaterialQuantity) ? req.body.patientMaterialQuantity : [req.body.patientMaterialQuantity];

      for (let index = 0; index < patientArray.length; index++) {
        const material = patientArray[index];
        const qty = patientQuantityArray[index];
        if (material && qty) {
          const materialDoc = await Material.findById(material).session(session);
          consumedMaterials.push({
            material: material,
            quantity: parseFloat(qty),
            priceUsed: materialDoc ? (materialDoc.weightedPrice || materialDoc.priceHT || 0) : 0,
          });
        }
      }
    }

    if (consumedMaterials.length > 0) {
      surgeryData.consumedMaterials = consumedMaterials;
    }

    // Create and save surgery within transaction
    const surgery = new Surgery(surgeryData);
    await surgery.save({ session, validateBeforeSave: false });

    // Update material stock within same transaction
    if (surgery.consumedMaterials && surgery.consumedMaterials.length > 0) {
      for (const consumed of surgery.consumedMaterials) {
        try {
          await Material.findByIdAndUpdate(consumed.material, { $inc: { stock: -Math.abs(consumed.quantity) } }, { session });
        } catch (err) {
          console.error('Erreur mise \u00e0 jour stock materiel:', err);
          // If stock update fails, abort the whole transaction
          await session.abortTransaction();
          session.endSession();
          return res.redirect('/surgeries/new?error=Erreur lors de la mise \u00e0 jour du stock');
        }
      }
    }

    // Commit transaction before running heavier async post-processing
    await session.commitTransaction();
    session.endSession();

    // Post-commit: calculate fees (kept outside transaction to avoid long-running transactions)
    try {
      await calculateSurgeonFees(surgery._id);
    } catch (feeErr) {
      console.error('Erreur calcul honoraires (post-commit):', feeErr);
      // Do not rollback transaction here - surgery has been created. Notify user.
    }

    res.redirect('/surgeries?success=Chirurgie cr\u00e9e avec succ\u00e8s');
  } catch (error) {
    console.error('Erreur cr\u00e9ation chirurgie transaction:', error);
    try {
      await session.abortTransaction();
    } catch (e) {}
    session.endSession();
    res.redirect('/surgeries/new?error=Erreur lors de la cr\u00e9ation');
  }
};

// Formulaire nouvelle chirurgie
module.exports.renderCreateSurgeryForm = async (req, res) => {
  try {
    const patients = await Patient.find().sort({ lastName: 1 });
    const surgeons = await Surgeon.find().populate('specialty').sort({ lastName: 1 });
    const prestations = await Prestation.find().populate('specialty').sort({ designation: 1 });
    const medicalStaff = await MedicalStaff.find().populate('fonctions').sort({ lastName: 1 });
    const fonctions = await Fonction.find().sort({ name: 1 });
    const materials = await Material.find().sort({ designation: 1 });

    // Provide default empty surgery object so template can safely reference surgery properties
    const localsForRender = { title: 'Nouvelle Chirurgie', patients, surgeons, prestations, medicalStaff, fonctions, materials, surgery: {} };
    console.log('DEBUG renderCreateSurgeryForm locals keys:', Object.keys(localsForRender));
    res.render('surgeries/new', localsForRender);
  } catch (error) {
    console.error('Erreur formulaire nouvelle chirurgie:', error);
    res.status(500).render('error', { title: 'Erreur', error });
  }
};

// Voir chirurgie
module.exports.viewSurgery = async (req, res) => {
  try {
    const surgery = await Surgery.findById(req.params.id)
      .populate("patient")
      .populate("surgeon")
      .populate("prestation")
      .populate("medicalStaff.staff")
      .populate("medicalStaff.rolePlayedId")
      .populate("consumedMaterials.material");

    if (!surgery) {
      return res.status(404).render("404", { title: "Chirurgie non trouvée" });
    }

    // Calculer automatiquement les honoraires si non calculés
    if (!surgery.surgeonAmount || surgery.surgeonAmount === 0) {
      try {
        await calculateSurgeonFees(surgery._id);
        // Recharger la chirurgie avec les honoraires calculés
        const updatedSurgery = await Surgery.findById(req.params.id)
          .populate("patient")
          .populate("surgeon")
          .populate("prestation")
          .populate("medicalStaff.staff")
          .populate("medicalStaff.rolePlayedId")
          .populate("consumedMaterials.material");
        
        res.render("surgeries/show", {
          title: `Chirurgie: ${updatedSurgery.code}`,
          surgery: updatedSurgery,
        });
      } catch (calcError) {
        console.error("Erreur calcul automatique honoraires:", calcError);
        // Afficher la chirurgie même si le calcul échoue
        res.render("surgeries/show", {
          title: `Chirurgie: ${surgery.code}`,
          surgery,
        });
      }
    } else {
      res.render("surgeries/show", {
        title: `Chirurgie: ${surgery.code}`,
        surgery,
      });
    }
  } catch (error) {
    console.error("Erreur affichage chirurgie:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Calculer les honoraires
module.exports.calculateFees = async (req, res) => {
  try {
    await calculateSurgeonFees(req.params.id);
    res.redirect(`/surgeries/${req.params.id}?success=Honoraires calculés`);
  } catch (error) {
    console.error("Erreur calcul honoraires:", error);
    res.redirect(`/surgeries/${req.params.id}?error=Erreur lors du calcul`);
  }
};

// Fonction de calcul des honoraires
async function calculateSurgeonFees(surgeryId) {
  const surgery = await Surgery.findById(surgeryId)
    .populate("surgeon")
    .populate("prestation")
    .populate("consumedMaterials.material")
    .populate("medicalStaff.staff");

  if (!surgery || !surgery.surgeon || !surgery.prestation) {
    throw new Error("Données manquantes pour le calcul");
  }

  const prestation = surgery.prestation;
  const surgeon = surgery.surgeon;

  // Prix HT de la prestation (utiliser le prix ajusté ou le prix de base)
  // If adjustedPrice is not set, set it to the prestation price to ensure future consistency
  let prestationPriceHT = surgery.adjustedPrice;
  if (!prestationPriceHT) {
    prestationPriceHT = prestation.priceHT;
    // Update the surgery to save the price used
    await Surgery.findByIdAndUpdate(surgeryId, { adjustedPrice: prestationPriceHT });
  }

  // Calcul du coût total des matériaux
  let totalMaterialCost = 0;
  let totalPatientMaterialCost = 0;

  for (const consumedMaterial of surgery.consumedMaterials) {
    const material = consumedMaterial.material;
    const quantity = consumedMaterial.quantity || 0;
    const materialCost = (material?.weightedPrice || material?.priceHT || 0) * quantity;

    totalMaterialCost += materialCost;

    if (material.category === "patient") {
      totalPatientMaterialCost += materialCost;
    }
  }

  // Calcul des frais personnels du personnel médical (horaire)
  let totalPersonalFees = 0;
  const durationInHours = (surgery.actualDuration || 0) / 60;

  for (const staffEntry of surgery.medicalStaff) {
    if (staffEntry.staff && staffEntry.staff.personalFee) {
      // Calcul horaire des frais personnels
      totalPersonalFees += staffEntry.staff.personalFee * durationInHours;
    }
  }

  // Frais urgents - appliqués automatiquement pour les chirurgies urgentes (méthode pourcentage uniquement)
  // Urgent fee percentage (applied differently depending on contract)
  const urgentPercent = surgery.status === 'urgent' ? (prestation.urgentFeePercentage || 0) : 0;
  // urgentFees will be used where appropriate below (for clinic extra when needed)
  let urgentFees = 0;

  // Plus de multiplicateur de statut - utilisation directe des frais urgents
  let surgeonAmount = 0;
  let clinicAmount = 0;

  if (surgeon.contractType === "allocation") {
    // Méthode 1: Allocation de salle d'opération
    // Clinic amount = (duration × allocation rate) + materials + hourly personal fees
    const duration = surgery.actualDuration || 0; // en minutes
    const durationInHours = duration / 60;
    const allocationCost = durationInHours * (surgeon.allocationRate || 0);

    // For allocation method we don't assign the allocation cost to the surgeon.
    // The clinic keeps the allocation cost and receives materials, personal fees (with urgent uplift) and any extra duration fees.
    surgeonAmount = 0;

    // Personal fees get an urgent uplift when surgery is urgent (user requested)
    const effectivePersonalFees = totalPersonalFees * (1 + urgentPercent);

    // Handle extra duration fees (go to clinic)
    // Handle extra duration fees (go to clinic)
    let extraFees = 0;
    if (surgery.applyExtraFees && surgery.actualDuration > prestation.duration) {
      const extraduration = surgery.actualDuration - prestation.duration;
      if (extraduration >= (prestation.exceededDurationUnit || 15)) {
        extraFees = (prestation.exceededDurationFee || 0) * extraduration / (prestation.exceededDurationUnit || 15);
      }
    }

    // Clinic receives: allocation cost + materials + personal fees (with urgent uplift) + extra duration fees
    clinicAmount = allocationCost + totalMaterialCost + effectivePersonalFees + extraFees;
  } else if (surgeon.contractType === "percentage") {
    // Méthode 2: Pourcentage

    // 1. Calculate Extra Duration
    let extraDuration = surgery.actualDuration - prestation.duration;
    let extraUnits = 0;
    let extraFee = 0;

    if (surgery.applyExtraFees && extraDuration > 0) {
      const durationUnit = prestation.exceededDurationUnit || 15;
      const exceededFeePerUnit = prestation.exceededDurationFee || 0;
      extraUnits = Math.ceil(extraDuration / durationUnit);
      extraFee = exceededFeePerUnit * extraUnits;
    }

    // 2. Surgeon's Share
    const urgentRate = surgery.status === 'urgent' ? (prestation.urgentFeePercentage || 0) : 0;
    const surgeonRate = (surgeon.percentageRate || 45) / 100;
    const clinicRate = 1 - surgeonRate;

    surgeonAmount = ((prestationPriceHT * (1 + urgentRate) - totalPatientMaterialCost) * surgeonRate) - extraFee;
    surgeonAmount = Math.max(0, surgeonAmount);

    // 3. Clinic's Share
    const nonPatientMaterials = totalMaterialCost - totalPatientMaterialCost;
    clinicAmount = ((prestationPriceHT * (1 + urgentRate) - totalPatientMaterialCost) * clinicRate) + totalPatientMaterialCost + extraFee;
  }

  // S'assurer que le montant n'est pas négatif
  surgeonAmount = Math.max(0, surgeonAmount);
  clinicAmount = Math.max(0, clinicAmount);

  // Mettre à jour la chirurgie
  await Surgery.findByIdAndUpdate(surgeryId, {
    surgeonAmount: Math.round(surgeonAmount * 100) / 100, // Arrondir à 2 décimales
    clinicAmount: Math.round(clinicAmount * 100) / 100,
  });

  return surgeonAmount;
}

// Éditer chirurgie
module.exports.renderEditSurgeryForm = async (req, res) => {
  try {
    const surgery = await Surgery.findById(req.params.id)
      .populate("medicalStaff.staff")
      .populate("medicalStaff.rolePlayedId")
      .populate("consumedMaterials.material");

    if (!surgery) {
      return res.status(404).render("404", { title: "Chirurgie non trouvée" });
    }

    const patients = await Patient.find().sort({ lastName: 1 });
    const surgeons = await Surgeon.find()
      .populate("specialty")
      .sort({ lastName: 1 });
    const prestations = await Prestation.find()
      .populate("specialty")
      .sort({ designation: 1 });
    const medicalStaff = await MedicalStaff.find()
      .populate("fonctions")
      .sort({ lastName: 1 });
    const fonctions = await Fonction.find().sort({ name: 1 });
    const materials = await Material.find().sort({ designation: 1 });

    res.render("surgeries/edit", {
      title: "Modifier Chirurgie",
      surgery,
      patients,
      surgeons,
      prestations,
      medicalStaff,
      fonctions,
      materials,
    });
  } catch (error) {
    console.error("Erreur formulaire édition chirurgie:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Mettre à jour chirurgie
module.exports.updateSurgery = async (req, res) => {
  try {
    // Authorization: only admin or chefBloc can update any surgery; medecin only their own
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    if (!userPriv.includes('admin') && !userPriv.includes('chefBloc')) {
      if (userPriv.includes('medecin')) {
        const getLinkedSurgeonId = require('../utils/getLinkedSurgeonId');
        const linked = await getLinkedSurgeonId(req.user);
        const surgery = await Surgery.findById(req.params.id).select('surgeon');
        if (!surgery || String(surgery.surgeon) !== String(linked)) {
          req.flash('error', 'Accès non autorisé - vous ne pouvez pas modifier cette chirurgie');
          return res.redirect(`/surgeries/${req.params.id}`);
        }
      } else {
        req.flash('error', 'Accès non autorisé - droits insuffisants');
        return res.redirect(`/surgeries/${req.params.id}`);
      }
    }
    // Récupérer la chirurgie actuelle pour comparer les changements
    const currentSurgery = await Surgery.findById(req.params.id).populate('prestation');

    // Get the prestation document to know the default price
    const prestationDoc = await Prestation.findById(req.body.prestation);

    const surgeryData = {
      patient: req.body.patient,
      surgeon: req.body.surgeon,
      prestation: req.body.prestation,
      beginDateTime: req.body.beginDateTime,
      endDateTime: req.body.endDateTime,
      status: req.body.status,
      notes: req.body.notes,
      applyExtraFees: req.body.applyExtraFees === "on",
      // Always save the effective price used for this surgery in adjustedPrice
      // This ensures surgeries are not affected by future prestation price changes
      adjustedPrice: req.body.adjustedPrice ? parseFloat(req.body.adjustedPrice) : (prestationDoc ? prestationDoc.priceHT : currentSurgery.adjustedPrice),
    };

    // Validation des dates: beginDateTime doit être avant endDateTime
    if (req.body.beginDateTime && req.body.endDateTime) {
      const beginDate = new Date(req.body.beginDateTime);
      const endDate = new Date(req.body.endDateTime);
      if (beginDate >= endDate) {
        return res.redirect(`/surgeries/${req.params.id}/edit?error=La date de début doit être antérieure à la date de fin`);
      }
    }

    // Gestion spécifique selon le statut
    const newStatus = req.body.status;
    const oldStatus = currentSurgery.status;

    // Si le statut passe à "urgent", appliquer automatiquement les frais urgents
    if (newStatus === 'urgent' && oldStatus !== 'urgent') {
      surgeryData.applyExtraFees = true; // Appliquer automatiquement les frais supplémentaires pour les urgences
    }

    // Si le statut passe à "planned", retirer les frais urgents
    if (newStatus === 'planned' && oldStatus === 'urgent') {
      surgeryData.applyExtraFees = false; // Retirer les frais urgents pour les chirurgies planifiées
    }

    // Personnel médical
    if (req.body.medicalStaff && req.body.rolePlayedId) {
      const staffArray = Array.isArray(req.body.medicalStaff)
        ? req.body.medicalStaff
        : [req.body.medicalStaff];
      const roleArray = Array.isArray(req.body.rolePlayedId)
        ? req.body.rolePlayedId
        : [req.body.rolePlayedId];

      surgeryData.medicalStaff = staffArray.map((staff, index) => ({
        staff: staff,
        rolePlayedId: roleArray[index],
      }));
    }

    // Matériaux consommés
    const consumedMaterials = [];

    // Traiter les matériaux consommables
    if (req.body.consumableMaterialId && req.body.consumableMaterialQuantity) {
      const consumableArray = Array.isArray(req.body.consumableMaterialId)
        ? req.body.consumableMaterialId
        : [req.body.consumableMaterialId];
      const consumableQuantityArray = Array.isArray(req.body.consumableMaterialQuantity)
        ? req.body.consumableMaterialQuantity
        : [req.body.consumableMaterialQuantity];

      for (let index = 0; index < consumableArray.length; index++) {
        const materialId = consumableArray[index];
        const quantity = consumableQuantityArray[index];
        if (materialId && quantity) {
          // Get current material price to store it permanently
          const materialDoc = await Material.findById(materialId);
          consumedMaterials.push({
            material: materialId,
            quantity: parseFloat(quantity),
            priceUsed: materialDoc ? (materialDoc.weightedPrice || materialDoc.priceHT || 0) : 0,
          });
        }
      }
    }

    // Traiter les matériaux patient
    if (req.body.patientMaterialId && req.body.patientMaterialQuantity) {
      const patientArray = Array.isArray(req.body.patientMaterialId)
        ? req.body.patientMaterialId
        : [req.body.patientMaterialId];
      const patientQuantityArray = Array.isArray(req.body.patientMaterialQuantity)
        ? req.body.patientMaterialQuantity
        : [req.body.patientMaterialQuantity];

      for (let index = 0; index < patientArray.length; index++) {
        const materialId = patientArray[index];
        const quantity = patientQuantityArray[index];
        if (materialId && quantity) {
          // Get current material price to store it permanently
          const materialDoc = await Material.findById(materialId);
          consumedMaterials.push({
            material: materialId,
            quantity: parseFloat(quantity),
            priceUsed: materialDoc ? (materialDoc.weightedPrice || materialDoc.priceHT || 0) : 0,
          });
        }
      }
    }

    if (consumedMaterials.length > 0) {
      surgeryData.consumedMaterials = consumedMaterials;
    }

    await Surgery.findByIdAndUpdate(req.params.id, surgeryData);

    // Recalculer les honoraires avec la nouvelle logique de statut
    await calculateSurgeonFees(req.params.id);

    // Message de succès personnalisé selon le statut
    let successMessage = "Chirurgie modifiée avec succès";
    if (newStatus === 'urgent') {
      successMessage = "Chirurgie marquée comme urgente - frais urgents appliqués";
    } else if (newStatus === 'planned') {
      successMessage = "Chirurgie marquée comme planifiée - frais standards appliqués";
    }

    res.redirect(
      `/surgeries/${req.params.id}?success=${encodeURIComponent(successMessage)}`
    );
  } catch (error) {
    console.error("Erreur mise à jour chirurgie:", error);
    res.redirect(
      `/surgeries/${req.params.id}/edit?error=Erreur lors de la modification`
    );
  }
};

// Changement rapide de statut
module.exports.updateSurgeryStatus = async (req, res) => {
  try {
    const { newStatus } = req.body;
    const surgeryId = req.params.id;

    // Récupérer la chirurgie actuelle
    const currentSurgery = await Surgery.findById(surgeryId).populate('prestation');

    if (!currentSurgery) {
      return res.status(404).render("404", { title: "Chirurgie non trouvée" });
    }

    const oldStatus = currentSurgery.status;
    const surgeryData = { status: newStatus };

    // Gestion spécifique selon le nouveau statut
    if (newStatus === 'urgent' && oldStatus !== 'urgent') {
      surgeryData.applyExtraFees = true;
    }

    if (newStatus === 'planned' && oldStatus === 'urgent') {
      surgeryData.applyExtraFees = false;
    }

    // Mettre à jour le statut
    await Surgery.findByIdAndUpdate(surgeryId, surgeryData);

    // Recalculer les honoraires
    await calculateSurgeonFees(surgeryId);

    // Message de succès personnalisé
    let successMessage = "Statut mis à jour avec succès";
    if (newStatus === 'urgent') {
      successMessage = "Chirurgie marquée comme urgente - frais appliqués";
    } else if (newStatus === 'planned') {
      successMessage = "Chirurgie marquée comme planifiée - frais standards appliqués";
    }

    res.redirect(
      `/surgeries/${surgeryId}?success=${encodeURIComponent(successMessage)}`
    );
  } catch (error) {
    console.error("Erreur changement statut:", error);
    res.redirect(
      `/surgeries/${req.params.id}?error=Erreur lors du changement de statut`
    );
  }
};

// Supprimer chirurgie
module.exports.deleteSurgery = async (req, res) => {
  try {
    // Authorization: only admin or chefBloc can delete; medecin cannot delete
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    if (!userPriv.includes('admin') && !userPriv.includes('chefBloc')) {
      req.flash('error', 'Accès non autorisé - seuls admin et chef de bloc peuvent supprimer');
      return res.redirect('/surgeries');
    }
    await Surgery.findByIdAndDelete(req.params.id);
    res.redirect("/surgeries?success=Chirurgie supprimée avec succès");
  } catch (error) {
    console.error("Erreur suppression chirurgie:", error);
    res.redirect("/surgeries?error=Erreur lors de la suppression");
  }
};
