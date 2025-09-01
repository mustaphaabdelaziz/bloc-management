// prestation.controller.js
const Prestation = require("../models/Prestation");
const Specialty = require("../models/Specialty");
const Surgery = require("../models/Surgery"); // FIX: Added missing import
const moment = require("moment");

// Liste des prestations
module.exports.prestationList = async (req, res) => {
  try {
    const prestations = await Prestation.find()
      .populate("specialty")
      .sort({ designation: 1 });

    res.render("prestations/index", {
      title: "Gestion des Prestations",
      prestations,
     
    });
  } catch (error) {
    console.error("Error in prestationList:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement des prestations",
    });
  }
};

// Nouvelle prestation
module.exports.renderPrestationForm = async (req, res) => {
  try {
    const specialties = await Specialty.find().sort({ name: 1 });

    res.render("prestations/new", {
      title: "Nouvelle Prestation",
      prestation: {},
      specialties,
      error: null,
    });
  } catch (error) {
    console.error("Error in renderPrestationForm:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement du formulaire",
    });
  }
};

// Ajouter prestation
module.exports.createPrestation = async (req, res) => {
  try {
    // Validate required fields
    const { code, designation, specialty, priceHT, duration } = req.body;

    if (!code || !designation || !specialty || !priceHT || !duration) {
      throw new Error("Tous les champs obligatoires doivent être remplis");
    }

    // Check if code already exists
    const existingPrestation = await Prestation.findOne({ code });
    if (existingPrestation) {
      throw new Error("Ce code de prestation existe déjà");
    }

    // Create new prestation with proper data types
    const prestationData = {
      code: code.trim().toUpperCase(),
      designation: designation.trim(),
      specialty,
      priceHT: parseFloat(priceHT),
      tva: req.body.tva ? parseFloat(req.body.tva) : 0.19,
      duration: parseInt(duration),
      exceededDurationUnit: req.body.exceededDurationUnit
        ? parseInt(req.body.exceededDurationUnit)
        : 15,
      exceededDurationFee: req.body.exceededDurationFee
        ? parseFloat(req.body.exceededDurationFee)
        : 0,
    };

    const prestation = new Prestation(prestationData);
    await prestation.save();

    res.redirect("/prestations?success=Prestation créée avec succès");
  } catch (error) {
    console.error("Error in createPrestation:", error);

    try {
      const specialties = await Specialty.find().sort({ name: 1 });
      res.status(400).render("prestations/new", {
        title: "Nouvelle Prestation",
        prestation: req.body,
        specialties,
        error: error.message || "Erreur lors de la création",
      });
    } catch (renderError) {
      res.status(500).render("error", {
        title: "Erreur",
        error: "Erreur lors de la création de la prestation",
      });
    }
  }
};

// Edit prestation form
module.exports.renderEditPrestationForm = async (req, res) => {
  try {
    const prestation = await Prestation.findById(req.params.id).populate(
      "specialty"
    );

    if (!prestation) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Prestation non trouvée",
      });
    }

    const specialties = await Specialty.find().sort({ name: 1 });

    res.render("prestations/edit", {
      title: "Modifier Prestation",
      prestation,
      specialties,
      error: null,
    });
  } catch (error) {
    console.error("Error in renderEditPrestationForm:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: error.message || "Erreur lors du chargement de la prestation",
    });
  }
};

// Update prestation
module.exports.updatePrestation = async (req, res) => {
  try {
    const prestationId = req.params.id;

    // Check if prestation exists
    const existingPrestation = await Prestation.findById(prestationId);
    if (!existingPrestation) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Prestation non trouvée",
      });
    }

    // Check if new code conflicts with another prestation
    if (req.body.code && req.body.code !== existingPrestation.code) {
      const codeExists = await Prestation.findOne({
        code: req.body.code.trim().toUpperCase(),
        _id: { $ne: prestationId },
      });

      if (codeExists) {
        throw new Error("Ce code de prestation est déjà utilisé");
      }
    }

    // Prepare update data with proper data types
    const updateData = {
      code: req.body.code
        ? req.body.code.trim().toUpperCase()
        : existingPrestation.code,
      designation: req.body.designation
        ? req.body.designation.trim()
        : existingPrestation.designation,
      specialty: req.body.specialty || existingPrestation.specialty,
      priceHT: req.body.priceHT
        ? parseFloat(req.body.priceHT)
        : existingPrestation.priceHT,
      tva:
        req.body.tva !== undefined
          ? parseFloat(req.body.tva)
          : existingPrestation.tva,
      duration: req.body.duration
        ? parseInt(req.body.duration)
        : existingPrestation.duration,
      exceededDurationUnit: req.body.exceededDurationUnit
        ? parseInt(req.body.exceededDurationUnit)
        : existingPrestation.exceededDurationUnit,
      exceededDurationFee:
        req.body.exceededDurationFee !== undefined
          ? parseFloat(req.body.exceededDurationFee)
          : existingPrestation.exceededDurationFee,
    };

    await Prestation.findByIdAndUpdate(prestationId, updateData, {
      runValidators: true,
      new: true,
    });

    res.redirect("/prestations?success=Prestation modifiée avec succès");
  } catch (error) {
    console.error("Error in updatePrestation:", error);

    try {
      const prestation = await Prestation.findById(req.params.id);
      const specialties = await Specialty.find().sort({ name: 1 });

      res.status(400).render("prestations/edit", {
        title: "Modifier Prestation",
        prestation: { ...prestation.toObject(), ...req.body },
        specialties,
        error: error.message || "Erreur lors de la modification",
      });
    } catch (renderError) {
      res.status(500).render("error", {
        title: "Erreur",
        error: "Erreur lors de la modification de la prestation",
      });
    }
  }
};

// Delete prestation
module.exports.deletePrestation = async (req, res) => {
  try {
    const prestationId = req.params.id;

    // Check if prestation is used in any surgery
    const surgeriesCount = await Surgery.countDocuments({
      prestation: prestationId,
    });

    if (surgeriesCount > 0) {
      return res.redirect(
        `/prestations?error=Cette prestation ne peut pas être supprimée car elle est utilisée dans ${surgeriesCount} chirurgie(s)`
      );
    }

    const prestation = await Prestation.findByIdAndDelete(prestationId);

    if (!prestation) {
      return res.redirect("/prestations?error=Prestation non trouvée");
    }

    res.redirect("/prestations?success=Prestation supprimée avec succès");
  } catch (error) {
    console.error("Error in deletePrestation:", error);
    res.redirect(
      "/prestations?error=Erreur lors de la suppression de la prestation"
    );
  }
};

// Show prestation details
module.exports.showPrestation = async (req, res) => {
  try {
    const prestationId = req.params.id;

    // Validate ObjectId format
    if (!prestationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render("error", {
        title: "Erreur",
        error: "ID de prestation invalide",
      });
    }

    // Fetch prestation with specialty populated
    const prestation =
      await Prestation.findById(prestationId).populate("specialty");

    if (!prestation) {
      return res.status(404).render("error", {
        title: "Erreur",
        error: "Prestation non trouvée",
      });
    }

    // Fetch related surgeries with populated references
    const surgeries = await Surgery.find({ prestation: prestationId })
      .populate("patient", "firstName lastName")
      .populate("surgeon", "firstName lastName")
      .sort({ beginDateTime: -1 })
      .limit(100); // Limit to prevent performance issues

    // Calculate additional statistics
    const stats = {
      totalSurgeries: surgeries.length,
      completedSurgeries: surgeries.filter((s) => s.actualDuration).length,
      averageDuration: 0,
      exceededCount: 0,
      thisMonthCount: 0,
      totalRevenue: 0,
    };

    if (stats.completedSurgeries > 0) {
      const completedSurgeries = surgeries.filter((s) => s.actualDuration);
      stats.averageDuration = Math.round(
        completedSurgeries.reduce((sum, s) => sum + s.actualDuration, 0) /
          stats.completedSurgeries
      );
      stats.exceededCount = completedSurgeries.filter(
        (s) => s.actualDuration > prestation.duration
      ).length;
    }

    // Count surgeries this month
    const startOfMonth = moment().startOf("month");
    stats.thisMonthCount = surgeries.filter((s) =>
      moment(s.beginDateTime).isSameOrAfter(startOfMonth)
    ).length;

    // Calculate total revenue (basic calculation)
    stats.totalRevenue =
      surgeries.length * prestation.priceHT * (1 + prestation.tva);

    res.render("prestations/show", {
      title: `Prestation: ${prestation.designation}`,
      prestation,
      surgeries,
      stats,
      moment,
      
    });
  } catch (error) {
    console.error("Error in showPrestation:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error:
        error.message ||
        "Erreur lors du chargement des détails de la prestation",
    });
  }
};
