// routes/fonctions.js
const Fonction = require("../models/Fonction");
const Surgery = require("../models/Surgery");

module.exports.fonctionlist = async (req, res) => {
  try {
    const search = req.query.search || "";

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
        ],
      };
    }

    const fonctions = await Fonction.find(query)
      .populate('createdBy', 'firstname lastname')
      .populate('updatedBy', 'firstname lastname')
      .sort({ name: 1 });
    res.render("fonctions/index", {
      title: "Gestion des Fonctions",
      fonctions,
      filters: { search },
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.RenderfonctionForm = async (req, res) => {
  res.render("fonctions/new", {
    title: "Nouvelle Fonction",
    fonction: {},
  });
};

module.exports.createfonction = async (req, res) => {
  try {
    const fonction = new Fonction(req.body);
    fonction.createdBy = req.user._id;
    fonction.updatedBy = req.user._id;
    await fonction.save();
    res.redirect("/fonctions?success=Fonction créée avec succès");
  } catch (error) {
    res.render("fonctions/new", {
      title: "Nouvelle Fonction",
      fonction: req.body,
      error: error.message || "Erreur lors de la création",
    });
  }
};
module.exports.deletefonction = async (req, res) => {
  try {
    const fonctionId = req.params.id;

    // Check if fonction is used in any surgery's medical staff
    const surgeriesCount = await Surgery.countDocuments({
      "medicalStaff.rolePlayedId": fonctionId,
    });

    if (surgeriesCount > 0) {
      return res.redirect(
        `/fonctions?error=Cette fonction ne peut pas être supprimée car elle est utilisée dans ${surgeriesCount} chirurgie(s)`
      );
    }

    await Fonction.findByIdAndDelete(fonctionId);
    res.redirect("/fonctions?success=Fonction supprimée avec succès");
  } catch (error) {
    res.redirect("/fonctions?error=Erreur lors de la suppression");
  }
};

module.exports.renderEditfonctionForm = async (req, res) => { 
  try {
    const fonction = await Fonction.findById(req.params.id);
    res.render("fonctions/edit", {
      title: "Modifier Fonction",
      fonction,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.updatefonction = async (req, res) => {
  try {
    const updateData = { ...req.body, updatedBy: req.user._id };
    await Fonction.findByIdAndUpdate(req.params.id, updateData);
    res.redirect("/fonctions?success=Fonction modifiée avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.importFonctions = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/fonctions?error=Aucun fichier uploadé");
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!data || data.length === 0) {
      return res.redirect("/fonctions?error=Le fichier Excel est vide");
    }

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
        const name = normalizedRow['nom'] || normalizedRow['name'] || '';
        const description = normalizedRow['description'] || '';
        const errors = [];

        if (!code || code.trim() === '') errors.push('Code manquant');
        if (!name || name.trim() === '') errors.push('Nom manquant');

        if (errors.length > 0) {
          results.failed++;
          results.errors.push({ row: rowNum, code: code || 'N/A', name: name || 'N/A', messages: errors });
          continue;
        }

        const existingCode = await Fonction.findOne({ code: code.trim() });
        if (existingCode) {
          results.failed++;
          results.errors.push({ row: rowNum, code: code, name: name, messages: [`Code "${code}" existe déjà`] });
          continue;
        }

        const fonction = new Fonction({ code: code.trim(), name: name.trim(), description: description ? description.trim() : '' });
        fonction.createdBy = req.user._id;
        fonction.updatedBy = req.user._id;
        await fonction.save();
        results.imported++;

      } catch (error) {
        results.failed++;
        results.errors.push({ row: rowNum, code: row.code || 'N/A', name: row.nom || row.name || 'N/A', messages: [error.message] });
      }
    }

    res.render("fonctions/import-results", { title: "Résultats de l'Import", results, totalRows: data.length });
  } catch (error) {
    console.error("Error in importFonctions:", error);
    res.redirect(`/fonctions?error=${encodeURIComponent('Erreur lors du traitement du fichier: ' + error.message)}`);
  }
};

module.exports.downloadFonctionTemplate = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    const worksheetData = [
      ['Code', 'Nom', 'Description'],
      ['CHIRURGIEN', 'Chirurgien', 'Médecin spécialisé en chirurgie'],
      ['ANESTHESISTE', 'Anesthésiste', 'Spécialiste en anesthésiologie'],
      ['INFIRMIERE', 'Infirmière', 'Personnel infirmier de bloc opératoire'],
      ['AIDE-OP', 'Aide Opératoire', 'Aide technique au bloc opératoire'],
      ['MEDECIN-ANES', 'Médecin Anesthésiste', 'Médecin en anesthésie'],
      ['TECHNICIEN', 'Technicien Médical', 'Technicien en équipements médicaux']
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 50 }];

    const notesData = [
      ['INSTRUCTIONS POUR L\'IMPORT DES FONCTIONS'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['Code', 'Code unique et court pour la fonction'],
      ['Nom', 'Nom complet et lisible de la fonction'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['Description', 'Brève description de la fonction']
    ];

    const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
    wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fonctions');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Modele_Import_Fonctions.xlsx"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error("Error generating template:", error);
    res.redirect('/fonctions?error=' + encodeURIComponent('Erreur lors de la génération du modèle Excel'));
  }
};  
