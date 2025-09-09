const Specialty = require("../models/Specialty");

module.exports.specialityList = async (req, res) => {
  try {
    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("specialties/index", {
      title: "Gestion des Spécialités",
      specialties,
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
    await Specialty.findByIdAndDelete(req.params.id);
    res.redirect("/specialties?success=Spécialité supprimée avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
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
    await Specialty.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/specialties?success=Spécialité modifiée avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
