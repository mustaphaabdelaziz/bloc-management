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

// Formulaire nouvelle chirurgie
module.exports.renderCreateSurgeryForm = async (req, res) => {
  try {
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

    res.render("surgeries/new", {
      title: "Nouvelle Chirurgie",
      surgery: {},
      patients,
      surgeons,
      prestations,
      medicalStaff,
      fonctions,
      materials,
    });
  } catch (error) {
    console.error("Erreur formulaire chirurgie:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Créer chirurgie
module.exports.createSurgery = async (req, res) => {
  try {
    const surgeryData = {
      patient: req.body.patient,
      surgeon: req.body.surgeon,
      prestation: req.body.prestation,
      beginDateTime: req.body.beginDateTime,
      endDateTime: req.body.endDateTime,
      status: req.body.status,
      notes: req.body.notes,
      applyExtraFees: req.body.applyExtraFees === "on",
    };

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
    if (req.body.materialId && req.body.materialQuantity) {
      const materialArray = Array.isArray(req.body.materialId)
        ? req.body.materialId
        : [req.body.materialId];
      const quantityArray = Array.isArray(req.body.materialQuantity)
        ? req.body.materialQuantity
        : [req.body.materialQuantity];

      surgeryData.consumedMaterials = materialArray.map((material, index) => ({
        material: material,
        quantity: parseInt(quantityArray[index]),
      }));
    }

    const surgery = new Surgery(surgeryData);
    await surgery.save({ validateBeforeSave: false });

    // Calculer les honoraires du chirurgien
    await calculateSurgeonFees(surgery._id);

    res.redirect("/surgeries?success=Chirurgie créée avec succès");
  } catch (error) {
    console.error("Erreur création chirurgie:", error);
    res.redirect("/surgeries/new?error=Erreur lors de la création");
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

    res.render("surgeries/show", {
      title: `Chirurgie: ${surgery.code}`,
      surgery,
    });
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
    .populate("consumedMaterials.material");

  if (!surgery || !surgery.surgeon || !surgery.prestation) {
    throw new Error("Données manquantes pour le calcul");
  }

  const prestation = surgery.prestation;
  const surgeon = surgery.surgeon;

  // Prix HT de la prestation
  const prestationPriceHT = prestation.priceHT;
  const tvAmount = prestationPriceHT * prestation.tva;

  // Calcul du coût total des matériaux
  let totalMaterialCost = 0;
  let totalPatientMaterialCost = 0;
  let totalConsumableMaterialCost = 0;

  for (const consumedMaterial of surgery.consumedMaterials) {
    const material = consumedMaterial.material;
    const quantity = consumedMaterial.quantity;
    const materialCost = material.weightedPrice * quantity;

    totalMaterialCost += materialCost;

    if (material.category === "patient") {
      totalPatientMaterialCost += materialCost;
    } else if (material.category === "consumable") {
      totalConsumableMaterialCost += materialCost;
    }
  }

  let surgeonAmount = 0;

  if (surgeon.contractType === "allocation") {
    // Méthode 1: Allocation de salle d'opération
    const duration = surgery.actualDuration || 0; // en minutes
    const durationInHours = duration / 60;
    const allocationCost = durationInHours * (surgeon.allocationRate || 0);

    // Gestion des frais de dépassement
    let extraFees = 0;
    if (
      surgery.applyExtraFees &&
      surgery.actualDuration > prestation.duration
    ) {
      const exceededMinutes = surgery.actualDuration - prestation.duration;
      const exceededUnits = Math.ceil(
        exceededMinutes / prestation.exceededDurationUnit
      );
      extraFees = exceededUnits * prestation.exceededDurationFee;
    }

    // Formule: Prix prestation HT - TVA - matériaux totaux - coût allocation + frais dépassement
    surgeonAmount =
      prestationPriceHT -
      tvAmount -
      totalMaterialCost -
      allocationCost +
      extraFees;
  } else if (surgeon.contractType === "percentage") {
    // Méthode 2: Pourcentage
    // Seuls les matériaux patients sont déduits
    const netAmount = prestationPriceHT - tvAmount - totalPatientMaterialCost;
    surgeonAmount = (netAmount * (surgeon.percentageRate || 0)) / 100;
  }

  // S'assurer que le montant n'est pas négatif
  surgeonAmount = Math.max(0, surgeonAmount);

  // Mettre à jour la chirurgie
  await Surgery.findByIdAndUpdate(surgeryId, {
    surgeonAmount: Math.round(surgeonAmount * 100) / 100, // Arrondir à 2 décimales
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
    const surgeryData = {
      patient: req.body.patient,
      surgeon: req.body.surgeon,
      prestation: req.body.prestation,
      beginDateTime: req.body.beginDateTime,
      endDateTime: req.body.endDateTime,
      status: req.body.status,
      notes: req.body.notes,
      applyExtraFees: req.body.applyExtraFees === "on",
    };

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
    if (req.body.materialId && req.body.materialQuantity) {
      const materialArray = Array.isArray(req.body.materialId)
        ? req.body.materialId
        : [req.body.materialId];
      const quantityArray = Array.isArray(req.body.materialQuantity)
        ? req.body.materialQuantity
        : [req.body.materialQuantity];

      surgeryData.consumedMaterials = materialArray.map((material, index) => ({
        material: material,
        quantity: parseInt(quantityArray[index]),
      }));
    }

    await Surgery.findByIdAndUpdate(req.params.id, surgeryData);

    // Recalculer les honoraires
    await calculateSurgeonFees(req.params.id);

    res.redirect(
      `/surgeries/${req.params.id}?success=Chirurgie modifiée avec succès`
    );
  } catch (error) {
    console.error("Erreur mise à jour chirurgie:", error);
    res.redirect(
      `/surgeries/${req.params.id}/edit?error=Erreur lors de la modification`
    );
  }
};

// Supprimer chirurgie
module.exports.deleteSurgery = async (req, res) => {
  try {
    await Surgery.findByIdAndDelete(req.params.id);
    res.redirect("/surgeries?success=Chirurgie supprimée avec succès");
  } catch (error) {
    console.error("Erreur suppression chirurgie:", error);
    res.redirect("/surgeries?error=Erreur lors de la suppression");
  }
};
