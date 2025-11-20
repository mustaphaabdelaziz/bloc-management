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

    // Check if user can see contract information
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canSeeContractInfo = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    // Filter out contract data for headDepart and assistante users
    const filteredSurgeons = canSeeContractInfo ? surgeons : surgeons.map(s => ({
      ...s.toObject(),
      contractType: undefined,
      allocationRate: undefined,
      percentageRate: undefined
    }));

    res.render("surgeons/index", {
      title: "Gestion des Chirurgiens",
      surgeons: filteredSurgeons,
      canSeeContractInfo,
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
    const { firstname, lastname, email, phone, speciality, degree, contractType, allocationRate, percentageRate, code, autoGenerate } = req.body;

    // Validation
    if (!firstname || !lastname || !speciality || !contractType) {
      return res.status(400).render("surgeons/new", {
        title: "Ajouter un Chirurgien",
        error: "Tous les champs requis doivent être remplis",
        specialties: await Specialty.find({}),
      });
    }

    // Handle code generation
    let finalCode = "";

    if (autoGenerate || !code) {
      // Auto-generate code in SR-XXXXX format
      const allSurgeons = await Surgeon.find({ code: /^SR-\d{5}$/ }).sort({ code: -1 });
      
      let nextNumber = 1;
      if (allSurgeons.length > 0) {
        const lastCode = allSurgeons[0].code;
        const match = lastCode.match(/^SR-(\d{5})$/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }
      
      finalCode = `SR-${nextNumber.toString().padStart(5, "0")}`;
    } else {
      // Manual code entry - validate format SR-XXXXX
      if (!/^SR-\d{5}$/.test(code)) {
        return res.status(400).render("surgeons/new", {
          title: "Ajouter un Chirurgien",
          error: "Le code doit être au format SR-XXXXX (ex: SR-00001)",
          specialties: await Specialty.find({}),
        });
      }
      finalCode = code;
    }

    // Check if code already exists
    const existingCode = await Surgeon.findOne({ code: finalCode });
    if (existingCode) {
      return res.status(400).render("surgeons/new", {
        title: "Ajouter un Chirurgien",
        error: "Ce code de chirurgien existe déjà",
        specialties: await Specialty.find({}),
      });
    }

    // Create surgeon
    const surgeonData = {
      ...req.body,
      code: finalCode
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

    // Check if user can see contract information
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canSeeContractInfo = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    const surgeries = await Surgery.find({ surgeon: surgeon._id })
      .populate("patient", "firstName lastName")
      .populate("prestation", "designation")
      .sort({ beginDateTime: -1 });

    res.render("surgeons/show", {
      title: `Chirurgien: Dr. ${surgeon.firstName} ${surgeon.lastName}`,
      surgeon,
      surgeries,
      canSeeContractInfo,
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

// API endpoint to get next surgeon code (SR-XXXXX format)
module.exports.getNextCode = async (req, res) => {
  try {
    // Find all surgeons and extract the highest number from codes starting with SR-
    const allSurgeons = await Surgeon.find({ code: /^SR-\d{5}$/ }).sort({ code: -1 });
    
    let nextNumber = 1;
    
    if (allSurgeons.length > 0) {
      // Extract number from last code (e.g., "SR-00001" -> 1)
      const lastCode = allSurgeons[0].code;
      const match = lastCode.match(/^SR-(\d{5})$/);
      if (match) {
        const lastNumber = parseInt(match[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }
    
    // Format the new code
    const newCode = `SR-${nextNumber.toString().padStart(5, '0')}`;
    
    res.json({ code: newCode });
  } catch (error) {
    console.error('Error generating surgeon code:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du code' });
  }
};
