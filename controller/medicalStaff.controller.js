const MedicalStaff = require("../models/MedicalStaff");
const Fonction = require("../models/Fonction");

module.exports.medicalStaffList = async (req, res) => {
  try {
    const medicalStaff = await MedicalStaff.find()
      .populate("fonctions")
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
    await MedicalStaff.findByIdAndDelete(req.params.id);
    res.redirect("/medical-staff?success=Personnel supprimé avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
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
    res.render("medicalStaff/show", {
      title: `Détails: ${staff.firstName} ${staff.lastName}`,
      staff,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
