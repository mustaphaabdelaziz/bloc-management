const Surgery = require("../models/Surgery");
const Surgeon = require("../models/Surgeon");
const MedicalStaff = require("../models/MedicalStaff");
const moment = require("moment");
// Page principale des rapports
module.exports.mainPageReports = async (req, res) => {
    try {
        console.log('[REPORTS] Accès page principale rapports');
        
        // Test de données basiques
        const totalSurgeries = await Surgery.countDocuments();
        const totalSurgeons = await Surgeon.countDocuments();
        const totalStaff = await MedicalStaff.countDocuments();
        
        console.log('[REPORTS] Stats rapides:', {
            totalSurgeries,
            totalSurgeons,
            totalStaff
        });
        
        res.render('reports/index', {
            title: 'Rapports et Analyses'
        });
    } catch (error) {
        console.error('[REPORTS] Erreur page principale:', error);
        res.status(500).render('error', { title: 'Erreur', error });
    }
}

// Rapport des honoraires des chirurgiens
module.exports.surgeonFeesReport = async (req, res) => {
    try {
        console.log('[SURGEON-FEES] Début traitement');
        
        // Dates par défaut
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(2020, 0, 1);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const surgeonId = req.query.surgeonId || '';
        
        console.log('[SURGEON-FEES] Dates:', { startDate, endDate, surgeonId });
        
        // Test 1: Compter toutes les chirurgies
        const totalSurgeries = await Surgery.countDocuments();
        console.log('[SURGEON-FEES] Total chirurgies DB:', totalSurgeries);
        
        // Test 2: Compter chirurgies dans la période
        const surgeriesInPeriod = await Surgery.countDocuments({
            beginDateTime: { $gte: startDate, $lte: endDate }
        });
        console.log('[SURGEON-FEES] Chirurgies dans période:', surgeriesInPeriod);
        
        // Test 3: Compter chirurgies complétées
        const completedSurgeries = await Surgery.countDocuments({
            beginDateTime: { $gte: startDate, $lte: endDate },
            status: { $in: ['completed', 'in-progress', 'planned', 'urgent'] }
        });
        console.log('[SURGEON-FEES] Chirurgies actives:', completedSurgeries);
        
        // Test 4: Vérifier les relations
        const surgeriesWithRefs = await Surgery.find({
            beginDateTime: { $gte: startDate, $lte: endDate },
            status: { $in: ['completed', 'in-progress', 'planned', 'urgent'] }
        }).limit(5).populate('surgeon prestation');
        
        console.log('[SURGEON-FEES] Exemples avec refs:', 
            surgeriesWithRefs.map(s => ({
                code: s.code,
                surgeon: s.surgeon ? `${s.surgeon.firstName} ${s.surgeon.lastName}` : 'NULL',
                prestation: s.prestation ? s.prestation.designation : 'NULL',
                amount: s.surgeonAmount
            }))
        );
        
        // Requête principale simplifiée pour debug
        let matchQuery = {
            beginDateTime: { $gte: startDate, $lte: endDate },
            status: { $in: ['completed', 'in-progress', 'planned', 'urgent'] },
            surgeon: { $ne: null },
            prestation: { $ne: null }
        };
        
        if (surgeonId && mongoose.Types.ObjectId.isValid(surgeonId)) {
            matchQuery.surgeon = new mongoose.Types.ObjectId(surgeonId);
        }
        
        console.log('[SURGEON-FEES] Match query:', matchQuery);
        
        // Méthode alternative : Simple populate d'abord
        const surgeries = await Surgery.find(matchQuery)
            .populate('surgeon', 'firstName lastName contractType allocationRate percentageRate')
            .populate('prestation', 'designation')
            .limit(50); // Limiter pour debug
        
        console.log('[SURGEON-FEES] Chirurgies trouvées:', surgeries.length);
        
        // Grouper manuellement par chirurgien
        const surgeonReport = {};
        
        surgeries.forEach(surgery => {
            if (!surgery.surgeon) {
                console.log('[SURGEON-FEES] Chirurgie sans chirurgien:', surgery.code);
                return;
            }
            
            const surgeonKey = surgery.surgeon._id.toString();
            
            if (!surgeonReport[surgeonKey]) {
                surgeonReport[surgeonKey] = {
                    _id: surgery.surgeon._id,
                    surgeonName: `${surgery.surgeon.firstName} ${surgery.surgeon.lastName}`,
                    contractType: surgery.surgeon.contractType,
                    totalSurgeries: 0,
                    totalAmount: 0,
                    surgeries: []
                };
            }
            
            surgeonReport[surgeonKey].totalSurgeries++;
            surgeonReport[surgeonKey].totalAmount += surgery.surgeonAmount || 0;
            surgeonReport[surgeonKey].surgeries.push({
                code: surgery.code,
                date: surgery.beginDateTime,
                prestationName: surgery.prestation?.designation || 'N/A',
                amount: surgery.surgeonAmount || 0
            });
        });
        
        const report = Object.values(surgeonReport).sort((a, b) => b.totalAmount - a.totalAmount);
        
        console.log('[SURGEON-FEES] Rapport final:', report.length, 'chirurgiens');
        console.log('[SURGEON-FEES] Premier chirurgien exemple:', report[0]);
        
        // Récupérer tous les chirurgiens pour le filtre
        const surgeons = await Surgeon.find().sort({ lastName: 1 });
        
        res.render('reports/surgeon-fees', {
            title: 'Rapport des Honoraires des Chirurgiens',
            report,
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                surgeonId
            },
            surgeons
        });
        
    } catch (error) {
        console.error('[SURGEON-FEES] Erreur complète:', error);
        res.status(500).render('error', { 
            title: 'Erreur', 
            error: `Erreur rapport honoraires: ${error.message}` 
        });
    }
};


// Rapport d'activité du personnel médical
module.exports.medicalStaffActivityReport = async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const staffId = req.query.staffId || '';
        
        let matchQuery = {
            beginDateTime: {
                $gte: startDate,
                $lte: endDate
            }
        };
        
        if (staffId) {
            matchQuery['medicalStaff.staff'] = new mongoose.Types.ObjectId(staffId);
        }
        
        console.log('Medical staff match query:', matchQuery);
        
        const staffActivityReport = await Surgery.aggregate([
            { $match: matchQuery },
            { $unwind: '$medicalStaff' },
            {
                $lookup: {
                    from: 'medicalstaffs',
                    localField: 'medicalStaff.staff',
                    foreignField: '_id',
                    as: 'staffInfo'
                }
            },
            {
                $lookup: {
                    from: 'fonctions',
                    localField: 'medicalStaff.rolePlayedId',
                    foreignField: '_id',
                    as: 'roleInfo'
                }
            },
            {
                $unwind: {
                    path: '$staffInfo',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $unwind: {
                    path: '$roleInfo',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $group: {
                    _id: '$medicalStaff.staff',
                    staffName: {
                        $first: {
                            $concat: ['$staffInfo.firstName', ' ', '$staffInfo.lastName']
                        }
                    },
                    totalSurgeries: { $sum: 1 },
                    roles: { $addToSet: '$roleInfo.name' },
                    surgeries: {
                        $push: {
                            code: '$code',
                            date: '$beginDateTime',
                            role: '$roleInfo.name'
                        }
                    }
                }
            },
            {
                $sort: { totalSurgeries: -1 }
            }
        ]);
        
        console.log('Staff activity report:', staffActivityReport);
        
        const medicalStaff = await MedicalStaff.find().sort({ lastName: 1 });
        
        res.render('reports/medical-staff-activity', {
            title: 'Rapport d\'Activité du Personnel Médical',
            report: staffActivityReport,
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                staffId
            },
            medicalStaff
        });
    } catch (error) {
        console.error('Erreur rapport personnel:', error);
        res.status(500).render('error', { title: 'Erreur', error });
    }
};

// Rapport de consommation des matériaux
module.exports.materialConsumptionReport =async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        
        const materialConsumptionReport = await Surgery.aggregate([
            {
                $match: {
                    beginDateTime: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            { $unwind: '$consumedMaterials' },
            {
                $lookup: {
                    from: 'materials',
                    localField: 'consumedMaterials.material',
                    foreignField: '_id',
                    as: 'materialInfo'
                }
            },
            {
                $unwind: {
                    path: '$materialInfo',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $group: {
                    _id: '$consumedMaterials.material',
                    materialName: { $first: '$materialInfo.designation' },
                    category: { $first: '$materialInfo.category' },
                    unitOfMeasure: { $first: '$materialInfo.unitOfMeasure' },
                    unitPrice: { $first: '$materialInfo.priceHT' },
                    totalQuantity: { $sum: '$consumedMaterials.quantity' },
                    totalValue: {
                        $sum: {
                            $multiply: [
                                '$consumedMaterials.quantity',
                                '$materialInfo.priceHT'
                            ]
                        }
                    },
                    usageCount: { $sum: 1 }
                }
            },
            {
                $sort: { totalValue: -1 }
            }
        ]);
        
        console.log('Material consumption report:', materialConsumptionReport);
        
        res.render('reports/material-consumption', {
            title: 'Rapport de Consommation des Matériaux',
            report: materialConsumptionReport,
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error('Erreur rapport matériaux:', error);
        res.status(500).render('error', { title: 'Erreur', error });
    }
}

// Rapport statistiques générales
module.exports.statisticsReport = async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        console.log('Statistics query:', { startDate, endDate, page, limit });

        // Statistiques des chirurgies par statut
        const surgeriesByStatus = await Surgery.aggregate([
            {
                $match: {
                    beginDateTime: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
        
        // Chirurgies par spécialité
        const surgeriesBySpecialty = await Surgery.aggregate([
            {
                $match: {
                    beginDateTime: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $lookup: {
                    from: 'prestations',
                    localField: 'prestation',
                    foreignField: '_id',
                    as: 'prestationInfo'
                }
            },
            {
                $unwind: {
                    path: '$prestationInfo',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $lookup: {
                    from: 'specialties',
                    localField: 'prestationInfo.specialty',
                    foreignField: '_id',
                    as: 'specialtyInfo'
                }
            },
            {
                $unwind: {
                    path: '$specialtyInfo',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $group: {
                    _id: '$specialtyInfo._id',
                    specialtyName: { $first: '$specialtyInfo.name' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
        
        // Durée moyenne des chirurgies
        const avgDurations = await Surgery.aggregate([
            {
                $match: {
                    beginDateTime: { $gte: startDate, $lte: endDate },
                    endDateTime: { $exists: true, $ne: null }
                }
            },
            {
                $addFields: {
                    duration: {
                        $divide: [
                            { $subtract: ['$endDateTime', '$beginDateTime'] },
                            60000 // Convertir en minutes
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgDuration: { $avg: '$duration' },
                    minDuration: { $min: '$duration' },
                    maxDuration: { $max: '$duration' }
                }
            }
        ]);
        
        // Liste détaillée des chirurgies pour infinite scroll
        const skip = (page - 1) * limit;
        const detailedSurgeries = await Surgery.find({
            beginDateTime: { $gte: startDate, $lte: endDate }
        })
        .populate('patient', 'firstName lastName code')
        .populate('surgeon', 'firstName lastName')
        .populate('prestation', 'designation duration')
        .sort({ beginDateTime: -1 })
        .skip(skip)
        .limit(limit);
        
        const totalSurgeries = await Surgery.countDocuments({
            beginDateTime: { $gte: startDate, $lte: endDate }
        });
        
        const hasMore = (page * limit) < totalSurgeries;
        
        console.log('Statistics results:', {
            surgeriesByStatus: surgeriesByStatus.length,
            surgeriesBySpecialty: surgeriesBySpecialty.length,
            avgDurations: avgDurations.length,
            detailedSurgeries: detailedSurgeries.length,
            totalSurgeries,
            hasMore,
            page,
            limit
        });
        
        // Check if this is an AJAX request for infinite scroll
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({
                surgeries: detailedSurgeries,
                hasMore,
                page: page + 1
            });
        }
        
        res.render('reports/statistics', {
            title: 'Statistiques Générales',
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            },
            surgeriesByStatus,
            surgeriesBySpecialty,
            avgDurations: avgDurations[0] || {},
            detailedSurgeries,
            hasMore,
            currentPage: page,
            totalSurgeries
        });
    } catch (error) {
        console.error('Erreur rapport statistiques:', error);
        res.status(500).render('error', { title: 'Erreur', error });
    }
}
// module.exports = (fn) => {
//     return (req, res, next) => {
//         fn(req, res, next).catch(next);
//     };
// };
