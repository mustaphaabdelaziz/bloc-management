const Surgery = require("../models/Surgery");
const Surgeon = require("../models/Surgeon");
const MedicalStaff = require("../models/MedicalStaff");
const Material = require("../models/Material");
const mongoose = require("mongoose");
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
        res.status(500).render('errorHandling/error', { 
            statusCode: 'Erreur Serveur', 
            err: { message: error.message } 
        });
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
            incisionTime: { $gte: startDate, $lte: endDate }
        });
        console.log('[SURGEON-FEES] Chirurgies dans période:', surgeriesInPeriod);
        
        // Test 3: Compter chirurgies actives (urgentes et planifiées)
        const activeSurgeries = await Surgery.countDocuments({
            incisionTime: { $gte: startDate, $lte: endDate },
            status: { $in: ['planned', 'urgent'] }
        });
        console.log('[SURGEON-FEES] Chirurgies actives:', activeSurgeries);
        
        // Test 4: Vérifier les relations
        const surgeriesWithRefs = await Surgery.find({
            incisionTime: { $gte: startDate, $lte: endDate },
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
            incisionTime: { $gte: startDate, $lte: endDate },
            status: { $in: ['planned', 'urgent'] },
            surgeon: { $ne: null },
            prestation: { $ne: null }
        };
        
        if (surgeonId && mongoose.Types.ObjectId.isValid(surgeonId)) {
            matchQuery.surgeon = new mongoose.Types.ObjectId(surgeonId);
        }
        
        console.log('[SURGEON-FEES] Match query:', matchQuery);
        
        // Méthode alternative : Simple populate d'abord
        const surgeries = await Surgery.find(matchQuery)
            .populate('surgeon', 'firstName lastName contractType locationRate percentageRate')
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
                    surgeonName: `${surgery.surgeon.lastName} ${surgery.surgeon.firstName}`,
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
                date: surgery.incisionTime,
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
        res.status(500).render('errorHandling/error', {
            statusCode: 'Erreur Rapport Honoraires',
            err: { message: `Erreur rapport honoraires: ${error.message}` }
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
            incisionTime: {
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
                            date: '$incisionTime',
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
        res.status(500).render('errorHandling/error', { 
            statusCode: 'Erreur Rapport Personnel', 
            err: { message: error.message } 
        });
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
                    incisionTime: {
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
        res.status(500).render('errorHandling/error', { 
            statusCode: 'Erreur Rapport Matériaux', 
            err: { message: error.message } 
        });
    }
}

// Rapport de revenus cliniques séparés par type de contrat
module.exports.clinicRevenueReport = async (req, res) => {
    try {
        console.log('[CLINIC-REVENUE] Début traitement');

        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

        console.log('[CLINIC-REVENUE] Dates:', { startDate, endDate });

        // Récupérer toutes les chirurgies avec calculs de revenus
        // Use updatedAt as fallback if incisionTime is not set
        const surgeries = await Surgery.find({
            $or: [
                { incisionTime: { $gte: startDate, $lte: endDate } },
                { incisionTime: { $exists: false, $eq: null }, updatedAt: { $gte: startDate, $lte: endDate } }
            ],
            status: { $in: ['planned', 'urgent'] }
        })
        .populate('surgeon', 'firstName lastName contractType locationRate percentageRate')
        .populate('prestation', 'designation priceHT urgentFeePercentage')
        .populate('consumedMaterials.material', 'designation category priceHT weightedPrice')
        .populate('medicalStaff.staff', 'firstName lastName personalFee')
        .populate('medicalStaff.rolePlayedId', 'name');

        console.log('[CLINIC-REVENUE] Chirurgies trouvées:', surgeries.length);

        // Séparer les revenus par type de contrat
        const revenueByContractType = {
            location: {
                totalRevenue: 0,
                totalSurgeries: 0,
                details: [],
                breakdown: {
                    locationFees: 0,
                    materialCosts: 0,
                    personnelFees: 0,
                    urgentFees: 0,
                    extraFees: 0,
                    asaFees: 0
                }
            },
            percentage: {
                totalRevenue: 0,
                totalSurgeries: 0,
                details: [],
                breakdown: {
                    baseRevenue: 0,
                    urgentFees: 0,
                    extraFees: 0,
                    materialCosts: 0,
                    personnelFees: 0
                }
            }
        };

        // Calculer les revenus pour chaque chirurgie
        for (const surgery of surgeries) {
            if (!surgery.surgeon || !surgery.prestation) continue;

            const contractType = surgery.surgeon.contractType;
            const durationHours = surgery.actualDuration ? surgery.actualDuration / 60 : 0;

            if (contractType === 'location') {
                // Calcul pour contrat de location
                const locationCost = durationHours * (surgery.surgeon.locationRate || 0);
                // Note: quantity is in the material's unit of measure (meters, liters, pieces, etc.)
                // priceUsed is the frozen price per unit at the time of surgery
                const materialCost = surgery.consumedMaterials?.reduce((sum, mat) => {
                    if (!mat.material) return sum;
                    // Use frozen priceUsed if available, otherwise fallback to current price
                    const unitPrice = mat.priceUsed || mat.material.weightedPrice || mat.material.priceHT || 0;
                    return sum + (unitPrice * (mat.quantity || 0));
                }, 0) || 0;
                const personnelCost = surgery.medicalStaff?.reduce((sum, staff) => sum + (staff.staff?.personalFee * durationHours || 0), 0) || 0;
                // urgent fee is percentage-based; compute monetary urgent amount from prestation price
                const urgentFeeAmount = surgery.status === 'urgent' ? ((surgery.adjustedPrice || surgery.prestation.priceHT) * (surgery.prestation.urgentFeePercentage || 0)) : 0;

                // Calcul des frais supplémentaires
                let extraFees = 0;
                // For location method: always exclude extra fees, even if applyExtraFees is checked
                if (surgery.applyExtraFees && surgery.actualDuration > surgery.prestation.maxDuration && contractType !== 'location') {
                    const extraduration = surgery.actualDuration - surgery.prestation.maxDuration;
                    const threshold = surgery.prestation.exceededDurationUnit || 15;
                    if (extraduration >= threshold) {
                        extraFees = (surgery.prestation.exceededDurationFee || 0) * extraduration / threshold;
                    }
                }

                // Calculate ASA fee (flat fee for location contracts only)
                let asaFee = 0;
                if (surgery.asaClass) {
                    const AsaPricing = require('../models/AsaPricing');
                    const asaConfig = await AsaPricing.getPricingByClass(surgery.asaClass);
                    if (asaConfig) {
                        asaFee = asaConfig.fee || 0;
                    }
                }

                // For location method: clinic receives location cost + materials + personnel (personnel uplifted if urgent) + ASA fee
                const surgeonLocationAmount = 0; // surgeon does not receive location under new rule
                const personnelCostWithUrgent = personnelCost * (1 + (surgery.prestation?.urgentFeePercentage || 0));
                const clinicRevenue = locationCost + materialCost + personnelCostWithUrgent + asaFee;

                revenueByContractType.location.totalRevenue += clinicRevenue;
                revenueByContractType.location.totalSurgeries++;
                revenueByContractType.location.breakdown.locationFees += surgeonLocationAmount;
                revenueByContractType.location.breakdown.materialCosts += materialCost;
                // store the actual personnel cost including urgent uplift in the breakdown
                revenueByContractType.location.breakdown.personnelFees += personnelCostWithUrgent;
                // Note: urgent fees and extra fees are excluded from location method calculation
                revenueByContractType.location.breakdown.urgentFees += 0; // Always 0 for location
                revenueByContractType.location.breakdown.extraFees += 0; // Always 0 for location
                revenueByContractType.location.breakdown.asaFees += asaFee;

                revenueByContractType.location.details.push({
                    surgeryCode: surgery.code,
                    surgeonName: `${surgery.surgeon.lastName} ${surgery.surgeon.firstName}`,
                    date: surgery.incisionTime || surgery.updatedAt,
                    duration: surgery.actualDuration,
                    surgeonAmount: surgeonLocationAmount,
                    locationRate: surgery.surgeon.locationRate,
                    locationCost: locationCost,
                    materialCost,
                    personnelCost,
                    personnelCostWithUrgent,
                    urgentFee: 0, // Always 0 for location method (urgent impact applied via personnel uplift/locationRate)
                    extraFees: 0, // Always 0 for location method
                    asaFee: asaFee,
                    asaClass: surgery.asaClass || null,
                    totalRevenue: clinicRevenue
                });

            } else if (contractType === 'percentage') {
                // Calcul pour contrat de pourcentage
                // Apply urgent percentage to the prestation price first, then subtract patient materials
                const prestationPriceHT = surgery.adjustedPrice || surgery.prestation.priceHT;
                const urgentPercent = surgery.status === 'urgent' ? (surgery.prestation?.urgentFeePercentage || 0) : 0;

                // Note: quantity is in the material's unit of measure (meters, liters, pieces, etc.)
                // priceUsed is the frozen price per unit at the time of surgery
                const totalPatientMaterials = surgery.consumedMaterials?.reduce((sum, mat) => {
                    if (!mat.material || mat.material.category !== 'patient') return sum;
                    // Use frozen priceUsed if available, otherwise fallback to current price
                    const unitPrice = mat.priceUsed || mat.material.weightedPrice || mat.material.priceHT || 0;
                    return sum + (unitPrice * (mat.quantity || 0));
                }, 0) || 0;

                // netAmount is the amount to be split between surgeon and clinic
                const netAmount = (prestationPriceHT * (1 + urgentPercent)) - totalPatientMaterials;

                const surgeonPercentage = surgery.surgeon.percentageRate || 0;
                // Calculate extra fees (penalties) as before
                let extraFees = 0;
                if (surgery.applyExtraFees && surgery.actualDuration > surgery.prestation.maxDuration) {
                    const extraduration = surgery.actualDuration - surgery.prestation.maxDuration;
                    const threshold = surgery.prestation.exceededDurationUnit || 15;
                    if (extraduration >= threshold) {
                        extraFees = (surgery.prestation.exceededDurationFee || 0) * extraduration / threshold;
                    }
                }

                // Surgeon receives their share of the netAmount minus extra fees
                let surgeonAmount = (netAmount * (surgeonPercentage / 100)) - extraFees;
                if (surgeonAmount < 0) surgeonAmount = 0;

                // Clinic base share from netAmount
                const clinicBaseRevenue = netAmount * (1 - surgeonPercentage / 100);

                // Materials and personnel paid by the clinic
                // Note: quantity is in the material's unit of measure (meters, liters, pieces, etc.)
                const clinicMaterials = surgery.consumedMaterials?.reduce((sum, mat) => {
                    if (!mat.material || mat.material.category === 'patient') return sum;
                    // Use frozen priceUsed if available, otherwise fallback to current price
                    const unitPrice = mat.priceUsed || mat.material.weightedPrice || mat.material.priceHT || 0;
                    return sum + (unitPrice * (mat.quantity || 0));
                }, 0) || 0;
                const clinicPersonnel = surgery.medicalStaff?.reduce((sum, staff) => sum + (staff.staff?.personalFee * durationHours || 0), 0) || 0;
                const clinicPersonnelWithUrgent = clinicPersonnel * (1 + urgentPercent);

                // Total clinic revenue is clinic's share of netAmount plus clinic-paid items
                const totalClinicRevenue = clinicBaseRevenue + extraFees + clinicMaterials + clinicPersonnelWithUrgent;

                revenueByContractType.percentage.totalRevenue += totalClinicRevenue;
                revenueByContractType.percentage.totalSurgeries++;
                revenueByContractType.percentage.breakdown.baseRevenue += clinicBaseRevenue;
                // report the monetary urgent amount for reference (not double-added to totalRevenue)
                revenueByContractType.percentage.breakdown.urgentFees += (prestationPriceHT * urgentPercent) || 0;
                revenueByContractType.percentage.breakdown.extraFees += extraFees;
                revenueByContractType.percentage.breakdown.materialCosts += clinicMaterials;
                revenueByContractType.percentage.breakdown.personnelFees += clinicPersonnelWithUrgent;

                revenueByContractType.percentage.details.push({
                    surgeryCode: surgery.code,
                    surgeonName: `${surgery.surgeon.lastName} ${surgery.surgeon.firstName}`,
                    date: surgery.incisionTime || surgery.updatedAt,
                    duration: surgery.actualDuration,
                    baseRevenue: clinicBaseRevenue,
                    surgeonAmount,
                    percentage: surgeonPercentage,
                    urgentFee: (prestationPriceHT * urgentPercent) || 0,
                    extraFees,
                    clinicMaterials,
                    clinicPersonnel,
                    clinicPersonnelWithUrgent,
                    totalRevenue: totalClinicRevenue
                });
            }
        }

        // Trier les détails par date
        revenueByContractType.location.details.sort((a, b) => new Date(b.date) - new Date(a.date));
        revenueByContractType.percentage.details.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log('[CLINIC-REVENUE] Rapport généré:', {
            locationSurgeries: revenueByContractType.location.totalSurgeries,
            percentageSurgeries: revenueByContractType.percentage.totalSurgeries,
            totalLocationRevenue: revenueByContractType.location.totalRevenue,
            totalPercentageRevenue: revenueByContractType.percentage.totalRevenue
        });

        res.render('reports/clinic-revenue', {
            title: 'Rapport des Revenus Cliniques',
            revenueByContractType,
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('[CLINIC-REVENUE] Erreur:', error);
        res.status(500).render('errorHandling/error', { 
            statusCode: 'Erreur Rapport Revenus Clinique', 
            err: { message: error.message } 
        });
    }
};

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
                    incisionTime: {
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
                    incisionTime: {
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
        res.status(500).render('errorHandling/error', { 
            statusCode: 'Erreur Rapport Statistiques', 
            err: { message: error.message } 
        });
    }
};

// Material Usage Statistics Report
module.exports.materialUsageReport = async (req, res) => {
    try {
        console.log('[MATERIAL-USAGE] Début traitement');
        
        // Date filters
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const category = req.query.category || ''; // 'patient' or 'consumable' or ''
        
        console.log('[MATERIAL-USAGE] Filters:', { startDate, endDate, category });

        // Get surgeries in date range with consumed materials
        const surgeries = await Surgery.find({
            incisionTime: { $gte: startDate, $lte: endDate },
            'consumedMaterials.0': { $exists: true }
        })
        .populate('consumedMaterials.material')
        .populate('surgeon', 'firstName lastName')
        .populate('prestation', 'designation');

        // Aggregate material usage statistics
        const materialStats = {};
        const monthlyTotals = {};
        const surgeonMaterialUsage = {};
        const prestationMaterialUsage = {};

        let totalMaterialValue = 0;
        let totalPatientMaterialValue = 0;
        let totalConsumableMaterialValue = 0;

        for (const surgery of surgeries) {
            const monthKey = surgery.incisionTime 
                ? moment(surgery.incisionTime).format('YYYY-MM') 
                : 'unknown';
            
            if (!monthlyTotals[monthKey]) {
                monthlyTotals[monthKey] = { count: 0, value: 0, patientValue: 0, consumableValue: 0 };
            }
            monthlyTotals[monthKey].count += 1;

            for (const consumed of surgery.consumedMaterials) {
                if (!consumed.material) continue;
                
                const material = consumed.material;
                const materialId = material._id.toString();
                const materialCategory = material.category;
                
                // Filter by category if specified
                if (category && materialCategory !== category) continue;

                const value = consumed.quantity * (consumed.priceUsed || 0);
                totalMaterialValue += value;
                
                if (materialCategory === 'patient') {
                    totalPatientMaterialValue += value;
                    monthlyTotals[monthKey].patientValue += value;
                } else {
                    totalConsumableMaterialValue += value;
                    monthlyTotals[monthKey].consumableValue += value;
                }
                monthlyTotals[monthKey].value += value;

                // Material-level stats
                if (!materialStats[materialId]) {
                    materialStats[materialId] = {
                        material: material,
                        code: material.code,
                        designation: material.designation,
                        category: materialCategory,
                        totalQuantity: 0,
                        totalValue: 0,
                        surgeryCount: 0,
                        avgPerSurgery: 0
                    };
                }
                materialStats[materialId].totalQuantity += consumed.quantity;
                materialStats[materialId].totalValue += value;
                materialStats[materialId].surgeryCount += 1;

                // Surgeon usage
                if (surgery.surgeon) {
                    const surgeonKey = surgery.surgeon._id.toString();
                    const surgeonName = `${surgery.surgeon.lastName || ''} ${surgery.surgeon.firstName || ''}`.trim();
                    if (!surgeonMaterialUsage[surgeonKey]) {
                        surgeonMaterialUsage[surgeonKey] = { name: surgeonName, totalValue: 0, materials: {} };
                    }
                    surgeonMaterialUsage[surgeonKey].totalValue += value;
                    if (!surgeonMaterialUsage[surgeonKey].materials[materialId]) {
                        surgeonMaterialUsage[surgeonKey].materials[materialId] = { designation: material.designation, quantity: 0, value: 0 };
                    }
                    surgeonMaterialUsage[surgeonKey].materials[materialId].quantity += consumed.quantity;
                    surgeonMaterialUsage[surgeonKey].materials[materialId].value += value;
                }

                // Prestation usage
                if (surgery.prestation) {
                    const prestationKey = surgery.prestation._id.toString();
                    const prestationName = surgery.prestation.designation || 'Unknown';
                    if (!prestationMaterialUsage[prestationKey]) {
                        prestationMaterialUsage[prestationKey] = { name: prestationName, totalValue: 0, materials: {} };
                    }
                    prestationMaterialUsage[prestationKey].totalValue += value;
                    if (!prestationMaterialUsage[prestationKey].materials[materialId]) {
                        prestationMaterialUsage[prestationKey].materials[materialId] = { designation: material.designation, quantity: 0, value: 0 };
                    }
                    prestationMaterialUsage[prestationKey].materials[materialId].quantity += consumed.quantity;
                    prestationMaterialUsage[prestationKey].materials[materialId].value += value;
                }
            }
        }

        // Calculate averages
        for (const id in materialStats) {
            materialStats[id].avgPerSurgery = materialStats[id].surgeryCount > 0 
                ? materialStats[id].totalQuantity / materialStats[id].surgeryCount 
                : 0;
        }

        // Convert to sorted arrays
        const materialList = Object.values(materialStats)
            .sort((a, b) => b.totalValue - a.totalValue);
        
        const monthlyData = Object.entries(monthlyTotals)
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => a.month.localeCompare(b.month));
        
        const surgeonData = Object.values(surgeonMaterialUsage)
            .sort((a, b) => b.totalValue - a.totalValue);
        
        const prestationData = Object.values(prestationMaterialUsage)
            .sort((a, b) => b.totalValue - a.totalValue);

        // Get all materials for filter dropdown
        const allMaterials = await Material.find({}).sort({ designation: 1 });

        res.render('reports/material-usage', {
            title: 'Rapport d\'Utilisation des Matériaux',
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                category
            },
            summary: {
                totalMaterialValue,
                totalPatientMaterialValue,
                totalConsumableMaterialValue,
                totalSurgeries: surgeries.length,
                uniqueMaterials: Object.keys(materialStats).length
            },
            materialList,
            monthlyData,
            surgeonData,
            prestationData,
            allMaterials
        });
    } catch (error) {
        console.error('Erreur rapport utilisation matériaux:', error);
        res.status(500).render('errorHandling/error', { 
            statusCode: 'Erreur Rapport Matériaux', 
            err: { message: error.message } 
        });
    }
};