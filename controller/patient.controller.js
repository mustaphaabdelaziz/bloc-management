const Patient = require("../models/Patient");
const Surgery = require("../models/Surgery");
module.exports.patientList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { code: { $regex: search, $options: "i" } },
            { nin: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const patients = await Patient.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPatients = await Patient.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalPatients / limit);

    res.render("patient/index", {
      title: "Gestion des Patients",
      patients,
      currentPage: page,
      totalPages,
      search,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    console.error("Erreur liste patients:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.renderCreatePatientForm = (req, res) => {
  res.render("patient/new", {
    title: "Nouveau Patient",
    patient: {},
  });
};

module.exports.createPatient = async (req, res) => {
  try {

    const patient = new Patient(req.body);
    await patient.save({ validateBeforeSave: false });
    res.redirect("/patients?success=Patient créé avec succès");
  } catch (error) {
    console.error("Erreur création patient:", error);
    res.render("patient/new", {
      title: "Nouveau Patient",
      patient: req.body,
      error: "Erreur lors de la création du patient",
    });
  }
};
module.exports.showPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).render("404", { title: "Patient non trouvé" });
    }

    // Récupérer les chirurgies du patient

    const surgeries = await Surgery.find({ patient: patient._id })
      .populate("surgeon", "firstName lastName")
      .populate("prestation", "designation")
      .sort({ beginDateTime: -1 });

    res.render("patient/show", {
      title: `Patient: ${patient.firstName} ${patient.lastName}`,
      patient,
      surgeries,
    });
  } catch (error) {
    console.error("Erreur affichage patient:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

module.exports.renderEditPatientForm = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).render("404", { title: "Patient non trouvé" });
    }
    res.render("patient/edit", {
      title: "Modifier Patient",
      patient,
    });
  } catch (error) {
    console.error("Erreur formulaire édition patient:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.updatePatient = async (req, res) => {
  try {
    await Patient.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(
      `/patients/${req.params.id}?success=Patient modifié avec succès`
    );
  } catch (error) {
    console.error("Erreur mise à jour patient:", error);
    const patient = await Patient.findById(req.params.id);
    res.render("patient/edit", {
      title: "Modifier Patient",
      patient: { ...patient.toObject(), ...req.body },
      error: "Erreur lors de la modification",
    });
  }
};

module.exports.deletePatient = async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.redirect("/patients?success=Patient supprimé avec succès");
  } catch (error) {
    console.error("Erreur suppression patient:", error);
    res.redirect("/patients?error=Erreur lors de la suppression");
  }
};
