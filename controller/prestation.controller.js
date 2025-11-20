// prestation.controller.js
const Prestation = require("../models/Prestation");
const Specialty = require("../models/Specialty");
const Surgery = require("../models/Surgery"); // FIX: Added missing import
const moment = require("moment");

// Liste des prestations
module.exports.prestationList = async (req, res) => {
  try {
    const prestations = await Prestation.find()
      .populate("specialty")
      .sort({ designation: 1 });

    // Check if user is headDepart or assistante (without pricing permissions)
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canViewPricing = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    // Filter out pricing data for headDepart and assistante users
    const filteredPrestations = canViewPricing ? prestations : prestations.map(p => ({
      ...p.toObject(),
      priceHT: undefined,
      tva: undefined,
      exceededDurationFee: undefined,
      urgentFeePercentage: undefined
    }));

    res.render("prestations/index", {
      title: "Gestion des Prestations",
      prestations: filteredPrestations,
      canViewPricing,
    });
  } catch (error) {
    console.error("Error in prestationList:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement des prestations",
    });
  }
};

// Nouvelle prestation
module.exports.renderPrestationForm = async (req, res) => {
  try {
    const specialties = await Specialty.find().sort({ name: 1 });

    res.render("prestations/new", {
      title: "Nouvelle Prestation",
      prestation: {},
      specialties,
      error: null,
    });
  } catch (error) {
    console.error("Error in renderPrestationForm:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement du formulaire",
    });
  }
};

// Ajouter prestation
module.exports.createPrestation = async (req, res) => {
  try {
    // Validate required fields
    const { designation, specialty, priceHT, duration } = req.body;

    if (!designation || !specialty || !priceHT || !duration) {
      throw new Error("Tous les champs obligatoires doivent être remplis");
    }

    // Create new prestation with proper data types (code will be auto-generated)
    const prestationData = {
      designation: designation.trim(),
      specialty,
      priceHT: parseFloat(priceHT),
      tva: req.body.tva ? parseFloat(req.body.tva) : 0.09,
      duration: parseInt(duration),
      exceededDurationUnit: req.body.exceededDurationUnit
        ? parseInt(req.body.exceededDurationUnit)
        : 15,
      exceededDurationFee: req.body.exceededDurationFee
        ? parseFloat(req.body.exceededDurationFee)
        : 0,
      urgentFeePercentage: req.body.urgentFeePercentage
        ? parseFloat(req.body.urgentFeePercentage) / 100 // Convert percentage to decimal
        : 0,
    };

    const prestation = new Prestation(prestationData);
    await prestation.save();

    res.redirect("/prestations?success=Prestation créée avec succès");
  } catch (error) {
    console.error("Error in createPrestation:", error);

    try {
      const specialties = await Specialty.find().sort({ name: 1 });
      res.status(400).render("prestations/new", {
        title: "Nouvelle Prestation",
        prestation: req.body,
        specialties,
        error: error.message || "Erreur lors de la création",
      });
    } catch (renderError) {
      res.status(500).render("error", {
        title: "Erreur",
        error: "Erreur lors de la création de la prestation",
      });
    }
  }
};

// Edit prestation form
module.exports.renderEditPrestationForm = async (req, res) => {
  try {
    const prestation = await Prestation.findById(req.params.id).populate(
      "specialty"
    );

    if (!prestation) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Prestation non trouvée",
      });
    }

    const specialties = await Specialty.find().sort({ name: 1 });

    res.render("prestations/edit", {
      title: "Modifier Prestation",
      prestation,
      specialties,
      error: null,
    });
  } catch (error) {
    console.error("Error in renderEditPrestationForm:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement de la prestation",
    });
  }
};

// Update prestation
module.exports.updatePrestation = async (req, res) => {
  try {
    const prestationId = req.params.id;

    // Check if prestation exists
    const existingPrestation = await Prestation.findById(prestationId);
    if (!existingPrestation) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Prestation non trouvée",
      });
    }

    // Prepare update data with proper data types (exclude code as it's auto-generated)
    const updateData = {
      designation: req.body.designation
        ? req.body.designation.trim()
        : existingPrestation.designation,
      specialty: req.body.specialty || existingPrestation.specialty,
      priceHT: req.body.priceHT
        ? parseFloat(req.body.priceHT)
        : existingPrestation.priceHT,
      tva: req.body.tva !== undefined && req.body.tva !== ''
        ? parseFloat(req.body.tva)
        : existingPrestation.tva,
      duration: req.body.duration
        ? parseInt(req.body.duration)
        : existingPrestation.duration,
      exceededDurationUnit: req.body.exceededDurationUnit
        ? parseInt(req.body.exceededDurationUnit)
        : existingPrestation.exceededDurationUnit,
      exceededDurationFee:
        req.body.exceededDurationFee !== undefined
          ? parseFloat(req.body.exceededDurationFee)
          : existingPrestation.exceededDurationFee,
      urgentFeePercentage:
        req.body.urgentFeePercentage !== undefined
          ? parseFloat(req.body.urgentFeePercentage) / 100 // Convert percentage to decimal
          : existingPrestation.urgentFeePercentage,
    };

    await Prestation.findByIdAndUpdate(prestationId, updateData, {
      runValidators: true,
      new: true,
    });

    res.redirect("/prestations?success=Prestation modifiée avec succès");
  } catch (error) {
    console.error("Error in updatePrestation:", error);

    try {
      const prestation = await Prestation.findById(req.params.id);
      const specialties = await Specialty.find().sort({ name: 1 });

      res.status(400).render("prestations/edit", {
        title: "Modifier Prestation",
        prestation: { ...prestation.toObject(), ...req.body },
        specialties,
        error: error.message || "Erreur lors de la modification",
      });
    } catch (renderError) {
      res.status(500).render("error", {
        title: "Erreur",
        error: "Erreur lors de la modification de la prestation",
      });
    }
  }
};

// Delete prestation
module.exports.deletePrestation = async (req, res) => {
  try {
    const prestationId = req.params.id;

    // Check if prestation is used in any surgery
    const surgeriesCount = await Surgery.countDocuments({
      prestation: prestationId,
    });

    if (surgeriesCount > 0) {
      return res.redirect(
        `/prestations?error=Cette prestation ne peut pas être supprimée car elle est utilisée dans ${surgeriesCount} chirurgie(s)`
      );
    }

    const prestation = await Prestation.findByIdAndDelete(prestationId);

    if (!prestation) {
      return res.redirect("/prestations?error=Prestation non trouvée");
    }

    res.redirect("/prestations?success=Prestation supprimée avec succès");
  } catch (error) {
    console.error("Error in deletePrestation:", error);
    res.redirect(
      "/prestations?error=Erreur lors de la suppression de la prestation"
    );
  }
};

// Show prestation details
module.exports.showPrestation = async (req, res) => {
  try {
    const prestationId = req.params.id;

    // Validate ObjectId format
    if (!prestationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render("error", {
        title: "Erreur",
        error: "ID de prestation invalide",
      });
    }

    // Fetch prestation with specialty populated
    const prestation =
      await Prestation.findById(prestationId).populate("specialty");

    if (!prestation) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Prestation non trouvée",
      });
    }

    // Check if user can view pricing
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canViewPricing = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    // Fetch related surgeries with populated references
    const surgeries = await Surgery.find({ prestation: prestationId })
      .populate("patient", "firstName lastName")
      .populate("surgeon", "firstName lastName")
      .sort({ beginDateTime: -1 })
      .limit(100); // Limit to prevent performance issues

    // Calculate additional statistics
    const stats = {
      totalSurgeries: surgeries.length,
      completedSurgeries: surgeries.filter((s) => s.actualDuration).length,
      averageDuration: 0,
      exceededCount: 0,
      thisMonthCount: 0,
      totalRevenue: 0,
    };

    if (stats.completedSurgeries > 0) {
      const completedSurgeries = surgeries.filter((s) => s.actualDuration);
      stats.averageDuration = Math.round(
        completedSurgeries.reduce((sum, s) => sum + s.actualDuration, 0) /
          stats.completedSurgeries
      );
      stats.exceededCount = completedSurgeries.filter(
        (s) => s.actualDuration > prestation.duration
      ).length;
    }

    // Count surgeries this month
    const startOfMonth = moment().startOf("month");
    stats.thisMonthCount = surgeries.filter((s) =>
      moment(s.beginDateTime).isSameOrAfter(startOfMonth)
    ).length;

    // Calculate total revenue (basic calculation)
    stats.totalRevenue =
      surgeries.length * prestation.priceHT * (1 + prestation.tva);

    res.render("prestations/show", {
      title: `Prestation: ${prestation.designation}`,
      prestation,
      surgeries,
      stats,
      moment,
      canViewPricing,
    });
  } catch (error) {
    console.error("Error in showPrestation:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error:
        error.message ||
        "Erreur lors du chargement des détails de la prestation",
    });
  }
};

// Import prestations from Excel
module.exports.importPrestations = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/prestations?error=Aucun fichier uploadé");
    }

    const XLSX = require('xlsx');

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!data || data.length === 0) {
      return res.redirect("/prestations?error=Le fichier Excel est vide");
    }

    // Get all specialties for lookup
    const specialties = await Specialty.find();
    const specialtyMap = {};
    specialties.forEach(s => {
      specialtyMap[s.name.toLowerCase().trim()] = s._id;
    });

    const results = {
      imported: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because Excel is 1-indexed and first row is header

      try {
        // Normalize column names (case-insensitive)
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        // Extract fields with flexible column names
        const designation = normalizedRow['désignation'] || normalizedRow['designation'] || '';
        const specialtyName = normalizedRow['spécialité'] || normalizedRow['specialite'] || '';
        const priceHT = normalizedRow['prix ht (da)'] || normalizedRow['prix ht'] || normalizedRow['prixht'] || '';
        const tvaInput = normalizedRow['tva (%)'] || normalizedRow['tva'] || '9';
        const duration = normalizedRow['durée (minutes)'] || normalizedRow['duree'] || normalizedRow['durée'] || '';
        const exceededDurationUnit = normalizedRow['unité dépassement (min)'] || normalizedRow['unite depassement'] || '15';
        const exceededDurationFee = normalizedRow['frais dépassement (da)'] || normalizedRow['frais depassement'] || '0';
        const urgentFeeInput = normalizedRow['frais urgents (%)'] || normalizedRow['frais urgents'] || '0';
        const code = normalizedRow['code'] || '';

        // Validation
        const errors = [];

        if (!designation || designation.trim() === '') {
          errors.push('Désignation manquante');
        }

        if (!specialtyName || specialtyName.trim() === '') {
          errors.push('Spécialité manquante');
        } else if (!specialtyMap[specialtyName.toLowerCase().trim()]) {
          errors.push(`Spécialité "${specialtyName}" non trouvée`);
        }

        if (!priceHT || isNaN(parseFloat(priceHT))) {
          errors.push('Prix HT invalide ou manquant');
        } else if (parseFloat(priceHT) < 0) {
          errors.push('Prix HT doit être positif');
        }

        if (!duration || isNaN(parseInt(duration))) {
          errors.push('Durée invalide ou manquante');
        } else if (parseInt(duration) <= 0) {
          errors.push('Durée doit être positive');
        }

        if (isNaN(parseFloat(tvaInput))) {
          errors.push('TVA invalide');
        }

        if (errors.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            designation: designation || 'N/A',
            messages: errors
          });
          continue;
        }

        // Check for duplicate code (if provided)
        if (code && code.trim() !== '') {
          const existingCode = await Prestation.findOne({ code: code.trim() });
          if (existingCode) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              designation: designation,
              messages: [`Code "${code}" existe déjà`]
            });
            continue;
          }
        }

        // Prepare prestation data
        const prestationData = {
          code: code && code.trim() !== '' ? code.trim() : undefined, // Let schema auto-generate if empty
          designation: designation.trim(),
          specialty: specialtyMap[specialtyName.toLowerCase().trim()],
          priceHT: parseFloat(priceHT),
          tva: parseFloat(tvaInput) / 100, // Convert percentage to decimal
          duration: parseInt(duration),
          exceededDurationUnit: parseInt(exceededDurationUnit) || 15,
          exceededDurationFee: parseFloat(exceededDurationFee) || 0,
          urgentFeePercentage: Math.min(1, Math.max(0, parseFloat(urgentFeeInput) / 100)) // Convert percentage to decimal, clamp 0-1
        };

        // Create and save prestation
        const prestation = new Prestation(prestationData);
        await prestation.save();
        results.imported++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          designation: row.designation || row.désignation || 'N/A',
          messages: [error.message]
        });
      }
    }

    // Render results view
    res.render("prestations/import-results", {
      title: "Résultats de l'Import",
      results,
      totalRows: data.length
    });

  } catch (error) {
    console.error("Error in importPrestations:", error);
    res.redirect(`/prestations?error=${encodeURIComponent('Erreur lors du traitement du fichier: ' + error.message)}`);
  }
};
