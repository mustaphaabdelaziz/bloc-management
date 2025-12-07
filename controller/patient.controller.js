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
      .populate('createdBy', 'firstname lastname')
      .populate('updatedBy', 'firstname lastname')
      .sort({ lastName: 1 })
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
    // Normalize presumed age/year fields
    const patientData = { ...req.body };
    
    // Remove empty string values and normalize
    Object.keys(patientData).forEach(key => {
      if (patientData[key] === '' || patientData[key] === undefined) {
        delete patientData[key];
      }
    });
    
    // If full birthdate is provided, clear presumed fields
    if (patientData.dateOfBirth) {
      delete patientData.presumedAge;
      delete patientData.birthdatePresumed;
      delete patientData.presumedYear;
    } 
    // If presumed year is provided, convert to Date (Jan 1st)
    else if (patientData.presumedYear) {
      const year = parseInt(patientData.presumedYear);
      if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
        patientData.birthdatePresumed = new Date(year, 0, 1);
        patientData.presumedAge = new Date().getFullYear() - year;
      }
      delete patientData.presumedYear;
      delete patientData.dateOfBirth;
    }
    // If presumed age is provided, calculate year
    else if (patientData.presumedAge) {
      const age = parseInt(patientData.presumedAge);
      if (!isNaN(age) && age >= 0 && age <= 120) {
        const year = new Date().getFullYear() - age;
        patientData.birthdatePresumed = new Date(year, 0, 1);
      }
      delete patientData.dateOfBirth;
    }

    console.log("Creating patient with data:", patientData);
    const patient = new Patient(patientData);
    patient.createdBy = req.user._id;
    patient.updatedBy = req.user._id;
    await patient.save({ validateBeforeSave: false });
    console.log("Patient created successfully:", patient._id);
    res.redirect("/patients?success=Patient créé avec succès");
  } catch (error) {
    console.error("Erreur création patient:", error.message);
    console.error("Error details:", error);
    res.render("patient/new", {
      title: "Nouveau Patient",
      patient: req.body,
      error: "Erreur lors de la création du patient: " + error.message,
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
    // Normalize presumed age/year fields
    const patientData = { ...req.body };
    
    // If full birthdate is provided, clear presumed fields
    if (patientData.dateOfBirth) {
      patientData.presumedAge = undefined;
      patientData.birthdatePresumed = undefined;
      delete patientData.presumedYear;
    } 
    // If presumed year is provided, convert to Date (Jan 1st)
    else if (patientData.presumedYear) {
      const year = parseInt(patientData.presumedYear);
      if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
        patientData.birthdatePresumed = new Date(year, 0, 1);
        patientData.presumedAge = new Date().getFullYear() - year;
      }
      delete patientData.presumedYear;
      patientData.dateOfBirth = undefined;
    }
    // If presumed age is provided, calculate year
    else if (patientData.presumedAge) {
      const age = parseInt(patientData.presumedAge);
      if (!isNaN(age) && age >= 0 && age <= 120) {
        const year = new Date().getFullYear() - age;
        patientData.birthdatePresumed = new Date(year, 0, 1);
      }
      patientData.dateOfBirth = undefined;
    }

    patientData.updatedBy = req.user._id;
    await Patient.findByIdAndUpdate(req.params.id, patientData);
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
    const patientId = req.params.id;

    // Check if patient is used in any surgery
    const surgeriesCount = await Surgery.countDocuments({
      patient: patientId,
    });

    if (surgeriesCount > 0) {
      return res.redirect(
        `/patients?error=Ce patient ne peut pas être supprimé car il est utilisé dans ${surgeriesCount} chirurgie(s)`
      );
    }

    await Patient.findByIdAndDelete(patientId);
    res.redirect("/patients?success=Patient supprimé avec succès");
  } catch (error) {
    console.error("Erreur suppression patient:", error);
    res.redirect("/patients?error=Erreur lors de la suppression");
  }
};
