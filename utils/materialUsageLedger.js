/**
 * Material Usage Ledger Helper
 * 
 * Syncs material.usedInSurgeries[] entries whenever surgeries are created, updated, or deleted.
 * This provides full traceability of material consumption without re-scanning surgeries.
 */

const Material = require('../models/Material');
const Surgery = require('../models/Surgery');

/**
 * Sync the usage ledger for all materials consumed in a surgery.
 * Call this after creating or updating a surgery.
 * 
 * @param {ObjectId|String} surgeryId - The surgery ID
 * @param {Object} options - Options for the sync
 * @param {Boolean} options.removeFirst - If true, remove existing entries before adding (for updates)
 */
async function syncSurgeryMaterialUsage(surgeryId, options = {}) {
    const { removeFirst = true } = options;
    
    // Fetch surgery with needed populated fields
    const surgery = await Surgery.findById(surgeryId)
        .populate('patient')
        .populate('surgeon')
        .populate('consumedMaterials.material');
    
    if (!surgery) {
        console.warn(`[MaterialUsageLedger] Surgery ${surgeryId} not found`);
        return;
    }
    
    // Collect all material IDs involved in this surgery
    const materialIds = (surgery.consumedMaterials || [])
        .filter(cm => cm.material && cm.material._id)
        .map(cm => cm.material._id.toString());
    
    // Unique material IDs
    const uniqueMaterialIds = [...new Set(materialIds)];
    
    // If removeFirst, we need to also check materials that previously had this surgery
    // (in case materials were removed from consumedMaterials during an update)
    if (removeFirst) {
        const materialsWithThisSurgery = await Material.find({
            'usedInSurgeries.surgery': surgeryId
        }).select('_id');
        
        const previousMaterialIds = materialsWithThisSurgery.map(m => m._id.toString());
        const allMaterialIds = [...new Set([...uniqueMaterialIds, ...previousMaterialIds])];
        
        // Remove existing ledger entries for this surgery from all affected materials
        if (allMaterialIds.length > 0) {
            await Material.updateMany(
                { _id: { $in: allMaterialIds } },
                { $pull: { usedInSurgeries: { surgery: surgeryId } } }
            );
        }
    }
    
    // Now add fresh ledger entries for each consumed material
    if (!surgery.consumedMaterials || surgery.consumedMaterials.length === 0) {
        return;
    }
    
    // Build denormalized data
    const patientName = surgery.patient 
        ? `${surgery.patient.firstName || ''} ${surgery.patient.lastName || ''}`.trim() 
        : '';
    const surgeonName = surgery.surgeon 
        ? `${surgery.surgeon.lastName || ''} ${surgery.surgeon.firstName || ''}`.trim() 
        : '';
    const surgeryCode = surgery.code || '';
    
    // Use incisionTime as the usage timestamp (most accurate for when material was actually used)
    const usedAt = surgery.incisionTime || surgery.createdAt || new Date();
    
    // Group by material ID to aggregate quantities (in case same material appears multiple times)
    const materialQuantities = {};
    for (const cm of surgery.consumedMaterials) {
        if (!cm.material || !cm.material._id) continue;
        
        const matId = cm.material._id.toString();
        if (!materialQuantities[matId]) {
            materialQuantities[matId] = {
                quantity: 0,
                priceUsed: cm.priceUsed || cm.material.weightedPrice || cm.material.priceHT || 0
            };
        }
        materialQuantities[matId].quantity += cm.quantity || 0;
    }
    
    // Update each material with new ledger entry
    const updatePromises = Object.entries(materialQuantities).map(([materialId, data]) => {
        return Material.updateOne(
            { _id: materialId },
            {
                $push: {
                    usedInSurgeries: {
                        surgery: surgeryId,
                        quantity: data.quantity,
                        priceUsed: data.priceUsed,
                        usedAt,
                        surgeryCode,
                        patientName,
                        surgeonName
                    }
                }
            }
        );
    });
    
    await Promise.all(updatePromises);
    
    console.log(`[MaterialUsageLedger] Synced ${Object.keys(materialQuantities).length} materials for surgery ${surgeryCode || surgeryId}`);
}

/**
 * Remove all ledger entries for a surgery (when surgery is deleted)
 * 
 * @param {ObjectId|String} surgeryId - The surgery ID
 */
async function removeSurgeryFromLedger(surgeryId) {
    const result = await Material.updateMany(
        { 'usedInSurgeries.surgery': surgeryId },
        { $pull: { usedInSurgeries: { surgery: surgeryId } } }
    );
    
    console.log(`[MaterialUsageLedger] Removed surgery ${surgeryId} from ${result.modifiedCount} materials`);
    return result;
}

/**
 * Backfill ledger entries for all existing surgeries.
 * Use this once to migrate existing data.
 * 
 * @param {Object} options - Options
 * @param {Boolean} options.clearFirst - If true, clear all existing ledger entries first
 * @param {Number} options.batchSize - Number of surgeries to process per batch
 */
async function backfillAllSurgeries(options = {}) {
    const { clearFirst = true, batchSize = 100 } = options;
    
    console.log('[MaterialUsageLedger] Starting backfill...');
    
    // Optionally clear all existing ledger entries
    if (clearFirst) {
        console.log('[MaterialUsageLedger] Clearing existing ledger entries...');
        await Material.updateMany(
            {},
            { $set: { usedInSurgeries: [] } }
        );
    }
    
    // Count total surgeries
    const totalCount = await Surgery.countDocuments({ 'consumedMaterials.0': { $exists: true } });
    console.log(`[MaterialUsageLedger] Found ${totalCount} surgeries with consumed materials`);
    
    let processed = 0;
    let skip = 0;
    
    while (skip < totalCount) {
        const surgeries = await Surgery.find({ 'consumedMaterials.0': { $exists: true } })
            .skip(skip)
            .limit(batchSize)
            .select('_id');
        
        if (surgeries.length === 0) break;
        
        for (const surgery of surgeries) {
            try {
                await syncSurgeryMaterialUsage(surgery._id, { removeFirst: false });
                processed++;
            } catch (err) {
                console.error(`[MaterialUsageLedger] Error processing surgery ${surgery._id}:`, err.message);
            }
        }
        
        skip += batchSize;
        console.log(`[MaterialUsageLedger] Processed ${processed}/${totalCount} surgeries`);
    }
    
    console.log(`[MaterialUsageLedger] Backfill complete. Processed ${processed} surgeries.`);
    return { processed, total: totalCount };
}

/**
 * Get usage statistics for a material
 * 
 * @param {ObjectId|String} materialId - The material ID
 */
async function getMaterialUsageStats(materialId) {
    const material = await Material.findById(materialId);
    if (!material) return null;
    
    return {
        totalQuantity: material.totalUsedQuantity,
        totalValue: material.totalUsedValue,
        surgeryCount: material.surgeryUsageCount,
        lastUsedAt: material.lastUsedAt,
        usageHistory: material.usedInSurgeries || []
    };
}

module.exports = {
    syncSurgeryMaterialUsage,
    removeSurgeryFromLedger,
    backfillAllSurgeries,
    getMaterialUsageStats
};
