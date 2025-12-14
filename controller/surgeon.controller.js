// Liste des chirurgiens
const Surgeon = require("../models/Surgeon");
const Specialty = require("../models/Specialty");
const Surgery = require("../models/Surgery");
const Patient = require("../models/Patient");
const Prestation = require("../models/Prestation");

module.exports.surgeonList = async (req, res) => {
  try {
    const searchTerm = req.query.search ? req.query.search.trim() : '';

    let query = {};
    if (searchTerm) {
      // Search by firstName, lastName, or specialty name
      const specialtyMatches = await Specialty.find({
        name: { $regex: searchTerm, $options: 'i' }
      }).select('_id');
      const specialtyIds = specialtyMatches.map(s => s._id);

      query = {
        $or: [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { specialty: { $in: specialtyIds } }
        ]
      };
    }

    const surgeons = await Surgeon.find(query)
      .populate("specialty")
      .populate("createdBy", "firstname lastname")
      .populate("updatedBy", "firstname lastname")
      .sort({ lastName: 1 });

    // Check if user can see contract information
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canSeeContractInfo = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    // Filter out contract data for headDepart and assistante users
    const filteredSurgeons = canSeeContractInfo ? surgeons : surgeons.map(s => ({
      ...s.toObject(),
      contractType: undefined,
      locationRate: undefined,
      percentageRate: undefined
    }));

    res.render("surgeons/index", {
      title: "Gestion des Chirurgiens",
      surgeons: filteredSurgeons,
      canSeeContractInfo,
      search: searchTerm
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.renderCreateSurgeonForm = async (req, res) => {
  try {
    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("surgeons/new", {
      title: "Nouveau Chirurgien",
      surgeon: {},
      specialties,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.createSurgeon = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, specialty, degree, contractType, locationRate, percentageRate, code, autoGenerate } = req.body;

    // Validation - only firstName, lastName, specialty are required
    if (!firstName || !lastName || !specialty) {
      return res.status(400).render("surgeons/new", {
        title: "Ajouter un Chirurgien",
        error: "Tous les champs requis doivent être remplis",
        specialties: await Specialty.find({}),
        surgeon: req.body,
      });
    }

    // Validate contract data if contractType is provided
    if (contractType) {
      if (contractType === 'location' && !locationRate) {
        return res.status(400).render("surgeons/new", {
          title: "Ajouter un Chirurgien",
          error: "Le taux horaire est requis pour un contrat location",
          specialties: await Specialty.find({}),
          surgeon: req.body,
        });
      }
      if (contractType === 'percentage' && !percentageRate) {
        return res.status(400).render("surgeons/new", {
          title: "Ajouter un Chirurgien",
          error: "Le pourcentage est requis pour un contrat pourcentage",
          specialties: await Specialty.find({}),
          surgeon: req.body,
        });
      }
    }

    // Handle code generation
    let finalCode = "";

    if (autoGenerate || !code) {
      // Auto-generate code in SR-XXXXX format
      const allSurgeons = await Surgeon.find({ code: /^SR-\d{5}$/ }).sort({ code: -1 });
      
      let nextNumber = 1;
      if (allSurgeons.length > 0) {
        const lastCode = allSurgeons[0].code;
        const match = lastCode.match(/^SR-(\d{5})$/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }
      
      finalCode = `SR-${nextNumber.toString().padStart(5, "0")}`;
    } else {
      // Manual code entry - accept any non-empty code
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        return res.status(400).render("surgeons/new", {
          title: "Ajouter un Chirurgien",
          error: "Le code est requis",
          specialties: await Specialty.find({}),
          surgeon: req.body,
        });
      }
      finalCode = trimmedCode;
    }

    // Check if code already exists
    const existingCode = await Surgeon.findOne({ code: finalCode });
    if (existingCode) {
      return res.status(400).render("surgeons/new", {
        title: "Ajouter un Chirurgien",
        error: "Ce code de chirurgien existe déjà",
        specialties: await Specialty.find({}),
        surgeon: req.body,
      });
    }

    // Create surgeon
    const surgeonData = {
      ...req.body,
      code: finalCode,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };

    const surgeon = new Surgeon(surgeonData);
    await surgeon.save();

    res.redirect("/surgeons?success=Chirurgien créé avec succès");
  } catch (error) {
    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("surgeons/new", {
      title: "Nouveau Chirurgien",
      surgeon: req.body,
      specialties,
      error: "Erreur lors de la création",
    });
  }
};

// Voir chirurgien
module.exports.viewSurgeon = async (req, res) => {
  try {
    const surgeon = await Surgeon.findById(req.params.id).populate("specialty");
    if (!surgeon) {
      return res.status(404).render("404", { title: "Chirurgien non trouvé" });
    }

    // Check if user can see contract information
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canSeeContractInfo = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    const surgeries = await Surgery.find({ surgeon: surgeon._id })
      .populate("patient", "firstName lastName")
      .populate("prestation", "designation")
      .sort({ beginDateTime: -1 });

    res.render("surgeons/show", {
      title: `Chirurgien: Dr. ${surgeon.firstName} ${surgeon.lastName}`,
      surgeon,
      surgeries,
      canSeeContractInfo,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.renderEditSurgeonForm = async (req, res) => {
  try {
    const surgeon = await Surgeon.findById(req.params.id);
    if (!surgeon) {
      return res.status(404).render("404", { title: "Chirurgien non trouvé" });
    }
    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("surgeons/edit", {
      title: "Modifier Chirurgien",
      surgeon,
      specialties,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.updateSurgeon = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, specialty, contractType, locationRate, percentageRate, dateOfBirth, code, allowRegenerate } = req.body;

    // Prepare update data
    const updateData = {
      firstName,
      lastName,
      phone,
      specialty,
      contractType,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
    };

    // Handle code update only if allowRegenerate is checked
    if (allowRegenerate && code) {
      // Validate code is not empty
      if (!code.trim()) {
        return res.redirect("/surgeons?error=Le code ne peut pas être vide");
      }

      // Check if new code is unique (and different from current code)
      const currentSurgeon = await Surgeon.findById(req.params.id);
      if (code !== currentSurgeon.code) {
        const existingCode = await Surgeon.findOne({ code: code });
        if (existingCode) {
          return res.redirect("/surgeons?error=Ce code existe déjà. Veuillez choisir un code unique");
        }
      }

      updateData.code = code;
    }

    // Only update rate based on contract type and clear the other
    if (contractType === 'location') {
      updateData.locationRate = parseFloat(locationRate) || 0;
      updateData.percentageRate = null;
    } else if (contractType === 'percentage') {
      updateData.percentageRate = parseFloat(percentageRate) || 0;
      updateData.locationRate = null;
    }

    // Remove undefined values but keep null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    updateData.updatedBy = req.user._id;
    await Surgeon.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.redirect("/surgeons?success=Chirurgien modifié avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.deleteSurgeon = async (req, res) => {
  try {
    const surgeonId = req.params.id;

    // Check if surgeon is used in any surgery
    const surgeriesCount = await Surgery.countDocuments({
      surgeon: surgeonId,
    });

    if (surgeriesCount > 0) {
      return res.redirect(
        `/surgeons?error=Ce chirurgien ne peut pas être supprimé car il est utilisé dans ${surgeriesCount} chirurgie(s)`
      );
    }

    await Surgeon.findByIdAndDelete(surgeonId);
    res.redirect("/surgeons?success=Chirurgien supprimé avec succès");
  } catch (error) {
    res.redirect("/surgeons?error=Erreur lors de la suppression");
  }
};

// API endpoint to get next surgeon code (SR-XXXXX format)
module.exports.getNextCode = async (req, res) => {
  try {
    // Find all surgeons and extract the highest number from codes starting with SR-
    const allSurgeons = await Surgeon.find({ code: /^SR-\d{5}$/ }).sort({ code: -1 });
    
    let nextNumber = 1;
    
    if (allSurgeons.length > 0) {
      // Extract number from last code (e.g., "SR-00001" -> 1)
      const lastCode = allSurgeons[0].code;
      const match = lastCode.match(/^SR-(\d{5})$/);
      if (match) {
        const lastNumber = parseInt(match[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }
    
    // Format the new code
    const newCode = `SR-${nextNumber.toString().padStart(5, '0')}`;
    
    res.json({ code: newCode });
  } catch (error) {
    console.error('Error generating surgeon code:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du code' });
  }
};

// Import surgeons from Excel
module.exports.importSurgeons = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/surgeons?error=Aucun fichier uploadé");
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!data || data.length === 0) {
      return res.redirect("/surgeons?error=Le fichier Excel est vide");
    }

    // Get all specialties for lookup
    const specialties = await Specialty.find();
    const specialtyMap = {};
    specialties.forEach(s => {
      specialtyMap[s.name.toLowerCase().trim()] = s._id;
      specialtyMap[s.code.toLowerCase().trim()] = s._id;
    });

    const results = { imported: 0, failed: 0, errors: [] };

    // Track SR-XXXXX codes for auto-generation
    let maxSRNumber = 0;
    const existingCodes = await Surgeon.find({ code: /^SR-\d{5}$/ }).sort({ code: -1 });
    if (existingCodes.length > 0) {
      const lastCode = existingCodes[0].code;
      const match = lastCode.match(/^SR-(\d{5})$/);
      if (match) {
        maxSRNumber = parseInt(match[1]);
      }
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      try {
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        const code = normalizedRow['code'] || '';
        const firstName = normalizedRow['prénom'] || normalizedRow['prenom'] || normalizedRow['firstname'] || '';
        const lastName = normalizedRow['nom'] || normalizedRow['lastname'] || '';
        const dateOfBirth = normalizedRow['date de naissance'] || normalizedRow['dateofbirth'] || '';
        const phone = normalizedRow['téléphone'] || normalizedRow['telephone'] || normalizedRow['phone'] || '';
        const specialtyName = normalizedRow['spécialité'] || normalizedRow['specialite'] || normalizedRow['specialty'] || '';
        const contractType = (normalizedRow['type de contrat'] || normalizedRow['contracttype'] || '').toLowerCase();
        const locationRate = normalizedRow['taux horaire'] || normalizedRow['locationrate'] || '';
        const percentageRate = normalizedRow['pourcentage'] || normalizedRow['percentagerate'] || '';

        const errors = [];

        if (!firstName || firstName.trim() === '') errors.push('Prénom manquant');
        if (!lastName || lastName.trim() === '') errors.push('Nom manquant');
        if (!specialtyName || specialtyName.trim() === '') errors.push('Spécialité manquante');

        if (errors.length > 0) {
          results.failed++;
          results.errors.push({ 
            row: rowNum, 
            firstName: firstName || 'N/A', 
            lastName: lastName || 'N/A', 
            messages: errors 
          });
          continue;
        }

        // Validate specialty
        const specialtyId = specialtyMap[specialtyName.toLowerCase().trim()];
        if (!specialtyId) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            firstName: firstName,
            lastName: lastName,
            messages: [`Spécialité "${specialtyName}" non trouvée`]
          });
          continue;
        }

        // Parse date of birth if provided
        let dob = null;
        if (dateOfBirth && dateOfBirth.trim() !== '') {
          dob = new Date(dateOfBirth);
          if (isNaN(dob.getTime())) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              firstName: firstName,
              lastName: lastName,
              messages: ['Date de naissance invalide (format: YYYY-MM-DD)']
            });
            continue;
          }
        }

        // Handle code generation
        let finalCode = code && code.trim() !== '' ? code.trim() : null;
        
        if (!finalCode) {
          // Auto-generate code in SR-XXXXX format
          maxSRNumber++;
          finalCode = `SR-${maxSRNumber.toString().padStart(5, "0")}`;
        }

        // Check if code already exists
        const existingCode = await Surgeon.findOne({ code: finalCode });
        if (existingCode) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            firstName: firstName,
            lastName: lastName,
            messages: [`Code "${finalCode}" existe déjà`]
          });
          continue;
        }

        // Prepare surgeon data
        const surgeonData = {
          code: finalCode,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          specialty: specialtyId,
          phone: phone ? phone.trim() : '',
          dateOfBirth: dob
        };

        // Add contract info if provided
        if (contractType) {
          if (contractType === 'location' && locationRate) {
            surgeonData.contractType = 'location';
            surgeonData.locationRate = parseFloat(locationRate);
          } else if (contractType === 'percentage' && percentageRate) {
            surgeonData.contractType = 'percentage';
            surgeonData.percentageRate = parseFloat(percentageRate);
          }
        }

        const surgeon = new Surgeon(surgeonData);
        surgeon.createdBy = req.user._id;
        surgeon.updatedBy = req.user._id;
        await surgeon.save();
        results.imported++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          firstName: row.prenom || row.firstname || 'N/A',
          lastName: row.nom || row.lastname || 'N/A',
          messages: [error.message]
        });
      }
    }

    res.render("surgeons/import-results", { 
      title: "Résultats de l'Import", 
      results, 
      totalRows: data.length 
    });

  } catch (error) {
    console.error("Error in importSurgeons:", error);
    res.redirect(`/surgeons?error=${encodeURIComponent('Erreur lors du traitement du fichier: ' + error.message)}`);
  }
};

// Download Excel template for surgeons import
module.exports.downloadSurgeonTemplate = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    // Get specialties for template instructions
    const allSpecialties = await Specialty.find().limit(10);
    const specialtyNames = allSpecialties.map(s => s.name).join(', ');

    const worksheetData = [
      ['Code', 'Prénom', 'Nom', 'Spécialité', 'Date de Naissance', 'Téléphone', 'Type de Contrat', 'Taux Horaire', 'Pourcentage'],
      ['CH-001', 'Ahmed', 'Benali', allSpecialties[0]?.name || 'Chirurgie', '1975-03-15', '0123456789', 'location', '50000', ''],
      ['', 'Fatima', 'Hamza', allSpecialties[1]?.name || 'Orthopédie', '1980-07-22', '0987654321', 'percentage', '', '45'],
      ['', '', allSpecialties[2]?.name || 'Gynécologie', '1982-11-30', '0555555555', '', '', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];

    const notesData = [
      ['INSTRUCTIONS POUR L\'IMPORT DES CHIRURGIENS'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['Prénom', 'Prénom du chirurgien'],
      ['Nom', 'Nom de famille du chirurgien'],
      ['Spécialité', 'Spécialité chirurgicale (doit exister dans le système)'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['Code', 'Code unique du chirurgien (ex: CH-001). Si vide, sera généré automatiquement (SR-XXXXX)'],
      ['Date de Naissance', 'Format: YYYY-MM-DD (ex: 1975-03-15)'],
      ['Téléphone', 'Numéro de téléphone'],
      ['Type de Contrat', 'location ou percentage (optionnel)'],
      ['Taux Horaire', 'Pour contrats location (optionnel, en DA)'],
      ['Pourcentage', 'Pour contrats percentage (optionnel, ex: 45 pour 45%)'],
      [''],
      ['SPÉCIALITÉS DISPONIBLES:'],
      [specialtyNames || 'Veuillez créer des spécialités dans le système'],
      [''],
      ['REMARQUES IMPORTANTES:'],
      ['- Les codes personnalisés doivent être uniques'],
      ['- Les codes vides seront remplacés par des codes auto-générés (SR-XXXXX)'],
      ['- Si vous configurez un contrat, le type et le taux/pourcentage correspondant sont requis'],
      ['- Les contrats peuvent être configurés ultérieurement via l\'édition'],
      ['- Taille maximale du fichier: 5 MB']
    ];

    const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
    wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chirurgiens');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Modele_Import_Chirurgiens.xlsx"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error("Error generating template:", error);
    res.redirect('/surgeons?error=' + encodeURIComponent('Erreur lors de la génération du modèle Excel'));
  }
};
