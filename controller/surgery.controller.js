const Surgery = require("../models/Surgery");
const Patient = require("../models/Patient");
const Surgeon = require("../models/Surgeon");
const Prestation = require("../models/Prestation");
const MedicalStaff = require("../models/MedicalStaff");
const Fonction = require("../models/Fonction");
const Material = require("../models/Material");
const Reservation = require("../models/Reservation");
const AsaPricing = require("../models/AsaPricing");

// Liste des chirurgies
module.exports.surgeryList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const statusFilter = req.query.status || "";
    const dateFilter = req.query.date || "";
    const searchQuery = req.query.search || "";
    const surgeonFilter = req.query.surgeon || "";
    const asaFilter = req.query.asaClass || "";

    let query = {};
    if (statusFilter) query.status = statusFilter;
    if (dateFilter) {
      const date = new Date(dateFilter);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query.incisionTime = { $gte: date, $lt: nextDay };
    }
    if (surgeonFilter) query.surgeon = surgeonFilter;
    
    // ASA filtering
    if (asaFilter) {
      if (asaFilter === 'none') {
        query.asaClass = null;
      } else {
        query.asaClass = asaFilter;
      }
    }

    // Add search functionality
    if (searchQuery) {
      query.$or = [
        { code: { $regex: searchQuery, $options: 'i' } },
        { notes: { $regex: searchQuery, $options: 'i' } }
      ];
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
      .populate("operatingRoom", "code name")
      .sort({ incisionTime: -1 })
      .skip(skip)
      .limit(limit);

    const totalSurgeries = await Surgery.countDocuments(query);

    // Calculate additional statistics for the dashboard
    const completedSurgeries = await Surgery.countDocuments({ ...query, closingIncisionTime: { $exists: true, $ne: null } });
    const plannedSurgeries = await Surgery.countDocuments({ ...query, status: 'planned' });
    const urgentSurgeries = await Surgery.countDocuments({ ...query, status: 'urgent' });

    // Get surgeons list for filter dropdown
    const surgeons = await Surgeon.find({}).sort({ firstName: 1, lastName: 1 });

    const totalPages = Math.ceil(totalSurgeries / limit);

    // Check if user can view financial information
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canViewFinancialInfo = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    res.render("surgeries/index", {
      title: "Gestion des Chirurgies",
      surgeries,
      surgeons,
      currentPage: page,
      canViewFinancialInfo,
      totalPages,
      statusFilter,
      dateFilter,
      searchQuery,
      surgeonFilter,
      asaFilter,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      totalSurgeries,
      completedSurgeries,
      plannedSurgeries,
      urgentSurgeries,
    });
  } catch (error) {
    console.error("Erreur liste chirurgies:", error);
    res.status(500).render("errorHandling/error", { title: "Erreur", statusCode: 500, err: error });
  }
};

// Créer chirurgie (transactional + authorization)
module.exports.createSurgery = async (req, res) => {
  // Authorization guard: only admin and chefBloc can create surgeries
  if (!req.user || !(req.user.privileges && (req.user.privileges.includes('admin') || req.user.privileges.includes('chefBloc')))) {
    req.flash('error', 'Accès non autorisé - droit création chirurgie requis');
    return res.redirect('/surgeries');
  }

  console.log('DEBUG createSurgery - req.body:', req.body);

  try {
    console.log('DEBUG - Full request body:', JSON.stringify(req.body, null, 2));
    console.log('DEBUG - Surgeon ID:', req.body.surgeon);
    console.log('DEBUG - Patient ID:', req.body.patient);
    console.log('DEBUG - Prestation ID:', req.body.prestation);
    console.log('DEBUG - Surgery Code:', req.body.code);
    
    // Validate and trim surgery code
    const surgeryCode = String(req.body.code || '').trim();
    if (!surgeryCode) {
      req.flash('error', 'Le code de chirurgie est obligatoire');
      return res.redirect('/surgeries/new');
    }
    
    // Check if code already exists
    const existingCode = await Surgery.findOne({ code: surgeryCode });
    if (existingCode) {
      req.flash('error', `Le code "${surgeryCode}" est déjà utilisé. Veuillez choisir un code unique.`);
      return res.redirect('/surgeries/new');
    }
    
    // Trim IDs to remove any whitespace
    const surgeonId = String(req.body.surgeon || '').trim();
    const patientId = String(req.body.patient || '').trim();
    const prestationId = String(req.body.prestation || '').trim();
    
    if (!surgeonId || !patientId || !prestationId) {
      throw new Error(`Missing required IDs - patient: ${!!patientId}, surgeon: ${!!surgeonId}, prestation: ${!!prestationId}`);
    }
    
    // Validate surgeon and prestation specialties
    const surgeonDoc = await Surgeon.findById(surgeonId).populate('specialty');
    const prestationDoc = await Prestation.findById(prestationId).populate('specialty');

    console.log('DEBUG - Surgeon found:', surgeonDoc ? 'YES' : 'NO');
    console.log('DEBUG - Prestation found:', prestationDoc ? 'YES' : 'NO');

    if (!surgeonDoc || !prestationDoc) {
      return res.redirect('/surgeries/new?error=Chirurgien ou prestation introuvable');
    }

    if (String(surgeonDoc.specialty._id) !== String(prestationDoc.specialty._id)) {
      return res.redirect('/surgeries/new?error=La prestation choisie ne correspond pas à la spécialité du chirurgien');
    }

    const surgeryData = {
      code: surgeryCode,
      patient: patientId,
      surgeon: surgeonId,
      prestation: prestationId,
      entreeBloc: req.body.entreeBloc || null,
      entreeSalle: req.body.entreeSalle || null,
      sortieSalle: req.body.sortieSalle || null,
      incisionTime: req.body.incisionTime,
      closingIncisionTime: req.body.closingIncisionTime || null,
      status: req.body.status,
      notes: req.body.notes,
      applyExtraFees: req.body.applyExtraFees === 'on',
      // Save the effective price used for this surgery to freeze later changes
      adjustedPrice: req.body.adjustedPrice ? parseFloat(req.body.adjustedPrice) : prestationDoc.priceHT,
      // ASA classification fields
      asaClass: req.body.asaClass || null,
      asaUrgent: req.body.asaUrgent === 'on',
      // Store audit info if schema allows
      createdBy: req.user ? req.user._id : undefined,
      updatedBy: req.user ? req.user._id : undefined,
    };

    // Validation des dates: incisionTime doit être avant closingIncisionTime
    if (req.body.incisionTime && req.body.closingIncisionTime) {
      const incisionDate = new Date(req.body.incisionTime);
      const closingDate = new Date(req.body.closingIncisionTime);
      if (incisionDate >= closingDate) {
        return res.redirect('/surgeries/new?error=L\'heure d\'incision doit être antérieure à l\'heure de fermeture');
      }
    }
    // Validate chronological order of all dates
    if (req.body.entreeBloc && req.body.entreeSalle) {
      if (new Date(req.body.entreeBloc) >= new Date(req.body.entreeSalle)) {
        return res.redirect('/surgeries/new?error=L\'entrée au bloc doit être antérieure à l\'entrée en salle');
      }
    }
    if (req.body.entreeSalle && req.body.incisionTime) {
      if (new Date(req.body.entreeSalle) >= new Date(req.body.incisionTime)) {
        return res.redirect('/surgeries/new?error=L\'entrée en salle doit être antérieure à l\'incision');
      }
    }

    // Personnel médical - only add if both staff and role are selected
    if (req.body.medicalStaff && req.body.rolePlayedId) {
      const staffArray = Array.isArray(req.body.medicalStaff) ? req.body.medicalStaff : [req.body.medicalStaff];
      const roleArray = Array.isArray(req.body.rolePlayedId) ? req.body.rolePlayedId : [req.body.rolePlayedId];

      // Filter out empty entries
      const medicalStaffEntries = [];
      for (let i = 0; i < staffArray.length; i++) {
        const staff = staffArray[i];
        const role = roleArray[i];
        if (staff && staff.trim() && role && role.trim()) {
          medicalStaffEntries.push({
            staff: staff,
            rolePlayedId: role,
          });
        }
      }
      if (medicalStaffEntries.length > 0) {
        surgeryData.medicalStaff = medicalStaffEntries;
      }
    }

    // Matériaux consommés - informational only, no stock reduction
    const consumedMaterials = [];

    console.log('DEBUG - Processing consumed materials...');
    console.log('DEBUG - consumableMaterialId:', req.body.consumableMaterialId);
    console.log('DEBUG - consumableMaterialQuantity:', req.body.consumableMaterialQuantity);
    console.log('DEBUG - patientMaterialId:', req.body.patientMaterialId);
    console.log('DEBUG - patientMaterialQuantity:', req.body.patientMaterialQuantity);

    // Traiter les matériaux consommables
    if (req.body.consumableMaterialId && req.body.consumableMaterialQuantity) {
      const consumableArray = Array.isArray(req.body.consumableMaterialId) ? req.body.consumableMaterialId : [req.body.consumableMaterialId];
      const consumableQuantityArray = Array.isArray(req.body.consumableMaterialQuantity) ? req.body.consumableMaterialQuantity : [req.body.consumableMaterialQuantity];
      console.log(`DEBUG - Processing ${consumableArray.length} consumable materials`);

      for (let index = 0; index < consumableArray.length; index++) {
        const materialId = consumableArray[index] ? String(consumableArray[index]).trim() : '';
        const quantity = consumableQuantityArray[index] ? String(consumableQuantityArray[index]).trim() : '';
        console.log(`DEBUG - [${index}] materialId: "${materialId}", quantity: "${quantity}"`);
        if (materialId && quantity) {
          // Get current material price to store it permanently (use purchase price for consumables)
          const materialDoc = await Material.findById(materialId);
          if (materialDoc) {
            const entry = {
              material: materialId,
              quantity: parseFloat(quantity),
              priceUsed: materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
            };
            consumedMaterials.push(entry);
            console.log(`DEBUG - Added consumable: ${materialDoc.designation} x${quantity} @ ${entry.priceUsed}/unit`);
          } else {
            console.log(`DEBUG - Material not found: ${materialId}`);
          }
        } else {
          console.log(`DEBUG - Skipped consumable [${index}]: missing materialId or quantity`);
        }
      }
    }

    // Traiter les matériaux patient - use selling price for patient billing
    if (req.body.patientMaterialId && req.body.patientMaterialQuantity) {
      const patientArray = Array.isArray(req.body.patientMaterialId) ? req.body.patientMaterialId : [req.body.patientMaterialId];
      const patientQuantityArray = Array.isArray(req.body.patientMaterialQuantity) ? req.body.patientMaterialQuantity : [req.body.patientMaterialQuantity];
      // Get patient references array (optional field for tracking material reference/serial/lot numbers)
      const patientReferenceArray = req.body.patientMaterialReference 
        ? (Array.isArray(req.body.patientMaterialReference) ? req.body.patientMaterialReference : [req.body.patientMaterialReference])
        : [];
      console.log(`DEBUG - Processing ${patientArray.length} patient materials`);

      for (let index = 0; index < patientArray.length; index++) {
        const material = patientArray[index] ? String(patientArray[index]).trim() : '';
        const qty = patientQuantityArray[index] ? String(patientQuantityArray[index]).trim() : '';
        const reference = patientReferenceArray[index] ? String(patientReferenceArray[index]).trim() : '';
        console.log(`DEBUG - [${index}] materialId: "${material}", quantity: "${qty}", reference: "${reference}"`);
        if (material && qty) {
          const materialDoc = await Material.findById(material);
          if (materialDoc) {
            // Use selling price for patient materials (includes markup)
            const entry = {
              material: material,
              quantity: parseFloat(qty),
              priceUsed: materialDoc.sellingPriceHT || materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
            };
            // Add patientReference if provided
            if (reference) {
              entry.patientReference = reference;
            }
            consumedMaterials.push(entry);
            console.log(`DEBUG - Added patient material: ${materialDoc.designation} x${qty} @ ${entry.priceUsed}/unit, ref: ${reference || 'N/A'}`);
          } else {
            console.log(`DEBUG - Material not found: ${material}`);
          }
        } else {
          console.log(`DEBUG - Skipped patient material [${index}]: missing materialId or quantity`);
        }
      }
    }

    if (consumedMaterials.length > 0) {
      console.log(`DEBUG - Total consumed materials to save: ${consumedMaterials.length}`);
      surgeryData.consumedMaterials = consumedMaterials;
    } else {
      console.log('DEBUG - No consumed materials to save');
    }

    // Create and save surgery
    const surgery = new Surgery(surgeryData);
    await surgery.save({ validateBeforeSave: false });

    // Material consumption is now informational only - no stock reduction
    // Stock quantities are managed separately through arrivals/purchases

    // Post-creation: calculate fees
    try {
      await calculateSurgeonFees(surgery._id);
    } catch (feeErr) {
      console.error('Erreur calcul honoraires (post-creation):', feeErr);
      // Do not fail - surgery has been created
    }

    res.redirect('/surgeries?success=Chirurgie créée avec succès');
  } catch (error) {
    console.error('Erreur création chirurgie:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.redirect('/surgeries/new?error=Erreur lors de la création');
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
    const operatingRooms = await OperatingRoom.find({ isActive: true }).sort({ name: 1 });

    // Check if user can edit financial fields
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canEditSurgeryFinancials = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    // Provide default empty surgery object so template can safely reference surgery properties
    const localsForRender = { title: 'Nouvelle Chirurgie', patients, surgeons, prestations, medicalStaff, fonctions, materials, operatingRooms, surgery: {}, canEditSurgeryFinancials };
    console.log('DEBUG renderCreateSurgeryForm locals keys:', Object.keys(localsForRender));
    res.render('surgeries/new', localsForRender);
  } catch (error) {
    console.error('Erreur formulaire nouvelle chirurgie:', error);
    res.status(500).render('error', { title: 'Erreur', error });
  }
};

// Render create surgery form from reservation
module.exports.renderCreateSurgeryFromReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('patient')
      .populate('surgeon')
      .populate('prestation')
      .populate('operatingRoom');
    
    if (!reservation) {
      req.flash('error', 'Réservation introuvable');
      return res.redirect('/surgeries/planning/view');
    }
    
    if (reservation.reservationStatus === 'converted') {
      req.flash('error', 'Cette réservation a déjà été convertie en chirurgie');
      return res.redirect('/surgeries/planning/view');
    }
    
    // Load form data
    const patients = await Patient.find().sort({ lastName: 1 });
    const surgeons = await Surgeon.find().populate('specialty').sort({ lastName: 1 });
    const prestations = await Prestation.find().populate('specialty').sort({ designation: 1 });
    const medicalStaff = await MedicalStaff.find().populate('fonctions').sort({ lastName: 1 });
    const fonctions = await Fonction.find().sort({ name: 1 });
    const materials = await Material.find().sort({ designation: 1 });
    const operatingRooms = await OperatingRoom.find({ isActive: true }).sort({ name: 1 });
    
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canEditSurgeryFinancials = userPrivileges.includes('admin') || userPrivileges.includes('direction');
    
    // Build surgery object from reservation for form prefill
    const surgery = {
      patient: reservation.patient,
      surgeon: reservation.surgeon,
      prestation: reservation.prestation,
      operatingRoom: reservation.operatingRoom,
      scheduledStartTime: reservation.scheduledStartTime,
      scheduledEndTime: reservation.scheduledEndTime,
      reservationId: reservation._id,
      reservationCode: reservation.temporaryCode
    };
    
    const localsForRender = {
      title: 'Convertir Réservation en Chirurgie',
      patients,
      surgeons,
      prestations,
      medicalStaff,
      fonctions,
      materials,
      operatingRooms,
      surgery,
      canEditSurgeryFinancials,
      fromReservation: true,
      reservation
    };
    
    res.render('surgeries/new', localsForRender);
  } catch (error) {
    console.error('Error rendering conversion form:', error);
    req.flash('error', 'Erreur lors du chargement du formulaire');
    res.redirect('/surgeries/planning/view');
  }
};

// Create surgery from reservation
module.exports.createSurgeryFromReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      req.flash('error', 'Réservation introuvable');
      return res.redirect('/surgeries/planning/view');
    }
    
    if (reservation.reservationStatus === 'converted') {
      req.flash('error', 'Cette réservation a déjà été convertie');
      return res.redirect('/surgeries/planning/view');
    }
    
    // Create surgery from form data
    const surgeryData = { ...req.body };
    
    // Create the surgery
    const surgery = new Surgery(surgeryData);
    await surgery.save();
    
    // Mark reservation as converted
    reservation.reservationStatus = 'converted';
    reservation.convertedToSurgery = surgery._id;
    reservation.convertedAt = new Date();
    reservation.updatedBy = req.user._id;
    await reservation.save();
    
    // Calculate fees if patient/surgeon/prestation are set
    if (surgery.patient && surgery.surgeon && surgery.prestation) {
      try {
        await calculateSurgeonFees(surgery._id);
      } catch (feeError) {
        console.error('Fee calculation warning:', feeError);
        // Don't block surgery creation if fee calculation fails
      }
    }
    
    req.flash('success', `Chirurgie ${surgery.code} créée avec succès depuis la réservation ${reservation.temporaryCode}`);
    res.redirect(`/surgeries/${surgery._id}`);
  } catch (error) {
    console.error('Error converting reservation:', error);
    req.flash('error', error.message || 'Erreur lors de la conversion');
    res.redirect(`/surgeries/new/from-reservation/${req.params.id}`);
  }
};

// Voir chirurgie
module.exports.viewSurgery = async (req, res) => {
  try {
    const surgery = await Surgery.findById(req.params.id)
      .populate("patient")
      .populate("surgeon")
      .populate("prestation")
      .populate("operatingRoom")
      .populate("medicalStaff.staff")
      .populate("medicalStaff.rolePlayedId")
      .populate("consumedMaterials.material");

    if (!surgery) {
      return res.status(404).render("404", { title: "Chirurgie non trouvée" });
    }

    // Fetch ASA pricing if surgery has an ASA class
    if (surgery.asaClass) {
      const asaPricing = await AsaPricing.getPricingByClass(surgery.asaClass);
      surgery.asaPricing = asaPricing;
    }

    // Check if user can view financial information
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canViewFinancialInfo = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    // Fetch all materials for the add materials modal
    const Material = require('../models/Material');
    const materials = await Material.find({}).sort({ designation: 1 });

    // Calculer automatiquement les honoraires si non calculés (only for admin/direction)
    if (canViewFinancialInfo && (!surgery.surgeonAmount || surgery.surgeonAmount === 0)) {
      try {
        await calculateSurgeonFees(surgery._id);
        // Recharger la chirurgie avec les honoraires calculés
        const updatedSurgery = await Surgery.findById(req.params.id)
          .populate("patient")
          .populate("surgeon")
          .populate("prestation")
          .populate("operatingRoom")
          .populate("medicalStaff.staff")
          .populate("medicalStaff.rolePlayedId")
          .populate("consumedMaterials.material");
        
        // Fetch ASA pricing again for updated surgery
        if (updatedSurgery.asaClass) {
          const asaPricing = await AsaPricing.getPricingByClass(updatedSurgery.asaClass);
          updatedSurgery.asaPricing = asaPricing;
        }
        
        res.render("surgeries/show", {
          title: `Chirurgie: ${updatedSurgery.code}`,
          surgery: updatedSurgery,
          materials,
          userPrivileges,
          canViewFinancialInfo,
        });
      } catch (calcError) {
        console.error("Erreur calcul automatique honoraires:", calcError);
        // Afficher la chirurgie même si le calcul échoue
        res.render("surgeries/show", {
          title: `Chirurgie: ${surgery.code}`,
          surgery,
          materials,
          userPrivileges,
          canViewFinancialInfo,
        });
      }
    } else {
      res.render("surgeries/show", {
        title: `Chirurgie: ${surgery.code}`,
        surgery,
        materials,
        userPrivileges,
        canViewFinancialInfo,
      });
    }
  } catch (error) {
    console.error("Erreur affichage chirurgie:", error);
    res.status(500).render("errorHandling/error", { title: "Erreur", statusCode: 500, err: error });
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

  // ASA Classification fees - only for location contracts
  // For location contracts: ASA fees go to clinic only, surgeon gets 0
  // For percentage contracts: no ASA fees (not applicable)
  const AsaPricing = require('../models/AsaPricing');
  // ASA Fee - flat fee paid by location surgeons to clinic
  // Percentage contracts do not pay ASA fees
  let asaFee = 0;
  
  if (surgeon.contractType === "location" && surgery.asaClass) {
    const asaConfig = await AsaPricing.getPricingByClass(surgery.asaClass);
    if (asaConfig) {
      asaFee = asaConfig.fee || 0;
    }
  }
  // For percentage contracts: ASA fee is not applicable

  // Plus de multiplicateur de statut - utilisation directe des frais urgents
  let surgeonAmount = 0;
  let clinicAmount = 0;

  if (surgeon.contractType === "location") {
    // Méthode 1: Location de salle d'opération
    // Clinic amount = (duration × location rate) + materials + hourly personal fees
    const duration = surgery.actualDuration || 0; // en minutes
    const durationInHours = duration / 60;
    const locationCost = durationInHours * (surgeon.locationRate || 0);

    // For location method we don't assign the location cost to the surgeon.
    // The clinic keeps the location cost and receives materials, personal fees (with urgent uplift) and any extra duration fees.
    surgeonAmount = 0;

    // Personal fees get an urgent uplift when surgery is urgent (user requested)
    const effectivePersonalFees = totalPersonalFees * (1 + urgentPercent);

    // Handle extra duration fees (go to clinic)
    // Handle extra duration fees (go to clinic)
    let extraFees = 0;
    if (surgery.applyExtraFees && surgery.actualDuration > prestation.maxDuration) {
      const extraduration = surgery.actualDuration - prestation.maxDuration;
      const tolerance = prestation.exceededDurationTolerance || 15;
      // Apply tolerance: subtract tolerance from exceeded duration before calculating fees
      const billableExtraDuration = Math.max(0, extraduration - tolerance);
      if (billableExtraDuration >= (prestation.exceededDurationUnit || 15)) {
        extraFees = (prestation.exceededDurationFee || 0) * billableExtraDuration / (prestation.exceededDurationUnit || 15);
      }
    }

    // Clinic receives: location cost + materials + personal fees (with urgent uplift) + extra duration fees + ASA fee
    clinicAmount = locationCost + totalMaterialCost + effectivePersonalFees + extraFees + asaFee;
    
    // Note: surgeonAmount remains 0 for location contracts; ASA fee goes entirely to clinic
  } else if (surgeon.contractType === "percentage") {
    // Méthode 2: Pourcentage

    // 1. Calculate Extra Duration
    let extraDuration = surgery.actualDuration - prestation.maxDuration;
    let extraUnits = 0;
    let extraFee = 0;

    if (surgery.applyExtraFees && extraDuration > 0) {
      const durationUnit = prestation.exceededDurationUnit || 15;
      const exceededFeePerUnit = prestation.exceededDurationFee || 0;
      const tolerance = prestation.exceededDurationTolerance || 15;
      // Apply tolerance: subtract tolerance from exceeded duration before calculating fees
      const billableExtraDuration = Math.max(0, extraDuration - tolerance);
      extraUnits = Math.ceil(billableExtraDuration / durationUnit);
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
    
    // Note: ASA fees are not applicable for percentage contracts
  }

  // S'assurer que le montant n'est pas négatif
  surgeonAmount = Math.max(0, surgeonAmount);
  clinicAmount = Math.max(0, clinicAmount);

  // Mettre à jour la chirurgie
  await Surgery.findByIdAndUpdate(surgeryId, {
    surgeonAmount: Math.round(surgeonAmount * 100) / 100, // Arrondir à 2 décimales
    clinicAmount: Math.round(clinicAmount * 100) / 100,
  });

  // Create or update payment tracking record
  const paymentController = require('./payment.controller');
  await paymentController.createOrUpdatePaymentRecord(surgeryId);

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

    // Check if user can edit financial fields
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canEditSurgeryFinancials = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    res.render("surgeries/edit", {
      title: "Modifier Chirurgie",
      surgery,
      patients,
      surgeons,
      prestations,
      medicalStaff,
      fonctions,
      materials,
      canEditSurgeryFinancials,
    });
  } catch (error) {
    console.error("Erreur formulaire édition chirurgie:", error);
    res.status(500).render("errorHandling/error", { title: "Erreur", statusCode: 500, err: error });
  }
};

// Mettre à jour chirurgie
module.exports.updateSurgery = async (req, res) => {
  try {
    // Authorization: only admin or chefBloc can update any surgery; medecin only their own
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    
    // Check if surgery is closed - only admin can edit closed surgeries
    const existingSurgery = await Surgery.findById(req.params.id);
    if (existingSurgery && existingSurgery.statusLifecycle === 'closed' && !userPriv.includes('admin')) {
      req.flash('error', 'Cette chirurgie est clôturée et ne peut plus être modifiée');
      return res.redirect(`/surgeries/${req.params.id}`);
    }
    
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

    // Validate and trim surgery code if provided
    const surgeryCode = req.body.code ? String(req.body.code).trim() : currentSurgery.code;
    if (!surgeryCode) {
      req.flash('error', 'Le code de chirurgie est obligatoire');
      return res.redirect(`/surgeries/${req.params.id}/edit`);
    }
    
    // Check if new code already exists (different from current code)
    if (surgeryCode !== currentSurgery.code) {
      const existingCode = await Surgery.findOne({ code: surgeryCode });
      if (existingCode) {
        req.flash('error', `Le code "${surgeryCode}" est déjà utilisé. Veuillez choisir un code unique.`);
        return res.redirect(`/surgeries/${req.params.id}/edit`);
      }
    }

    // Get the prestation document to know the default price
    const prestationDoc = await Prestation.findById(req.body.prestation);

    const surgeryData = {
      code: surgeryCode,
      patient: req.body.patient,
      surgeon: req.body.surgeon,
      prestation: req.body.prestation,
      entreeBloc: req.body.entreeBloc || null,
      entreeSalle: req.body.entreeSalle || null,
      sortieSalle: req.body.sortieSalle || null,
      incisionTime: req.body.incisionTime,
      closingIncisionTime: req.body.closingIncisionTime || null,
      status: req.body.status,
      notes: req.body.notes,
      applyExtraFees: req.body.applyExtraFees === "on",
      // Always save the effective price used for this surgery in adjustedPrice
      // This ensures surgeries are not affected by future prestation price changes
      adjustedPrice: req.body.adjustedPrice ? parseFloat(req.body.adjustedPrice) : (prestationDoc ? prestationDoc.priceHT : currentSurgery.adjustedPrice),
      // ASA classification fields
      asaClass: req.body.asaClass || null,
      asaUrgent: req.body.asaUrgent === 'on',
    };

    // Validation des dates: incisionTime doit être avant closingIncisionTime
    if (req.body.incisionTime && req.body.closingIncisionTime) {
      const incisionDate = new Date(req.body.incisionTime);
      const closingDate = new Date(req.body.closingIncisionTime);
      if (incisionDate >= closingDate) {
        return res.redirect(`/surgeries/${req.params.id}/edit?error=L\'heure d\'incision doit être antérieure à l\'heure de fermeture`);
      }
    }
    // Validate chronological order of all dates
    if (req.body.entreeBloc && req.body.entreeSalle) {
      if (new Date(req.body.entreeBloc) >= new Date(req.body.entreeSalle)) {
        return res.redirect(`/surgeries/${req.params.id}/edit?error=L\'entrée au bloc doit être antérieure à l\'entrée en salle`);
      }
    }
    if (req.body.entreeSalle && req.body.incisionTime) {
      if (new Date(req.body.entreeSalle) >= new Date(req.body.incisionTime)) {
        return res.redirect(`/surgeries/${req.params.id}/edit?error=L\'entrée en salle doit être antérieure à l\'incision`);
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

    // Personnel médical - only add if both staff and role are selected
    if (req.body.medicalStaff && req.body.rolePlayedId) {
      const staffArray = Array.isArray(req.body.medicalStaff)
        ? req.body.medicalStaff
        : [req.body.medicalStaff];
      const roleArray = Array.isArray(req.body.rolePlayedId)
        ? req.body.rolePlayedId
        : [req.body.rolePlayedId];

      // Filter out empty entries
      const medicalStaffEntries = [];
      for (let i = 0; i < staffArray.length; i++) {
        const staff = staffArray[i];
        const role = roleArray[i];
        if (staff && staff.trim() && role && role.trim()) {
          medicalStaffEntries.push({
            staff: staff,
            rolePlayedId: role,
          });
        }
      }
      if (medicalStaffEntries.length > 0) {
        surgeryData.medicalStaff = medicalStaffEntries;
      }
    }

    // Matériaux consommés - informational only, no stock reduction
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
        const materialId = consumableArray[index] ? String(consumableArray[index]).trim() : '';
        const quantity = consumableQuantityArray[index] ? String(consumableQuantityArray[index]).trim() : '';
        if (materialId && quantity) {
          // Get current material price (use purchase price for consumables)
          const materialDoc = await Material.findById(materialId);
          if (materialDoc) {
            consumedMaterials.push({
              material: materialId,
              quantity: parseFloat(quantity),
              priceUsed: materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
            });
          }
        }
      }
    }

    // Traiter les matériaux patient - use selling price for patient billing
    if (req.body.patientMaterialId && req.body.patientMaterialQuantity) {
      const patientArray = Array.isArray(req.body.patientMaterialId)
        ? req.body.patientMaterialId
        : [req.body.patientMaterialId];
      const patientQuantityArray = Array.isArray(req.body.patientMaterialQuantity)
        ? req.body.patientMaterialQuantity
        : [req.body.patientMaterialQuantity];
      // Get patient references array (optional field for tracking material reference/serial/lot numbers)
      const patientReferenceArray = req.body.patientMaterialReference 
        ? (Array.isArray(req.body.patientMaterialReference) ? req.body.patientMaterialReference : [req.body.patientMaterialReference])
        : [];

      for (let index = 0; index < patientArray.length; index++) {
        const materialId = patientArray[index] ? String(patientArray[index]).trim() : '';
        const quantity = patientQuantityArray[index] ? String(patientQuantityArray[index]).trim() : '';
        const reference = patientReferenceArray[index] ? String(patientReferenceArray[index]).trim() : '';
        if (materialId && quantity) {
          // Use selling price for patient materials (includes markup)
          const materialDoc = await Material.findById(materialId);
          if (materialDoc) {
            const entry = {
              material: materialId,
              quantity: parseFloat(quantity),
              priceUsed: materialDoc.sellingPriceHT || materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
            };
            // Add patientReference if provided
            if (reference) {
              entry.patientReference = reference;
            }
            consumedMaterials.push(entry);
          }
        }
      }
    }

    if (consumedMaterials.length > 0) {
      surgeryData.consumedMaterials = consumedMaterials;
    }

    surgeryData.updatedBy = req.user ? req.user._id : undefined;
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
    
    // Check if surgery is closed - only admin can change status of closed surgeries
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    if (currentSurgery.statusLifecycle === 'closed' && !userPriv.includes('admin')) {
      req.flash('error', 'Cette chirurgie est clôturée et ne peut plus être modifiée');
      return res.redirect(`/surgeries/${surgeryId}`);
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
    
    // Check if surgery is closed - only admin can delete closed surgeries
    const existingSurgery = await Surgery.findById(req.params.id);
    if (existingSurgery && existingSurgery.statusLifecycle === 'closed' && !userPriv.includes('admin')) {
      req.flash('error', 'Cette chirurgie est clôturée et ne peut pas être supprimée');
      return res.redirect('/surgeries');
    }
    
    await Surgery.findByIdAndDelete(req.params.id);
    res.redirect("/surgeries?success=Chirurgie supprimée avec succès");
  } catch (error) {
    console.error("Erreur suppression chirurgie:", error);
    res.redirect("/surgeries?error=Erreur lors de la suppression");
  }
};

// Clôturer une chirurgie (admin only)
module.exports.closeSurgery = async (req, res) => {
  try {
    // Only admin can close surgeries
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    if (!userPriv.includes('admin')) {
      req.flash('error', 'Seul un administrateur peut clôturer une chirurgie');
      return res.redirect(`/surgeries/${req.params.id}`);
    }

    const surgery = await Surgery.findById(req.params.id);
    if (!surgery) {
      return res.status(404).render("404", { title: "Chirurgie non trouvée" });
    }

    if (surgery.statusLifecycle === 'closed') {
      req.flash('error', 'Cette chirurgie est déjà clôturée');
      return res.redirect(`/surgeries/${req.params.id}`);
    }

    // Close the surgery
    surgery.statusLifecycle = 'closed';
    surgery.closedAt = new Date();
    surgery.closedBy = req.user._id;
    await surgery.save();

    req.flash('success', 'Chirurgie clôturée avec succès - elle ne peut plus être modifiée');
    res.redirect(`/surgeries/${req.params.id}`);
  } catch (error) {
    console.error("Erreur clôture chirurgie:", error);
    req.flash('error', 'Erreur lors de la clôture de la chirurgie');
    res.redirect(`/surgeries/${req.params.id}`);
  }
};

// Réouvrir une chirurgie clôturée (admin only)
module.exports.reopenSurgery = async (req, res) => {
  try {
    // Only admin can reopen surgeries
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    if (!userPriv.includes('admin')) {
      req.flash('error', 'Seul un administrateur peut réouvrir une chirurgie');
      return res.redirect(`/surgeries/${req.params.id}`);
    }

    const surgery = await Surgery.findById(req.params.id);
    if (!surgery) {
      return res.status(404).render("404", { title: "Chirurgie non trouvée" });
    }

    if (surgery.statusLifecycle === 'editable') {
      req.flash('error', 'Cette chirurgie n\'est pas clôturée');
      return res.redirect(`/surgeries/${req.params.id}`);
    }

    // Reopen the surgery
    surgery.statusLifecycle = 'editable';
    surgery.closedAt = null;
    surgery.closedBy = null;
    await surgery.save();

    req.flash('success', 'Chirurgie rÃ©ouverte avec succÃ¨s - elle peut Ãªtre modifiÃ©e Ã  nouveau');
    res.redirect(`/surgeries/${req.params.id}`);
  } catch (error) {
    console.error("Erreur rÃ©ouverture chirurgie:", error);
    req.flash('error', 'Erreur lors de la rÃ©ouverture de la chirurgie');
    res.redirect(`/surgeries/${req.params.id}`);
  }
};

// Add materials to an existing surgery
module.exports.addMaterialsToSurgery = async (req, res) => {
  try {
    console.log('DEBUG addMaterialsToSurgery - req.body:', JSON.stringify(req.body, null, 2));
    
    const surgery = await Surgery.findById(req.params.id);
    if (!surgery) {
      req.flash('error', 'Chirurgie non trouvée');
      return res.redirect('/surgeries');
    }

    // Check if surgery is still editable
    if (surgery.statusLifecycle !== 'editable') {
      req.flash('error', 'Impossible d\'ajouter des matériaux à une chirurgie clôturée');
      return res.redirect(`/surgeries/${req.params.id}`);
    }

    const Material = require("../models/Material");
    const consumedMaterials = [];

    // Process materials from the new form format
    if (req.body.materials && Array.isArray(req.body.materials)) {
      console.log(`DEBUG: Processing ${req.body.materials.length} materials`);
      
      for (const materialData of req.body.materials) {
        console.log('DEBUG: Processing material:', materialData);
        const materialId = materialData.materialId;
        const quantity = parseFloat(materialData.quantity);
        
        if (materialId && quantity > 0) {
          const materialDoc = await Material.findById(materialId);
          if (materialDoc) {
            console.log(`DEBUG: Adding material ${materialDoc.designation}, qty: ${quantity}`);
            consumedMaterials.push({
              material: materialId,
              quantity: quantity,
              priceUsed: materialDoc.weightedPrice || materialDoc.priceHT || 0,
            });
          } else {
            console.log(`DEBUG: Material ${materialId} not found`);
          }
        } else {
          console.log(`DEBUG: Skipping material - materialId: ${materialId}, quantity: ${quantity}`);
        }
      }
    } else {
      console.log('DEBUG: No materials array in request body');
    }

    // Add new materials to existing ones
    if (consumedMaterials.length > 0) {
      console.log(`DEBUG: Adding ${consumedMaterials.length} materials to surgery`);
      if (!surgery.consumedMaterials) {
        surgery.consumedMaterials = [];
      }
      surgery.consumedMaterials.push(...consumedMaterials);
      await surgery.save();

      // Recalculate fees after adding materials
      try {
        await calculateSurgeonFees(surgery._id);
      } catch (feeErr) {
        console.error('Erreur calcul honoraires (ajout matériaux):', feeErr);
      }
    } else {
      console.log('DEBUG: No materials to add');
    }

    req.flash('success', `${consumedMaterials.length} matériau${consumedMaterials.length > 1 ? 'x' : ''} ajouté${consumedMaterials.length > 1 ? 's' : ''} à la chirurgie`);
    res.redirect(`/surgeries/${req.params.id}`);
  } catch (error) {
    console.error("Erreur ajout matériaux à chirurgie:", error);
    req.flash('error', 'Erreur lors de l\'ajout des matériaux');
    res.redirect(`/surgeries/${req.params.id}`);
  }
};

// ==================== OPERATING ROOM RESERVATION METHODS ====================

const reservationService = require('../services/reservationService');
const OperatingRoom = require('../models/OperatingRoom');

// Show planning timeline view
module.exports.showPlanning = async (req, res) => {
  try {
    // Get filter params
    const roomFilter = req.query.room || '';
    const surgeonFilter = req.query.surgeon || '';
    const dateFilter = req.query.date || new Date().toISOString().split('T')[0];
    const typeFilter = req.query.type || 'all'; // 'all', 'surgery', 'reservation'
    
    // Calculate date range (show 7 days from selected date)
    const startDate = new Date(dateFilter);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    // Get all active operating rooms
    const rooms = await OperatingRoom.find({ isActive: true }).sort({ code: 1 });
    
    // Get all surgeons for filter dropdown
    const Surgeon = require('../models/Surgeon');
    const surgeons = await Surgeon.find().sort({ lastName: 1, firstName: 1 });
    
    // Build query for surgeries
    const surgeryQuery = {
      $or: [
        { scheduledStartTime: { $gte: startDate, $lte: endDate } },
        { entreeSalle: { $gte: startDate, $lte: endDate } }
      ]
    };
    if (roomFilter) surgeryQuery.operatingRoom = roomFilter;
    if (surgeonFilter) surgeryQuery.surgeon = surgeonFilter;
    
    // Build query for reservations
    const reservationQuery = {
      scheduledStartTime: { $gte: startDate, $lte: endDate },
      reservationStatus: { $in: ['pending', 'confirmed'] } // Only show active reservations
    };
    if (roomFilter) reservationQuery.operatingRoom = roomFilter;
    if (surgeonFilter) reservationQuery.surgeon = surgeonFilter;
    
    // Fetch both surgeries and reservations
    let surgeries = [];
    let reservations = [];
    
    if (typeFilter === 'all' || typeFilter === 'surgery') {
      surgeries = await Surgery.find(surgeryQuery)
        .populate('surgeon', 'firstName lastName')
        .populate('patient', 'firstName lastName')
        .populate('prestation', 'designation')
        .populate('operatingRoom', 'code name')
        .sort({ scheduledStartTime: 1, entreeSalle: 1 })
        .lean();
      
      // Filter out surgeries without required fields
      surgeries = surgeries.filter(s => s.surgeon && s.patient && s.prestation);
    }
    
    if (typeFilter === 'all' || typeFilter === 'reservation') {
      reservations = await Reservation.find(reservationQuery)
        .populate('surgeon', 'firstName lastName')
        .populate('patient', 'firstName lastName code')
        .populate('prestation', 'designation')
        .populate('operatingRoom', 'code name')
        .sort({ scheduledStartTime: 1 })
        .lean();
      
      // Filter out reservations without required fields
      reservations = reservations.filter(r => r.surgeon && r.patient && r.prestation);
    }
    
    // Merge and tag with type
    const allEvents = [
      ...surgeries.map(s => ({ ...s, type: 'surgery', code: s.code || 'N/A' })),
      ...reservations.map(r => ({ ...r, type: 'reservation', code: r.temporaryCode || r.code || 'N/A' }))
    ].sort((a, b) => {
      const aTime = new Date(a.scheduledStartTime || a.entreeSalle);
      const bTime = new Date(b.scheduledStartTime || b.entreeSalle);
      return aTime - bTime;
    });
    
    res.render('surgeries/planning', {
      title: 'Planification des Salles',
      rooms,
      surgeons,
      events: allEvents,
      startDate,
      endDate,
      filters: {
        room: roomFilter,
        surgeon: surgeonFilter,
        date: dateFilter,
        type: typeFilter
      }
    });
  } catch (error) {
    console.error('Error showing planning:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    req.flash('error', 'Erreur lors de l\'affichage de la planification: ' + error.message);
    res.redirect('/surgeries');
  }
};

// Create or update reservation for a surgery
module.exports.createOrUpdateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { operatingRoom, scheduledStartTime, scheduledEndTime, reservationStatus, reservationNotes } = req.body;
    
    // Find surgery
    const surgery = await Surgery.findById(id);
    if (!surgery) {
      return res.status(404).json({ error: 'Chirurgie non trouvée' });
    }
    
    // Check if user can modify this reservation
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    const isManagement = userPriv.includes('admin') || userPriv.includes('direction') || userPriv.includes('headDepart');
    const isSurgeonOwner = String(surgery.surgeon) === String(req.user.surgeon || req.user.surgeonId);
    
    if (!isManagement && !isSurgeonOwner) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    // Validate times
    const timeValidation = reservationService.validateReservationTimes(scheduledStartTime, scheduledEndTime);
    if (!timeValidation.valid) {
      return res.status(400).json({ error: timeValidation.error });
    }
    
    // Check room availability
    const availability = await reservationService.checkRoomAvailability(
      operatingRoom,
      scheduledStartTime,
      scheduledEndTime,
      id // Exclude current surgery
    );
    
    if (!availability.available) {
      return res.status(409).json({
        error: 'Salle non disponible',
        conflicts: availability.conflicts
      });
    }
    
    // Update surgery with reservation
    surgery.operatingRoom = operatingRoom;
    surgery.scheduledStartTime = scheduledStartTime;
    surgery.scheduledEndTime = scheduledEndTime;
    surgery.reservationStatus = reservationStatus || 'reserved';
    surgery.reservationNotes = reservationNotes || '';
    surgery.updatedBy = req.user._id;
    
    await surgery.save();
    
    res.json({
      success: true,
      message: 'Réservation enregistrée avec succès',
      surgery: {
        id: surgery._id,
        code: surgery.code,
        operatingRoom: surgery.operatingRoom,
        scheduledStartTime: surgery.scheduledStartTime,
        scheduledEndTime: surgery.scheduledEndTime,
        reservationStatus: surgery.reservationStatus
      }
    });
    
  } catch (error) {
    console.error('Error creating/updating reservation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la réservation' });
  }
};

// Cancel reservation
module.exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const surgery = await Surgery.findById(id);
    if (!surgery) {
      return res.status(404).json({ error: 'Chirurgie non trouvée' });
    }
    
    // Check permissions
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    const isManagement = userPriv.includes('admin') || userPriv.includes('direction') || userPriv.includes('headDepart');
    const isSurgeonOwner = String(surgery.surgeon) === String(req.user.surgeon || req.user.surgeonId);
    
    if (!isManagement && !isSurgeonOwner) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    // Update reservation status
    surgery.reservationStatus = 'cancelled';
    surgery.updatedBy = req.user._id;
    
    await surgery.save();
    
    res.json({
      success: true,
      message: 'Réservation annulée avec succès'
    });
    
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la réservation' });
  }
};

// Check room availability (AJAX endpoint)
module.exports.checkAvailability = async (req, res) => {
  try {
    const { roomId, startTime, endTime, surgeryId } = req.query;
    
    if (!roomId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    
    const availability = await reservationService.checkRoomAvailability(
      roomId,
      startTime,
      endTime,
      surgeryId
    );
    
    res.json(availability);
    
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification de disponibilité' });
  }
};

// Get available slots for a room on a specific date (AJAX endpoint)
module.exports.getSlots = async (req, res) => {
  try {
    const { roomId, date, slotDuration } = req.query;
    
    if (!roomId || !date) {
      return res.status(400).json({ error: 'Room ID and date are required' });
    }
    
    const duration = slotDuration ? parseInt(slotDuration) : 60;
    const slots = await reservationService.generateSlotsForDay(roomId, date, duration);
    
    res.json({ 
      success: true,
      slots,
      roomId,
      date
    });
    
  } catch (error) {
    console.error('Error getting slots:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des créneaux' });
  }
};

// Show slot booking interface
module.exports.showSlotBooking = async (req, res) => {
  try {
    const OperatingRoom = require('../models/OperatingRoom');
    const Surgeon = require('../models/Surgeon');
    const Patient = require('../models/Patient');
    const Prestation = require('../models/Prestation');
    const Specialty = require('../models/Specialty');
    
    console.log('Loading slot booking page...');
    
    // Get all active operating rooms
    const rooms = await OperatingRoom.find({ isActive: true }).sort({ code: 1 });
    console.log('Rooms loaded:', rooms.length);
    
    // Get all surgeons with specialty populated
    const surgeons = await Surgeon.find().populate('specialty', 'name').sort({ lastName: 1, firstName: 1 });
    console.log('Surgeons loaded:', surgeons.length);
    
    // Get all patients
    const patients = await Patient.find().sort({ lastName: 1, firstName: 1 });
    console.log('Patients loaded:', patients.length);
    
    // Get all prestations with specialty populated
    const prestations = await Prestation.find().populate('specialty', 'name').sort({ designation: 1 });
    console.log('Prestations loaded:', prestations.length);
    
    // Get all specialties
    const specialties = await Specialty.find().sort({ name: 1 });
    console.log('Specialties loaded:', specialties.length);
    
    // Default to today
    const defaultDate = new Date().toISOString().split('T')[0];
    
    res.render('surgeries/slotBooking', {
      title: 'Réservation par créneaux',
      rooms,
      surgeons,
      patients,
      prestations,
      specialties,
      defaultDate
    });
  } catch (error) {
    console.error('Error showing slot booking:', error);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    req.flash('error', 'Erreur lors de l\'affichage de la réservation: ' + error.message);
    res.redirect('/surgeries/planning/view');
  }
};

// Create surgery reservation from slot selection
module.exports.createReservationFromSlots = async (req, res) => {
  try {
    const Reservation = require('../models/Reservation');
    const { patient, surgeon, prestation, operatingRoom, scheduledStartTime, scheduledEndTime, reservationNotes } = req.body;
    
    // Validate required fields
    if (!patient || !surgeon || !prestation || !operatingRoom || !scheduledStartTime || !scheduledEndTime) {
      return res.status(400).json({ 
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis' 
      });
    }
    
    // Validate times
    const timeValidation = reservationService.validateReservationTimes(scheduledStartTime, scheduledEndTime);
    if (!timeValidation.valid) {
      return res.status(400).json({ 
        success: false,
        message: timeValidation.error 
      });
    }
    
    // Check room availability (no excludeId since this is a new reservation)
    const availability = await reservationService.checkRoomAvailability(
      operatingRoom,
      scheduledStartTime,
      scheduledEndTime
    );
    
    if (!availability.available) {
      return res.status(409).json({
        success: false,
        message: 'Un ou plusieurs créneaux sont déjà réservés',
        conflicts: availability.conflicts
      });
    }
    
    // Generate unique temporary code for reservation
    const lastReservation = await Reservation.findOne().sort({ createdAt: -1 });
    let tempCode = 'RES-001';
    if (lastReservation && lastReservation.temporaryCode) {
      const lastNumber = parseInt(lastReservation.temporaryCode.split('-')[1]) || 0;
      tempCode = `RES-${String(lastNumber + 1).padStart(3, '0')}`;
    }
    
    // Create new reservation (not a surgery yet)
    const newReservation = new Reservation({
      temporaryCode: tempCode,
      patient,
      surgeon,
      prestation,
      operatingRoom,
      scheduledStartTime,
      scheduledEndTime,
      reservationStatus: 'confirmed',
      reservationNotes: reservationNotes || '',
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    
    await newReservation.save();
    
    res.json({
      success: true,
      message: 'Réservation créée avec succès',
      reservationId: newReservation._id,
      reservation: {
        id: newReservation._id,
        code: newReservation.temporaryCode,
        scheduledStartTime: newReservation.scheduledStartTime,
        scheduledEndTime: newReservation.scheduledEndTime
      }
    });
    
  } catch (error) {
    console.error('Error creating reservation from slots:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la création de la réservation: ' + error.message 
    });
  }
};
