const Surgery = require("../models/Surgery");
const Patient = require("../models/Patient");
const Surgeon = require("../models/Surgeon");
const MedicalStaff = require("../models/MedicalStaff");
const Material = require("../models/Material");
// Dashboard principal
module.exports.dashboard = async (req, res) => {
  try {
    // Statistiques générales
    const totalPatients = await Patient.countDocuments();
    const totalSurgeons = await Surgeon.countDocuments();
    const totalMedicalStaff = await MedicalStaff.countDocuments();
    const totalSurgeries = await Surgery.countDocuments();

    // Chirurgies récentes - filter by user role
    let recentSurgeriesQuery = {};
    if (req.user && req.user.privileges) {
      // If user is medecin, only show their surgeries
      if (req.user.privileges.includes('medecin') &&
          !req.user.privileges.includes('admin') &&
          !req.user.privileges.includes('chefBloc')) {
        const Surgeon = require("../models/Surgeon");
        const surgeon = await Surgeon.findOne({ email: req.user.email });
        if (surgeon) {
          recentSurgeriesQuery.surgeon = surgeon._id;
        }
      }
    }

    const recentSurgeries = await Surgery.find(recentSurgeriesQuery)
      .populate("patient", "firstName lastName code")
      .populate("surgeon", "firstName lastName")
      .populate("prestation", "designation")
      .sort({ createdAt: -1 })
      .limit(5);

    // Chirurgies du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySurgeries = await Surgery.find({
      incisionTime: {
        $gte: today,
        $lt: tomorrow,
      },
    }).populate("patient surgeon prestation");

    // Matériels en rupture de stock
    const lowStockMaterials = await Material.find({
      stock: { $lte: 10 },
    }).limit(5);

    // Chirurgies par statut
    const surgeryStatusStats = await Surgery.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.render("dashboard", {
      title: "Tableau de bord - Gestion Bloc Opératoire",
      currentUser: req.user, // Pass the authenticated user to the template
      stats: {
        totalPatients,
        totalSurgeons,
        totalMedicalStaff,
        totalSurgeries,
      },
      recentSurgeries,
      todaySurgeries,
      lowStockMaterials,
      surgeryStatusStats,
    });
  } catch (error) {
    console.error("Erreur dashboard:", error);
    res.status(500).render("error", {
      title: "Erreur",
      error: "Erreur lors du chargement du tableau de bord",
    });
  }
};

