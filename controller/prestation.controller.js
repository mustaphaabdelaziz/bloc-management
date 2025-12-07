// prestation.controller.js
const Prestation = require("../models/Prestation");
const Specialty = require("../models/Specialty");
const Family = require("../models/Family");
const Surgery = require("../models/Surgery"); // FIX: Added missing import
const moment = require("moment");

// Liste des prestations
module.exports.prestationList = async (req, res) => {
  try {
    // Get search parameter from query string
    const searchTerm = req.query.search ? req.query.search.trim() : '';

    // Build search query if search term is provided
    let query = {};
    if (searchTerm) {
      query = {
        $or: [
          { designation: { $regex: searchTerm, $options: 'i' } },
          { code: { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }

    let prestations = await Prestation.find(query)
      .populate("specialty")
      .populate("family")
      .populate('createdBy', 'firstname lastname')
      .populate('updatedBy', 'firstname lastname')
      .sort({ designation: 1 });

    // If search term is provided, also filter by specialty name
    // Keep only prestations that match designation/code OR specialty name
    if (searchTerm) {
      prestations = prestations.filter(p => {
        const matchesDesignation = p.designation.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCode = p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSpecialty = p.specialty && p.specialty.name && 
                                 p.specialty.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDesignation || matchesCode || matchesSpecialty;
      });
    }

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
      search: searchTerm,
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
    const families = await Family.find().populate('specialty').sort({ specialty: 1, name: 1 });

    res.render("prestations/new", {
      title: "Nouvelle Prestation",
      prestation: {},
      specialties,
      families,
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
    const { designation, specialty, priceHT, minDuration, maxDuration } = req.body;

    if (!designation || !specialty || !priceHT || !minDuration || !maxDuration) {
      throw new Error("Tous les champs obligatoires doivent être remplis");
    }

    // Create new prestation with proper data types (code will be auto-generated)
    const prestationData = {
      designation: designation.trim(),
      specialty,
      family: req.body.family && req.body.family !== '' ? req.body.family : undefined,
      priceHT: parseFloat(priceHT),
      tva: req.body.tva ? parseFloat(req.body.tva) : 0.09,
      minDuration: parseInt(minDuration),
      maxDuration: parseInt(maxDuration),
      exceededDurationUnit: req.body.exceededDurationUnit
        ? parseInt(req.body.exceededDurationUnit)
        : 15,
      exceededDurationFee: req.body.exceededDurationFee
        ? parseFloat(req.body.exceededDurationFee)
        : 0,
      exceededDurationTolerance: req.body.exceededDurationTolerance
        ? parseInt(req.body.exceededDurationTolerance)
        : 15,
      urgentFeePercentage: req.body.urgentFeePercentage
        ? parseFloat(req.body.urgentFeePercentage) / 100 // Convert percentage to decimal
        : 0,
    };

    // Only admin and direction can modify tolerance value
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canEditTolerance = userPrivileges.includes('admin') || userPrivileges.includes('direction');
    if (!canEditTolerance) {
      // For non-privileged users, use default value
      prestationData.exceededDurationTolerance = 15;
    };

    const prestation = new Prestation(prestationData);
    prestation.createdBy = req.user._id;
    prestation.updatedBy = req.user._id;
    await prestation.save();

    res.redirect("/prestations?success=Prestation créée avec succès");
  } catch (error) {
    console.error("Error in createPrestation:", error);

    try {
      const specialties = await Specialty.find().sort({ name: 1 });
      const families = await Family.find().populate('specialty').sort({ specialty: 1, name: 1 });
      res.status(400).render("prestations/new", {
        title: "Nouvelle Prestation",
        prestation: req.body,
        specialties,
        families,
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
    const prestation = await Prestation.findById(req.params.id)
      .populate("specialty")
      .populate("family");

    if (!prestation) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Prestation non trouvée",
      });
    }

    const specialties = await Specialty.find().sort({ name: 1 });
    const families = await Family.find().populate('specialty').sort({ specialty: 1, name: 1 });

    res.render("prestations/edit", {
      title: "Modifier Prestation",
      prestation,
      specialties,
      families,
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
      family: req.body.family && req.body.family !== ''
        ? req.body.family
        : undefined,
      priceHT: req.body.priceHT
        ? parseFloat(req.body.priceHT)
        : existingPrestation.priceHT,
      tva: req.body.tva !== undefined && req.body.tva !== ''
        ? parseFloat(req.body.tva)
        : existingPrestation.tva,
      minDuration: req.body.minDuration
        ? parseInt(req.body.minDuration)
        : existingPrestation.minDuration,
      maxDuration: req.body.maxDuration
        ? parseInt(req.body.maxDuration)
        : existingPrestation.maxDuration,
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

    // Only admin and direction can modify tolerance value
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canEditTolerance = userPrivileges.includes('admin') || userPrivileges.includes('direction');
    if (canEditTolerance && req.body.exceededDurationTolerance !== undefined) {
      updateData.exceededDurationTolerance = parseInt(req.body.exceededDurationTolerance);
    } else {
      updateData.exceededDurationTolerance = existingPrestation.exceededDurationTolerance;
    };

    updateData.updatedBy = req.user._id;
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
      const families = await Family.find().populate('specialty').sort({ specialty: 1, name: 1 });

      res.status(400).render("prestations/edit", {
        title: "Modifier Prestation",
        prestation: { ...prestation.toObject(), ...req.body },
        specialties,
        families,
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
      await Prestation.findById(prestationId)
        .populate("specialty")
        .populate("family");

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

    // Get all families for lookup
    const families = await Family.find().populate('specialty');
    const familyMap = {};
    families.forEach(f => {
      const key = `${f.name.toLowerCase().trim()}_${f.specialty._id}`;
      familyMap[key] = f._id;
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
        const family = normalizedRow['famille'] || normalizedRow['family'] || '';
        const priceHT = normalizedRow['prix ht (da)'] || normalizedRow['prix ht'] || normalizedRow['prixht'] || '';
        const tvaInput = normalizedRow['tva (%)'] || normalizedRow['tva'] || '9';
        const minDuration = normalizedRow['durée min (minutes)'] || normalizedRow['duree min'] || normalizedRow['min duration'] || '';
        const maxDuration = normalizedRow['durée max (minutes)'] || normalizedRow['duree max'] || normalizedRow['max duration'] || '';
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

        if (!minDuration || isNaN(parseInt(minDuration))) {
          errors.push('Durée Min invalide ou manquante');
        } else if (parseInt(minDuration) <= 0) {
          errors.push('Durée Min doit être positive');
        }

        if (!maxDuration || isNaN(parseInt(maxDuration))) {
          errors.push('Durée Max invalide ou manquante');
        } else if (parseInt(maxDuration) <= 0) {
          errors.push('Durée Max doit être positive');
        }

        if (minDuration && maxDuration && parseInt(minDuration) > parseInt(maxDuration)) {
          errors.push('Durée Min doit être ≤ Durée Max');
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
          family: undefined,
          priceHT: parseFloat(priceHT),
          tva: parseFloat(tvaInput) / 100, // Convert percentage to decimal
          minDuration: parseInt(minDuration),
          maxDuration: parseInt(maxDuration),
          exceededDurationUnit: parseInt(exceededDurationUnit) || 15,
          exceededDurationFee: parseFloat(exceededDurationFee) || 0,
          urgentFeePercentage: Math.min(1, Math.max(0, parseFloat(urgentFeeInput) / 100)) // Convert percentage to decimal, clamp 0-1
        };

        // Look up family if provided
        if (family && family.trim() !== '') {
          const specialtyId = specialtyMap[specialtyName.toLowerCase().trim()];
          const familyKey = `${family.toLowerCase().trim()}_${specialtyId}`;
          if (familyMap[familyKey]) {
            prestationData.family = familyMap[familyKey];
          }
          // If family not found, just skip it (it's optional)
        }

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

// Download Excel template for prestations import
module.exports.downloadTemplate = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    // Fetch all specialties for reference
    const specialties = await Specialty.find().sort({ name: 1 }).limit(10);
    const specialtyNames = specialties.map(s => s.name).join(', ');

    // Create sample data with headers
    const worksheetData = [
      // Header row
      ['Désignation', 'Spécialité', 'Famille', 'Prix HT (DA)', 'TVA (%)', 'Durée Min (minutes)', 'Durée Max (minutes)', 'Marge de tolérance (minutes)', 'Unité Dépassement (min)', 'Frais Dépassement (DA)', 'Frais Urgents (%)'],
      
      // Sample rows with realistic data
      ['Pontage Aorto-Coronarien', specialties[0]?.name || 'Cardiologie', '', 250000, 9, 90, 120, 10, 15, 500, 10],
      ['Appendicectomie', specialties[1]?.name || 'Chirurgie Générale', 'PAROI ABDOMINALE', 80000, 9, 30, 45, 5, 15, 300, 0],
      ['Césarienne', specialties[2]?.name || 'Gynécologie', '', 150000, 9, 60, 90, 8, 15, 400, 20],
      ['Arthroplastie du Genou', specialties[3]?.name || 'Orthopédie', '', 200000, 9, 120, 150, 10, 15, 600, 15]
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 35 },  // Désignation
      { wch: 25 },  // Spécialité
      { wch: 25 },  // Famille
      { wch: 15 },  // Prix HT
      { wch: 10 },  // TVA
      { wch: 18 },  // Durée Min
      { wch: 18 },  // Durée Max
      { wch: 26 },  // Marge de tolérance
      { wch: 22 },  // Unité Dépassement
      { wch: 20 },  // Frais Dépassement
      { wch: 18 }   // Frais Urgents
    ];

    // Add notes/instructions sheet
    const notesData = [
      ['INSTRUCTIONS POUR L\'IMPORT DES PRESTATIONS'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['Désignation', 'Nom complet de la prestation chirurgicale'],
      ['Spécialité', 'Doit correspondre exactement à une spécialité existante'],
      ['Prix HT (DA)', 'Prix hors taxe en Dinars Algériens (nombre positif)'],
      ['TVA (%)', 'Taux de TVA: 0, 9, ou 19 (sans le symbole %)'],
      ['Durée Min (minutes)', 'Durée minimale estimée de l\'intervention en minutes'],
      ['Durée Max (minutes)', 'Durée maximale estimée de l\'intervention en minutes (utilisée pour calcul honoraires)'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['Famille', 'Groupe au sein de la spécialité (ex: PAROI ABDOMINALE, FOIE VOIES BILIAIRES)'],
      ['Marge de tolérance (minutes)', 'Marge acceptable de variation autour de la durée maximale (défaut: 15)'],
      ['Unité Dépassement (min)', 'Tranche de dépassement en minutes (défaut: 15)'],
      ['Frais Dépassement (DA)', 'Frais par tranche de dépassement (défaut: 0)'],
      ['Frais Urgents (%)', 'Majoration pour chirurgie urgente (défaut: 0)'],
      [''],
      ['SPÉCIALITÉS DISPONIBLES:'],
      [specialtyNames || 'Veuillez créer des spécialités dans le système'],
      [''],
      ['REMARQUES IMPORTANTES:'],
      ['- Les noms de spécialités sont sensibles à la casse'],
      ['- Les montants doivent être des nombres sans symboles'],
      ['- Les pourcentages sont indiqués sans le symbole %'],
      ['- Durée Min doit être ≤ Durée Max'],
      ['- Durée Max est utilisée comme seuil pour les frais de dépassement'],
      ['- Le code sera généré automatiquement si non fourni'],
      ['- Taille maximale du fichier: 5 MB']
    ];

    const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
    wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

    // Create workbook and add both sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prestations');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Modele_Import_Prestations.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.send(buffer);

  } catch (error) {
    console.error("Error generating template:", error);
    res.redirect('/prestations?error=' + encodeURIComponent('Erreur lors de la génération du modèle Excel'));
  }
};

