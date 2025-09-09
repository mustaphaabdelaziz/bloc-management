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
    const materials = await Material.find().populate('specialty').sort({ designation: 1 });

    // Group prestations by specialty for easier filtering
    const prestationsBySpecialty = {};
    prestations.forEach(prestation => {
      const specialtyId = prestation.specialty._id.toString();
      if (!prestationsBySpecialty[specialtyId]) {
        prestationsBySpecialty[specialtyId] = [];
      }
      prestationsBySpecialty[specialtyId].push(prestation);
    });

    res.render("surgeries/new", {
      title: "Nouvelle Chirurgie",
      surgery: {},
      patients,
      surgeons,
      prestations,
      prestationsBySpecialty,
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
    // Validate surgeon and prestation specialties
    const surgeonDoc = await Surgeon.findById(req.body.surgeon).populate('specialty');
    const prestationDoc = await Prestation.findById(req.body.prestation).populate('specialty');

    if (!surgeonDoc || !prestationDoc) {
      return res.redirect('/surgeries/new?error=Chirurgien ou prestation introuvable');
    }

    if (String(surgeonDoc.specialty._id) !== String(prestationDoc.specialty._id)) {
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

    // Mettre \u00e0 jour le stock des mat\u00e9riaux consomm\u00e9s (d\u00e9cr\u00e9menter)
    if (surgery.consumedMaterials && surgery.consumedMaterials.length > 0) {
      for (const consumed of surgery.consumedMaterials) {
        try {
          await Material.findByIdAndUpdate(consumed.material, { $inc: { stock: -Math.abs(consumed.quantity) } });
        } catch (err) {
          console.error('Erreur mise \u00e0 jour stock materiel:', err);
        }
      }
    }

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

  // Prix HT de la prestation
  const prestationPriceHT = prestation.priceHT || 0;

  // Calcul du coût total des matériaux
  let totalMaterialCost = 0;
  let totalPatientMaterialCost = 0;

  for (const consumedMaterial of surgery.consumedMaterials) {
    const material = consumedMaterial.material;
    const quantity = consumedMaterial.quantity || 0;
    const materialCost = (material.weightedPrice || 0) * quantity;

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

  // Frais urgents - appliqués automatiquement pour les chirurgies urgentes
  let urgentFees = 0;
  if (surgery.status === 'urgent') {
    urgentFees = prestation.urgentFee || 0;
    // Les frais urgents sont toujours appliqués pour les urgences
  }

  // Ajustements selon le statut de la chirurgie
  let statusMultiplier = 1;
  if (surgery.status === 'completed') {
    // Pour les chirurgies terminées, appliquer tous les frais
    statusMultiplier = 1;
  } else if (surgery.status === 'in-progress') {
    // Pour les chirurgies en cours, appliquer 80% des frais (estimation)
    statusMultiplier = 0.8;
  } else if (surgery.status === 'urgent') {
    // Pour les urgences, appliquer un multiplicateur de 1.2 (20% supplémentaire)
    statusMultiplier = 1.2;
  }

  let surgeonAmount = 0;
  let clinicAmount = 0;

  if (surgeon.contractType === "allocation") {
    // Méthode 1: Allocation de salle d'opération
    // Surgeon pays: (duration × allocation rate) + materials + hourly personal fees
    const duration = surgery.actualDuration || 0; // en minutes
    const durationInHours = duration / 60;
    const allocationCost = durationInHours * (surgeon.allocationRate || 0);

    // Formule demandée: (durée × taux allocation) + matériaux + frais personnels horaires
    const surgeonPaysClinic = (allocationCost + totalMaterialCost + totalPersonalFees) * statusMultiplier;

    // Le chirurgien reçoit: Prix prestation HT - ce qu'il paye à la clinique
    surgeonAmount = (prestationPriceHT - surgeonPaysClinic) * statusMultiplier;

    // La clinique reçoit: ce que paye le chirurgien + frais urgents - frais dépassement
    let extraFees = 0;
    if (surgery.applyExtraFees && surgery.actualDuration > prestation.duration) {
      const extraduration = surgery.actualDuration - prestation.duration;
      if (extraduration >= (prestation.exceededDurationUnit || 15)) {
        extraFees = (prestation.exceededDurationFee || 0) * extraduration / (prestation.exceededDurationUnit || 15);
      }
    }

    let urgentFees = 0;
    if (surgery.status === 'urgent') {
      urgentFees = prestation.urgentFee || 0;
    }

    clinicAmount = surgeonPaysClinic + urgentFees - extraFees;
  } else if (surgeon.contractType === "percentage") {
    // Méthode 2: Pourcentage
    // Surgeon amount = (Prestation price – Patient materials) * Surgeon rate from contract + duration exceeds fee

    // Gestion des frais de dépassement pour la méthode 2
    let extraFees = 0;
    if (
      surgery.applyExtraFees &&
      surgery.actualDuration > prestation.duration
    ) {
      const extraduration = surgery.actualDuration - prestation.duration;
      // Only apply extra fee if duration exceeds by at least the duration unit
      if (extraduration >= (prestation.exceededDurationUnit || 15)) {
        extraFees = (prestation.exceededDurationFee || 0) * extraduration / (prestation.exceededDurationUnit || 15);
      }
    }

    // Surgeon amount = (Prestation price – Patient materials) * Surgeon rate from contract + duration exceeds fee
    const netAmount = (prestationPriceHT - totalPatientMaterialCost) * statusMultiplier;
    surgeonAmount = (netAmount * (surgeon.percentageRate || 0)) / 100 + extraFees;

    // Clinic receives: the rest + personal fees + urgent fees + materials (non-patient) - extra fees (since extra goes to surgeon)
    clinicAmount = (netAmount - (surgeonAmount - extraFees)) + totalPersonalFees + urgentFees + (totalMaterialCost - totalPatientMaterialCost);
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
    // Récupérer la chirurgie actuelle pour comparer les changements
    const currentSurgery = await Surgery.findById(req.params.id).populate('prestation');

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

    // Gestion spécifique selon le statut
    const newStatus = req.body.status;
    const oldStatus = currentSurgery.status;

    // Si le statut passe à "urgent", appliquer automatiquement les frais urgents
    if (newStatus === 'urgent' && oldStatus !== 'urgent') {
      surgeryData.applyExtraFees = true; // Appliquer automatiquement les frais supplémentaires pour les urgences
    }

    // Gestion des statuts "en cours" et "terminé"
    if (newStatus === 'in-progress' && oldStatus !== 'in-progress') {
      // Quand la chirurgie commence, définir la date de début si pas déjà définie
      if (!surgeryData.beginDateTime && !currentSurgery.beginDateTime) {
        surgeryData.beginDateTime = new Date();
      }
    }

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      // Quand la chirurgie se termine, définir la date de fin si pas déjà définie
      if (!surgeryData.endDateTime && !currentSurgery.endDateTime) {
        surgeryData.endDateTime = new Date();
      }
      // Pour les chirurgies terminées, s'assurer que les frais sont calculés
      surgeryData.applyExtraFees = true;
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

    // Recalculer les honoraires avec la nouvelle logique de statut
    await calculateSurgeonFees(req.params.id);

    // Message de succès personnalisé selon le statut
    let successMessage = "Chirurgie modifiée avec succès";
    if (newStatus === 'urgent') {
      successMessage = "Chirurgie marquée comme urgente - frais urgents appliqués";
    } else if (newStatus === 'in-progress') {
      successMessage = "Chirurgie démarrée avec succès";
    } else if (newStatus === 'completed') {
      successMessage = "Chirurgie terminée - honoraires calculés";
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

    if (newStatus === 'in-progress' && oldStatus !== 'in-progress') {
      if (!currentSurgery.beginDateTime) {
        surgeryData.beginDateTime = new Date();
      }
    }

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      if (!currentSurgery.endDateTime) {
        surgeryData.endDateTime = new Date();
      }
      surgeryData.applyExtraFees = true;
    }

    // Mettre à jour le statut
    await Surgery.findByIdAndUpdate(surgeryId, surgeryData);

    // Recalculer les honoraires
    await calculateSurgeonFees(surgeryId);

    // Message de succès personnalisé
    let successMessage = "Statut mis à jour avec succès";
    if (newStatus === 'urgent') {
      successMessage = "Chirurgie marquée comme urgente - frais appliqués";
    } else if (newStatus === 'in-progress') {
      successMessage = "Chirurgie démarrée";
    } else if (newStatus === 'completed') {
      successMessage = "Chirurgie terminée - honoraires calculés";
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
    await Surgery.findByIdAndDelete(req.params.id);
    res.redirect("/surgeries?success=Chirurgie supprimée avec succès");
  } catch (error) {
    console.error("Erreur suppression chirurgie:", error);
    res.redirect("/surgeries?error=Erreur lors de la suppression");
  }
};
