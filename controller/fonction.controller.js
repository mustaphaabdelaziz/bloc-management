// routes/fonctions.js
const Fonction = require("../models/Fonction");

module.exports.fonctionlist = async (req, res) => {
  try {
    const fonctions = await Fonction.find().sort({ name: 1 });
    res.render("fonctions/index", {
      title: "Gestion des Fonctions",
      fonctions,
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
    await Fonction.findByIdAndDelete(req.params.id);
    res.redirect("/fonctions?success=Fonction supprimée avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
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
    await Fonction.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/fonctions?success=Fonction modifiée avec succès");
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};  
