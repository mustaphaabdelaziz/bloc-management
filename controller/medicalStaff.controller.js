const MedicalStaff = require("../models/MedicalStaff");
const Fonction = require("../models/Fonction");
const Surgery = require("../models/Surgery");

module.exports.medicalStaffList = async (req, res) => {
  try {
    const medicalStaff = await MedicalStaff.find()
      .populate("fonctions")
      .populate('createdBy', 'firstname lastname')
      .populate('updatedBy', 'firstname lastname')
      .sort({ lastName: 1 });
    res.render("medicalStaff/index", {
      title: "Personnel Médical",
      medicalStaff,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.renderMedicalStaffForm = async (req, res) => {
  try {
    const fonctions = await Fonction.find().sort({ name: 1 });
    res.render("medicalStaff/new", {
      title: "Nouveau Personnel Médical",
      staff: {},
      fonctions,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.createMedicalStaff = async (req, res) => {
  try {
    const staffData = req.body;
    if (req.body.fonctions && !Array.isArray(req.body.fonctions)) {
      staffData.fonctions = [req.body.fonctions];
    }
    const staff = new MedicalStaff(staffData);
    staff.createdBy = req.user._id;
    staff.updatedBy = req.user._id;
    await staff.save();
    res.redirect("/medical-staff?success=Personnel ajouté avec succès");
  } catch (error) {
    const fonctions = await Fonction.find().sort({ name: 1 });
    res.render("medicalStaff/new", {
      title: "Nouveau Personnel Médical",
      staff: req.body,
      fonctions,
      error: "Erreur lors de la création",
    });
  }
};
module.exports.deleteMedicalStaff = async (req, res) => {
  try {
    const staffId = req.params.id;

    // Check if medical staff is used in any surgery
    const surgeriesCount = await Surgery.countDocuments({
      "medicalStaff.staff": staffId,
    });

    if (surgeriesCount > 0) {
      return res.redirect(
        `/medical-staff?error=Ce personnel ne peut pas être supprimé car il est utilisé dans ${surgeriesCount} chirurgie(s)`
      );
    }

    await MedicalStaff.findByIdAndDelete(staffId);
    res.redirect("/medical-staff?success=Personnel supprimé avec succès");
  } catch (error) {
    res.redirect("/medical-staff?error=Erreur lors de la suppression");
  }
};
module.exports.renderEditMedicalStaffForm = async (req, res) => {
  try {
    const staff = await MedicalStaff.findById(req.params.id);
    if (!staff) {
      return res
        .status(404)
        .render("error", { title: "Erreur", error: "Personnel non trouvé" });
    }
    const fonctions = await Fonction.find().sort({ name: 1 });
    res.render("medicalStaff/edit", {
      title: "Modifier Personnel Médical",
      staff,
      fonctions,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.updateMedicalStaff = async (req, res) => {
  try {
    const staffData = req.body;
    if (req.body.fonctions && !Array.isArray(req.body.fonctions)) {
      staffData.fonctions = [req.body.fonctions];
    }
    staffData.updatedBy = req.user._id;
    await MedicalStaff.findByIdAndUpdate(req.params.id, staffData);
    res.redirect("/medical-staff?success=Personnel modifié avec succès");
  } catch (error) {
    const staff = await MedicalStaff.findById(req.params.id);
    const fonctions = await Fonction.find().sort({ name: 1 });
    res.render("medicalStaff/edit", {
      title: "Modifier Personnel Médical",
      staff,
      fonctions,
      error: "Erreur lors de la modification",
    });
  }
};
module.exports.showMedicalStaff = async (req, res) => {
  try {
    const staff = await MedicalStaff.findById(req.params.id).populate(
      "fonctions"
    );
    if (!staff) {
      return res
        .status(404)
        .render("error", { title: "Erreur", error: "Personnel non trouvé" });
    }
    
    // Fetch surgeries where this medical staff member is involved
    const Surgery = require("../models/Surgery");
    const surgeries = await Surgery.find({
      "medicalStaff.staff": req.params.id
    })
      .populate("patient")
      .populate("surgeon")
      .populate("prestation")
      .sort({ beginDateTime: -1 });
    
    res.render("medicalStaff/show", {
      title: `Détails: ${staff.firstName} ${staff.lastName}`,
      staff,
      surgeries,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.importMedicalStaff = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/medical-staff?error=Aucun fichier uploadé");
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!data || data.length === 0) {
      return res.redirect("/medical-staff?error=Le fichier Excel est vide");
    }

    // Get all fonctions for lookup
    const fonctions = await Fonction.find();
    const fonctionMap = {};
    fonctions.forEach(f => {
      fonctionMap[f.name.toLowerCase().trim()] = f._id;
    });

    const results = { imported: 0, failed: 0, errors: [] };

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
        const dateOfBirth = normalizedRow['date de naissance'] || normalizedRow['date de naissance'] || normalizedRow['dateofbirth'] || '';
        const phone = normalizedRow['téléphone'] || normalizedRow['telephone'] || normalizedRow['phone'] || '';
        const fonctionName = normalizedRow['fonction'] || '';
        const personalFee = normalizedRow['frais personnels'] || normalizedRow['personalfee'] || '0';

        const errors = [];

        if (!firstName || firstName.trim() === '') errors.push('Prénom manquant');
        if (!lastName || lastName.trim() === '') errors.push('Nom manquant');

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

        // Parse date (optional)
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

        // Parse personal fee
        const fee = isNaN(parseFloat(personalFee)) ? 0 : parseFloat(personalFee);

        // Prepare staff data
        const staffData = {
          code: code && code.trim() !== '' ? code.trim() : undefined,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dob,
          phone: phone ? phone.trim() : '',
          personalFee: fee
        };

        // Add fonction if provided
        if (fonctionName && fonctionName.trim() !== '') {
          const fonctionId = fonctionMap[fonctionName.toLowerCase().trim()];
          if (fonctionId) {
            staffData.fonctions = [fonctionId];
          } else {
            results.failed++;
            results.errors.push({
              row: rowNum,
              firstName: firstName,
              lastName: lastName,
              messages: [`Fonction "${fonctionName}" non trouvée`]
            });
            continue;
          }
        }

        const staff = new MedicalStaff(staffData);
        await staff.save();
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

    res.render("medicalStaff/import-results", { 
      title: "Résultats de l'Import", 
      results, 
      totalRows: data.length 
    });

  } catch (error) {
    console.error("Error in importMedicalStaff:", error);
    res.redirect(`/medical-staff?error=${encodeURIComponent('Erreur lors du traitement du fichier: ' + error.message)}`);
  }
};

module.exports.downloadMedicalStaffTemplate = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    // Get fonctions for template instructions
    const allFonctions = await Fonction.find().limit(10);
    const fonctionNames = allFonctions.map(f => f.name).join(', ');

    const worksheetData = [
      ['Code', 'Prénom', 'Nom', 'Date de Naissance', 'Téléphone', 'Fonction', 'Frais Personnels'],
      ['MED001', 'Jean', 'Dupont', '1980-05-15', '0123456789', fonctionNames.split(', ')[0] || 'Chirurgien', '500'],
      ['MED002', 'Marie', 'Martin', '1985-08-22', '0987654321', fonctionNames.split(', ')[1] || 'Infirmière', '300'],
      ['MED003', 'Pierre', 'Bernard', '1978-11-30', '0555555555', fonctionNames.split(', ')[2] || 'Anesthésiste', '600']
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];

    const notesData = [
      ['INSTRUCTIONS POUR L\'IMPORT DU PERSONNEL MÉDICAL'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['Code', 'Identifiant unique du personnel'],
      ['Prénom', 'Prénom de la personne'],
      ['Nom', 'Nom de famille de la personne'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['Date de Naissance', 'Format: YYYY-MM-DD (ex: 1980-05-15)'],
      ['Téléphone', 'Numéro de téléphone'],
      ['Fonction', 'Fonction médicale (ex: Chirurgien, Infirmière)'],
      ['Frais Personnels', 'Frais horaires en DA (défaut: 0)'],
      [''],
      ['FONCTIONS DISPONIBLES:'],
      [fonctionNames || 'Veuillez créer des fonctions dans le système'],
      [''],
      ['REMARQUES IMPORTANTES:'],
      ['- Si fournie, la date de naissance doit être au format YYYY-MM-DD'],
      ['- Les frais personnels doivent être des nombres positifs'],
      ['- La fonction doit correspondre exactement à une fonction existante'],
      ['- Taille maximale du fichier: 5 MB']
    ];

    const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
    wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personnel');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Modele_Import_Personnel_Medical.xlsx"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error("Error generating template:", error);
    res.redirect('/medical-staff?error=' + encodeURIComponent('Erreur lors de la génération du modèle Excel'));
  }
};
