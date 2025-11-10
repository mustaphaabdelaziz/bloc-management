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
    console.log('Creating material with data:', req.body);

    // Remove code from req.body since it will be auto-generated
    const materialData = { ...req.body };
    delete materialData.code;

    // Handle specialty field - can be array or single value
    console.log('Specialty field value:', materialData.specialty, 'Type:', typeof materialData.specialty, 'Length:', materialData.specialty ? materialData.specialty.length : 'N/A');

    if (materialData.specialty === '' || materialData.specialty === null || materialData.specialty === undefined) {
      console.log('Setting specialty to undefined');
      materialData.specialty = undefined;
    } else if (Array.isArray(materialData.specialty)) {
      // Filter out empty strings from array
      materialData.specialty = materialData.specialty.filter(s => s !== '' && s !== null && s !== undefined);
      if (materialData.specialty.length === 0) {
        materialData.specialty = undefined;
      }
      console.log('Filtered specialty array:', materialData.specialty);
    } else if (typeof materialData.specialty === 'string' && materialData.specialty.trim() === '') {
      materialData.specialty = undefined;
    }

    console.log('Material data after processing:', materialData);

    const material = new Material(materialData);
    console.log('Material instance created:', material);

    await material.save();
    console.log('Material saved successfully');

    res.redirect("/materials?success=Matériau créé avec succès");
  } catch (error) {
    console.error('Error creating material:', error);
    console.error('Error stack:', error.stack);

    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("materials/new", {
      title: "Nouveau Matériau",
      material: req.body,
      specialties,
      error: `Erreur lors de la création: ${error.message}`,
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
    
    // Remove code from update data since it should not be changed
    const updateData = { ...req.body };
    delete updateData.code;

    // Handle empty specialty field
    if (updateData.specialty === '') {
      updateData.specialty = undefined;
    }
    
    Object.assign(material, updateData);
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




