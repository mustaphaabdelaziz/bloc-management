const Specialty = require("../models/Specialty");
const Prestation = require("../models/Prestation");
const Surgery = require("../models/Surgery");

module.exports.specialityList = async (req, res) => {
  try {
    const search = req.query.search || "";

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };
    }

    const specialties = await Specialty.find(query)
      .populate('createdBy', 'firstname lastname')
      .populate('updatedBy', 'firstname lastname')
      .sort({ name: 1 });
    res.render("specialties/index", {
      title: "Gestion des Spécialités",
      specialties,
      filters: { search },
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.renderCreateSpecialtyForm = (req, res) => {
  res.render("specialties/new", {
    title: "Nouvelle Spécialité",
    specialty: {},
  });
};

module.exports.createSpecialty = async (req, res) => {
  try {
    const specialty = new Specialty(req.body);
    specialty.createdBy = req.user._id;
    specialty.updatedBy = req.user._id;
    await specialty.save();
    res.redirect("/specialties?success=Spécialité créée avec succès");
  } catch (error) {
    let errorMessage = "Erreur lors de la création";
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      errorMessage = errors.join(', ');
    } else if (error.code === 11000) {
      // Duplicate key error
      errorMessage = "Le code de spécialité existe déjà. Veuillez utiliser un code unique.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.render("specialties/new", {
      title: "Nouvelle Spécialité",
      specialty: req.body,
      error: errorMessage,
    });
  }
};
module.exports.deleteSpecialty = async (req, res) => {
  try {
    const specialtyId = req.params.id;

    // Check if specialty is used in any prestation that is referenced by surgeries
    const prestationsWithSpecialty = await Prestation.find({ specialty: specialtyId }).select('_id');
    const prestationIds = prestationsWithSpecialty.map(p => p._id);
    
    const surgeriesCount = await Surgery.countDocuments({
      prestation: { $in: prestationIds },
    });

    if (surgeriesCount > 0) {
      return res.redirect(
        `/specialties?error=Cette spécialité ne peut pas être supprimée car elle est utilisée dans ${surgeriesCount} chirurgie(s)`
      );
    }

    await Specialty.findByIdAndDelete(specialtyId);
    res.redirect("/specialties?success=Spécialité supprimée avec succès");
  } catch (error) {
    res.redirect("/specialties?error=Erreur lors de la suppression");
  }
};

module.exports.renderEditSpecialtyForm = async (req, res) => {
  try {
    const specialty = await Specialty.findById(req.params.id);
    res.render("specialties/edit", {
      title: "Modifier Spécialité",
      specialty,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.updateSpecialty = async (req, res) => {
  try {
    const updateData = { ...req.body, updatedBy: req.user._id };
    await Specialty.findByIdAndUpdate(req.params.id, updateData);
    res.redirect("/specialties?success=Spécialité modifiée avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.importSpecialties = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/specialties?error=Aucun fichier uploadé");
    }

    const XLSX = require('xlsx');

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!data || data.length === 0) {
      return res.redirect("/specialties?error=Le fichier Excel est vide");
    }

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
        const code = normalizedRow['code'] || '';
        const name = normalizedRow['nom'] || normalizedRow['name'] || '';
        const description = normalizedRow['description'] || '';

        // Validation
        const errors = [];

        if (!code || code.trim() === '') {
          errors.push('Code manquant');
        }

        if (!name || name.trim() === '') {
          errors.push('Nom manquant');
        }

        if (errors.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            code: code || 'N/A',
            name: name || 'N/A',
            messages: errors
          });
          continue;
        }

        // Check for duplicate code
        const existingCode = await Specialty.findOne({ code: code.trim() });
        if (existingCode) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            code: code,
            name: name,
            messages: [`Code "${code}" existe déjà`]
          });
          continue;
        }

        // Prepare specialty data
        const specialtyData = {
          code: code.trim(),
          name: name.trim(),
          description: description ? description.trim() : ''
        };

        // Create and save specialty
        const specialty = new Specialty(specialtyData);
        specialty.createdBy = req.user._id;
        specialty.updatedBy = req.user._id;
        await specialty.save();
        results.imported++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          code: row.code || 'N/A',
          name: row.nom || row.name || 'N/A',
          messages: [error.message]
        });
      }
    }

    // Render results view
    res.render("specialties/import-results", {
      title: "Résultats de l'Import",
      results,
      totalRows: data.length
    });

  } catch (error) {
    console.error("Error in importSpecialties:", error);
    res.redirect(`/specialties?error=${encodeURIComponent('Erreur lors du traitement du fichier: ' + error.message)}`);
  }
};

// Download Excel template for specialties import
module.exports.downloadSpecialtyTemplate = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    // Create sample data with headers
    const worksheetData = [
      // Header row
      ['Code', 'Nom', 'Description'],
      
      // Sample rows with realistic data
      ['CARDIO', 'Cardiologie', 'Spécialité des maladies du cœur et des vaisseaux'],
      ['CHGEN', 'Chirurgie Générale', 'Chirurgie générale et interventions diverses'],
      ['GYNECO', 'Gynécologie', 'Obstétrique et gynécologie'],
      ['ORTHO', 'Orthopédie', 'Chirurgie des os et des articulations'],
      ['NEURO', 'Neurochirurgie', 'Chirurgie du système nerveux'],
      ['OPHTALMOLOGUE', 'Ophtalmologie', 'Chirurgie et maladies des yeux'],
      ['ORL', 'Oto-Rhino-Laryngologie', 'Chirurgie de l\'oreille, nez et gorge'],
      ['ANESTHESIE', 'Anesthésiologie', 'Anesthésie et soins périopératoires']
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 20 },  // Code
      { wch: 30 },  // Nom
      { wch: 50 }   // Description
    ];

    // Add notes/instructions sheet
    const notesData = [
      ['INSTRUCTIONS POUR L\'IMPORT DES SPÉCIALITÉS'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['Code', 'Code unique et court pour la spécialité (ex: CARDIO)'],
      ['Nom', 'Nom complet et lisible de la spécialité (ex: Cardiologie)'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['Description', 'Brève description de la spécialité (jusqu\'à 500 caractères)'],
      [''],
      ['REMARQUES IMPORTANTES:'],
      ['- Le code doit être unique dans le système'],
      ['- Le nom doit être unique également'],
      ['- Le code doit contenir au moins 2 caractères'],
      ['- Taille maximale du fichier: 5 MB'],
      ['- Les caractères spéciaux sont autorisés dans la description'],
      ['- Les lignes vides seront ignorées'],
      [''],
      ['EXEMPLE D\'UTILISATION:'],
      ['- Remplissez le code avec un identifiant court'],
      ['- Entrez le nom complet de la spécialité'],
      ['- Optionnellement, ajoutez une description'],
      ['- Téléchargez et complétez ce fichier'],
      ['- Importez via le bouton "Importer Excel" dans l\'interface']
    ];

    const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
    wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

    // Create workbook and add both sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Spécialités');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Modele_Import_Specialites.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.send(buffer);

  } catch (error) {
    console.error("Error generating template:", error);
    res.redirect('/specialties?error=' + encodeURIComponent('Erreur lors de la génération du modèle Excel'));
  }
};
