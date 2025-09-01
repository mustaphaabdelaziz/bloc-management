const Surgery = require("../models/Surgery");
const Surgeon = require("../models/Surgeon");
const MedicalStaff = require("../models/MedicalStaff");
const moment = require("moment");
// Page principale des rapports
module.exports.mainPageReports = (req, res) => {
  res.render("reports/index", {
    title: "Rapports et Analyses",
  });
};

// Rapport des honoraires des chirurgiens
module.exports.surgeonFeesReport = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();
    const surgeonId = req.query.surgeonId || "";

    let matchQuery = {
      beginDateTime: {
        $gte: startDate,
        $lte: endDate,
      },
      status: "completed",
    };

    if (surgeonId) {
      matchQuery.surgeon = surgeonId;
    }
    console.log("Match query:", matchQuery);
    const surgeonFeesReport = await Surgery.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "surgeons",
          localField: "surgeon",
          foreignField: "_id",
          as: "surgeonInfo",
        },
      },
      {
        $lookup: {
          from: "prestations",
          localField: "prestation",
          foreignField: "_id",
          as: "prestationInfo",
        },
      },
      {
        $unwind: "$surgeonInfo",
      },
      {
        $unwind: "$prestationInfo",
      },
      {
        $group: {
          _id: "$surgeon",
          surgeonName: {
            $first: {
              $concat: ["$surgeonInfo.firstName", " ", "$surgeonInfo.lastName"],
            },
          },
          contractType: { $first: "$surgeonInfo.contractType" },
          totalSurgeries: { $sum: 1 },
          totalAmount: { $sum: "$surgeonAmount" },
          surgeries: {
            $push: {
              code: "$code",
              date: "$beginDateTime",
              prestationName: "$prestationInfo.designation",
              amount: "$surgeonAmount",
            },
          },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);
    console.log("Surgeon fees report:", surgeonFeesReport);
    const surgeons = await Surgeon.find().sort({ lastName: 1 });

    res.render("reports/surgeon-fees", {
      title: "Rapport des Honoraires des Chirurgiens",
      report: surgeonFeesReport,
      filters: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        surgeonId,
      },
      surgeons,
    });
  } catch (error) {
    console.error("Erreur rapport honoraires:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Rapport d'activité du personnel médical
module.exports.medicalStaffActivityReport = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();
    const staffId = req.query.staffId || "";

    let matchQuery = {
      beginDateTime: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (staffId) {
      matchQuery["medicalStaff.staff"] = staffId;
    }

    const staffActivityReport = await Surgery.aggregate([
      { $match: matchQuery },
      { $unwind: "$medicalStaff" },
      {
        $lookup: {
          from: "medicalstaffs",
          localField: "medicalStaff.staff",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      {
        $lookup: {
          from: "fonctions",
          localField: "medicalStaff.rolePlayedId",
          foreignField: "_id",
          as: "roleInfo",
        },
      },
      {
        $unwind: "$staffInfo",
      },
      {
        $unwind: "$roleInfo",
      },
      {
        $group: {
          _id: "$medicalStaff.staff",
          staffName: {
            $first: {
              $concat: ["$staffInfo.firstName", " ", "$staffInfo.lastName"],
            },
          },
          totalSurgeries: { $sum: 1 },
          roles: { $addToSet: "$roleInfo.name" },
          surgeries: {
            $push: {
              code: "$code",
              date: "$beginDateTime",
              role: "$roleInfo.name",
            },
          },
        },
      },
      {
        $sort: { totalSurgeries: -1 },
      },
    ]);

    const medicalStaff = await MedicalStaff.find().sort({ lastName: 1 });

    res.render("reports/medical-staff-activity", {
      title: "Rapport d'Activité du Personnel Médical",
      report: staffActivityReport,
      filters: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        staffId,
      },
      medicalStaff,
    });
  } catch (error) {
    console.error("Erreur rapport personnel:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Rapport de consommation des matériaux
module.exports.materialConsumptionReport = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    const materialConsumptionReport = await Surgery.aggregate([
      {
        $match: {
          beginDateTime: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      { $unwind: "$consumedMaterials" },
      {
        $lookup: {
          from: "materials",
          localField: "consumedMaterials.material",
          foreignField: "_id",
          as: "materialInfo",
        },
      },
      {
        $unwind: "$materialInfo",
      },
      {
        $group: {
          _id: "$consumedMaterials.material",
          materialName: { $first: "$materialInfo.designation" },
          category: { $first: "$materialInfo.category" },
          unitOfMeasure: { $first: "$materialInfo.unitOfMeasure" },
          unitPrice: { $first: "$materialInfo.priceHT" },
          totalQuantity: { $sum: "$consumedMaterials.quantity" },
          totalValue: {
            $sum: {
              $multiply: [
                "$consumedMaterials.quantity",
                "$materialInfo.priceHT",
              ],
            },
          },
          usageCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalValue: -1 },
      },
    ]);

    res.render("reports/material-consumption", {
      title: "Rapport de Consommation des Matériaux",
      report: materialConsumptionReport,
      filters: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Erreur rapport matériaux:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Rapport statistiques générales
module.exports.statisticsReport = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    // Statistiques des chirurgies par statut
    const surgeriesByStatus = await Surgery.aggregate([
      {
        $match: {
          beginDateTime: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Chirurgies par spécialité
    const surgeriesBySpecialty = await Surgery.aggregate([
      {
        $match: {
          beginDateTime: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $lookup: {
          from: "prestations",
          localField: "prestation",
          foreignField: "_id",
          as: "prestationInfo",
        },
      },
      {
        $lookup: {
          from: "specialties",
          localField: "prestationInfo.specialty",
          foreignField: "_id",
          as: "specialtyInfo",
        },
      },
      {
        $unwind: "$specialtyInfo",
      },
      {
        $group: {
          _id: "$specialtyInfo._id",
          specialtyName: { $first: "$specialtyInfo.name" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Durée moyenne des chirurgies
    const avgDurations = await Surgery.aggregate([
      {
        $match: {
          beginDateTime: { $gte: startDate, $lte: endDate },
          endDateTime: { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          duration: {
            $divide: [
              { $subtract: ["$endDateTime", "$beginDateTime"] },
              60000, // Convertir en minutes
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" },
          minDuration: { $min: "$duration" },
          maxDuration: { $max: "$duration" },
        },
      },
    ]);

    res.render("reports/statistics", {
      title: "Statistiques Générales",
      filters: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      surgeriesByStatus,
      surgeriesBySpecialty,
      avgDurations: avgDurations[0] || {},
    });
  } catch (error) {
    console.error("Erreur rapport statistiques:", error);
    res.status(500).render("error", { title: "Erreur", error });
  }
};
