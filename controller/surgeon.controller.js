// Liste des chirurgiens
const Surgeon = require("../models/Surgeon");
const Specialty = require("../models/Specialty");
const Surgery = require("../models/Surgery");
const Patient = require("../models/Patient");
const Prestation = require("../models/Prestation");

module.exports.surgeonList = async (req, res) => {
  try {
    const surgeons = await Surgeon.find()
      .populate("specialty")
      .sort({ lastName: 1 });
    res.render("surgeons/index", {
      title: "Gestion des Chirurgiens",
      surgeons,
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
    // Auto-generate surgeon code
    const specialty = await Specialty.findById(req.body.specialty);
    if (!specialty) {
      const specialties = await Specialty.find().sort({ name: 1 });
      return res.render("surgeons/new", {
        title: "Nouveau Chirurgien",
        surgeon: req.body,
        specialties,
        error: "Spécialité non trouvée",
      });
    }

    // Generate code in format: S-SPECIALTYCODE-XXXX
    const specialtyCode = specialty.code ? specialty.code.toUpperCase() : 'UNK';
    const baseCode = `S-${specialtyCode}-`;

    // Find the highest existing number for this specialty
    const lastSurgeon = await Surgeon.findOne({
      code: new RegExp(`^${baseCode}\\d{4}$`)
    }).sort({ code: -1 });

    let nextNumber = 1;
    if (lastSurgeon) {
      const codeParts = lastSurgeon.code.split('-');
      if (codeParts.length === 3) {
        const lastNumber = parseInt(codeParts[2]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    const generatedCode = `${baseCode}${nextNumber.toString().padStart(4, '0')}`;

    // Create surgeon with auto-generated code
    const surgeonData = {
      ...req.body,
      code: generatedCode
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

    const surgeries = await Surgery.find({ surgeon: surgeon._id })
      .populate("patient", "firstName lastName")
      .populate("prestation", "designation")
      .sort({ beginDateTime: -1 });

    res.render("surgeons/show", {
      title: `Chirurgien: Dr. ${surgeon.firstName} ${surgeon.lastName}`,
      surgeon,
      surgeries,
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
    await Surgeon.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/surgeons?success=Chirurgien modifié avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.deleteSurgeon = async (req, res) => {
  try {
    await Surgeon.findByIdAndDelete(req.params.id);
    res.redirect("/surgeons?success=Chirurgien supprimé avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
