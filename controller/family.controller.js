// family.controller.js
const Family = require("../models/Family");
const Specialty = require("../models/Specialty");
const Prestation = require("../models/Prestation");

// Liste des familles
module.exports.familyList = async (req, res) => {
  try {
    const searchTerm = req.query.search ? req.query.search.trim() : '';
    const specialtyFilter = req.query.specialty || '';

    let query = {};
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (specialtyFilter) {
      query.specialty = specialtyFilter;
    }

    const families = await Family.find(query)
      .populate("specialty")
      .populate('createdBy', 'firstname lastname')
      .populate('updatedBy', 'firstname lastname')
      .sort({ specialty: 1, name: 1 });

    const specialties = await Specialty.find().sort({ name: 1 });

    res.render("families/index", {
      title: "Gestion des Familles",
      families,
      specialties,
      search: searchTerm,
      specialtyFilter
    });
  } catch (error) {
    console.error("Error in familyList:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement des familles",
    });
  }
};

// Nouvelle famille
module.exports.renderFamilyForm = async (req, res) => {
  try {
    const specialties = await Specialty.find().sort({ name: 1 });

    res.render("families/new", {
      title: "Nouvelle Famille",
      family: {},
      specialties,
      error: null,
    });
  } catch (error) {
    console.error("Error in renderFamilyForm:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement du formulaire",
    });
  }
};

// Ajouter famille
module.exports.createFamily = async (req, res) => {
  try {
    const { name, specialty, description } = req.body;

    if (!name || !specialty) {
      throw new Error("Le nom et la spécialité sont obligatoires");
    }

    // Check for duplicate name within the same specialty
    const existingFamily = await Family.findOne({
      name: name.trim(),
      specialty
    });

    if (existingFamily) {
      const specialties = await Specialty.find().sort({ name: 1 });
      return res.status(400).render("families/new", {
        title: "Nouvelle Famille",
        family: req.body,
        specialties,
        error: "Une famille avec ce nom existe déjà pour cette spécialité"
      });
    }

    const family = new Family({
      name: name.trim(),
      specialty,
      description: description ? description.trim() : undefined,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await family.save();
    res.redirect("/families?success=Famille créée avec succès");
  } catch (error) {
    console.error("Error in createFamily:", error);

    try {
      const specialties = await Specialty.find().sort({ name: 1 });
      res.status(400).render("families/new", {
        title: "Nouvelle Famille",
        family: req.body,
        specialties,
        error: error.message || "Erreur lors de la création",
      });
    } catch (renderError) {
      res.status(500).render("error", {
        title: "Erreur",
        error: "Erreur lors de la création de la famille",
      });
    }
  }
};

// Edit famille form
module.exports.renderEditFamilyForm = async (req, res) => {
  try {
    const family = await Family.findById(req.params.id).populate("specialty");

    if (!family) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Famille non trouvée",
      });
    }

    const specialties = await Specialty.find().sort({ name: 1 });

    res.render("families/edit", {
      title: "Modifier Famille",
      family,
      specialties,
      error: null,
    });
  } catch (error) {
    console.error("Error in renderEditFamilyForm:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement de la famille",
    });
  }
};

// Update famille
module.exports.updateFamily = async (req, res) => {
  try {
    const familyId = req.params.id;
    const { name, specialty, description } = req.body;

    const existingFamily = await Family.findById(familyId);
    if (!existingFamily) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Famille non trouvée",
      });
    }

    // Check for duplicate name within the same specialty (excluding current family)
    const duplicateFamily = await Family.findOne({
      _id: { $ne: familyId },
      name: name.trim(),
      specialty
    });

    if (duplicateFamily) {
      const specialties = await Specialty.find().sort({ name: 1 });
      return res.status(400).render("families/edit", {
        title: "Modifier Famille",
        family: { ...existingFamily.toObject(), ...req.body },
        specialties,
        error: "Une famille avec ce nom existe déjà pour cette spécialité"
      });
    }

    const updateData = {
      name: name ? name.trim() : existingFamily.name,
      specialty: specialty || existingFamily.specialty,
      description: description ? description.trim() : undefined,
      updatedBy: req.user._id
    };

    await Family.findByIdAndUpdate(familyId, updateData, {
      runValidators: true,
      new: true,
    });

    res.redirect("/families?success=Famille modifiée avec succès");
  } catch (error) {
    console.error("Error in updateFamily:", error);

    try {
      const family = await Family.findById(req.params.id);
      const specialties = await Specialty.find().sort({ name: 1 });

      res.status(400).render("families/edit", {
        title: "Modifier Famille",
        family: { ...family.toObject(), ...req.body },
        specialties,
        error: error.message || "Erreur lors de la modification",
      });
    } catch (renderError) {
      res.status(500).render("error", {
        title: "Erreur",
        error: "Erreur lors de la modification de la famille",
      });
    }
  }
};

// Delete famille
module.exports.deleteFamily = async (req, res) => {
  try {
    const familyId = req.params.id;

    // Check if family is used in any prestation
    const prestationsCount = await Prestation.countDocuments({
      family: familyId,
    });

    if (prestationsCount > 0) {
      return res.redirect(
        `/families?error=Cette famille ne peut pas être supprimée car elle est utilisée dans ${prestationsCount} prestation(s)`
      );
    }

    const family = await Family.findByIdAndDelete(familyId);

    if (!family) {
      return res.redirect("/families?error=Famille non trouvée");
    }

    res.redirect("/families?success=Famille supprimée avec succès");
  } catch (error) {
    console.error("Error in deleteFamily:", error);
    res.redirect(
      "/families?error=Erreur lors de la suppression de la famille"
    );
  }
};

// API endpoint to get families by specialty
module.exports.getFamiliesBySpecialty = async (req, res) => {
  try {
    const { specialtyId } = req.params;
    
    const families = await Family.find({ specialty: specialtyId })
      .sort({ name: 1 })
      .select('_id name');

    res.json({ success: true, families });
  } catch (error) {
    console.error("Error in getFamiliesBySpecialty:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Import families from Excel
module.exports.importFamilies = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/families?error=Aucun fichier uploadé");
    }

    const XLSX = require('xlsx');

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!data || data.length === 0) {
      return res.redirect("/families?error=Le fichier Excel est vide");
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
        const name = normalizedRow['nom'] || normalizedRow['name'] || normalizedRow['famille'] || '';
        const specialtyName = normalizedRow['spécialité'] || normalizedRow['specialite'] || normalizedRow['specialty'] || '';
        const description = normalizedRow['description'] || '';

        // Validation
        const errors = [];

        if (!name || name.trim() === '') {
          errors.push('Nom de famille manquant');
        }

        if (!specialtyName || specialtyName.trim() === '') {
          errors.push('Spécialité manquante');
        } else if (!specialtyMap[specialtyName.toLowerCase().trim()]) {
          errors.push(`Spécialité "${specialtyName}" non trouvée`);
        }

        if (errors.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            name: name || 'N/A',
            specialty: specialtyName || 'N/A',
            messages: errors
          });
          continue;
        }

        // Check for duplicate name within the same specialty
        const specialtyId = specialtyMap[specialtyName.toLowerCase().trim()];
        const existingFamily = await Family.findOne({
          name: name.trim(),
          specialty: specialtyId
        });

        if (existingFamily) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            name: name,
            specialty: specialtyName,
            messages: [`Famille "${name}" existe déjà pour cette spécialité`]
          });
          continue;
        }

        // Prepare family data
        const familyData = {
          name: name.trim(),
          specialty: specialtyId,
          description: description ? description.trim() : ''
        };

        // Create and save family
        const family = new Family(familyData);
        await family.save();
        results.imported++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          name: row.nom || row.name || 'N/A',
          specialty: row.spécialité || row.specialite || 'N/A',
          messages: [error.message]
        });
      }
    }

    // Render results view
    res.render("families/import-results", {
      title: "Résultats de l'Import",
      results,
      totalRows: data.length
    });

  } catch (error) {
    console.error("Error in importFamilies:", error);
    res.redirect(`/families?error=${encodeURIComponent('Erreur lors du traitement du fichier: ' + error.message)}`);
  }
};

// Download Excel template for families import
module.exports.downloadFamilyTemplate = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    // Fetch specialties for examples
    const specialties = await Specialty.find().sort({ name: 1 }).limit(5);

    // Create sample data with headers
    const worksheetData = [
      // Header row
      ['Nom', 'Spécialité', 'Description'],
      
      // Sample rows with realistic data
      ['PAROI ABDOMINALE', specialties[0]?.name || 'Chirurgie Générale', 'Interventions sur la paroi abdominale'],
      ['FOIE VOIES BILIAIRES', specialties[0]?.name || 'Chirurgie Générale', 'Chirurgie hépatique et biliaire'],
      ['THYROÏDE', specialties[0]?.name || 'Chirurgie Générale', 'Chirurgie de la thyroïde'],
      ['LAPAROTOMIE', specialties[0]?.name || 'Chirurgie Générale', 'Laparotomie exploratrice'],
      ['GENOU', specialties[1]?.name || 'Orthopédie', 'Chirurgie du genou'],
      ['HANCHE', specialties[1]?.name || 'Orthopédie', 'Chirurgie de la hanche'],
      ['RACHIS', specialties[1]?.name || 'Orthopédie', 'Chirurgie de la colonne vertébrale']
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 30 },  // Nom
      { wch: 30 },  // Spécialité
      { wch: 50 }   // Description
    ];

    // Add notes/instructions sheet
    const specialtyList = specialties.map(s => s.name).join(', ');
    const notesData = [
      ['INSTRUCTIONS POUR L\'IMPORT DES FAMILLES'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['Nom', 'Nom de la famille (ex: PAROI ABDOMINALE, FOIE VOIES BILIAIRES)'],
      ['Spécialité', 'Nom exact de la spécialité à laquelle appartient cette famille'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['Description', 'Brève description de la famille (jusqu\'à 500 caractères)'],
      [''],
      ['SPÉCIALITÉS DISPONIBLES:'],
      [specialtyList || 'Veuillez créer des spécialités dans le système'],
      [''],
      ['REMARQUES IMPORTANTES:'],
      ['- Le nom de la famille doit être unique au sein de chaque spécialité'],
      ['- Les noms de spécialités doivent correspondre exactement aux spécialités existantes'],
      ['- Les familles permettent de regrouper les prestations par type d\'intervention'],
      ['- Une ligne vide sera ignorée'],
      ['- Taille maximale du fichier: 5 MB']
    ];

    const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
    wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

    // Create workbook and add both sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Familles');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Modele_Import_Familles.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.send(buffer);

  } catch (error) {
    console.error("Error generating template:", error);
    res.redirect('/families?error=' + encodeURIComponent('Erreur lors de la génération du modèle Excel'));
  }
};
