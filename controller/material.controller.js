const Material = require("../models/Material");
const Specialty = require("../models/Specialty");
// Liste des matériaux
module.exports.materialList = async (req, res) => {
  try {
    const category = req.query.category || "";
    const search = req.query.search || "";

    let query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { designation: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const materials = await Material.find(query)
      .populate("specialty")
      .sort({ designation: 1 });

    res.render("materials/index", {
      title: "Gestion des Matériaux",
      materials,
      filters: { category, search },
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Nouveau matériau
module.exports.renderCreateMateirialForm = async (req, res) => {
  try {
    console.log("Rendering new material form");
    const specialties = await Specialty.find().sort({ name: 1 });
    console.log("Specialties:", specialties);
    res.render("materials/new", {
      title: "Nouveau Matériau",
      material: {},
      specialties,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.createMaterial = async (req, res) => {
  try {
    const material = new Material(req.body);
    await material.save();
    res.redirect("/materials?success=Matériau créé avec succès");
  } catch (error) {
    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("materials/new", {
      title: "Nouveau Matériau",
      material: req.body,
      specialties,
      error: "Erreur lors de la création",
    });
  }
};
// Ajouter arrivage
module.exports.createMaterialArrival = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }

    const arrival = {
      date: new Date(req.body.date),
      quantity: parseInt(req.body.quantity),
      unitPrice: parseFloat(req.body.unitPrice),
    };

    material.arrivals.push(arrival);
    material.stock += arrival.quantity;
    await material.save();

    res.redirect(`/materials/${req.params.id}?success=Arrivage ajouté`);
  } catch (error) {
    res.redirect(`/materials/${req.params.id}?error=Erreur lors de l'ajout`);
  }
};
module.exports.renderEditMaterialForm = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }
    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("materials/edit", {
      title: "Modifier Matériau",
      material,
      specialties,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.updateMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }
    Object.assign(material, req.body);
    await material.save();
    res.redirect(`/materials?success=Matériau modifié`);
  } catch (error) {
    res.redirect(`/materials?error=Erreur lors de la modification`);
  }
};
module.exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }
    res.redirect("/materials?success=Matériau supprimé");
  } catch (error) {
    res.redirect("/materials?error=Erreur lors de la suppression");
  }
};
module.exports.showMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).populate("specialty");
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    } 
    res.render("materials/show", {
      title: "Détails du Matériau",
      material,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};




