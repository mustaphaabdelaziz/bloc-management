const mongoose = require('mongoose');
require('dotenv').config();
const Surgery = require('../models/Surgery');
const Surgeon = require('../models/Surgeon');
const Prestation = require('../models/Prestation');
const Material = require('../models/Material');
const MedicalStaff = require('../models/MedicalStaff');

async function calculateSurgeonFees(surgeryId) {
  const surgery = await Surgery.findById(surgeryId)
    .populate("surgeon")
    .populate("prestation")
    .populate("consumedMaterials.material")
    .populate("medicalStaff.staff");

  if (!surgery || !surgery.surgeon || !surgery.prestation) {
    console.log(`Skipping surgery ${surgeryId}: missing data`);
    return null;
  }

  const prestation = surgery.prestation;
  const surgeon = surgery.surgeon;

  let prestationPriceHT = surgery.adjustedPrice;
  if (!prestationPriceHT) {
    prestationPriceHT = prestation.priceHT;
    await Surgery.findByIdAndUpdate(surgeryId, { adjustedPrice: prestationPriceHT });
  }

  let totalMaterialCost = 0;
  let totalPatientMaterialCost = 0;

  for (const consumedMaterial of surgery.consumedMaterials) {
    const material = consumedMaterial.material;
    const quantity = consumedMaterial.quantity || 0;
    const materialCost = (material?.weightedPrice || material?.priceHT || 0) * quantity;

    totalMaterialCost += materialCost;

    if (material.category === "patient") {
      totalPatientMaterialCost += materialCost;
    }
  }

  let totalPersonalFees = 0;
  const durationInHours = (surgery.actualDuration || 0) / 60;

  for (const staffEntry of surgery.medicalStaff) {
    if (staffEntry.staff && staffEntry.staff.personalFee) {
      totalPersonalFees += staffEntry.staff.personalFee * durationInHours;
    }
  }

  const urgentPercent = surgery.status === 'urgent' ? (prestation.urgentFeePercentage || 0) : 0;
  let surgeonAmount = 0;
  let clinicAmount = 0;

  if (surgeon.contractType === "allocation") {
    const duration = surgery.actualDuration || 0;
    const durationInHours = duration / 60;
    const allocationCost = durationInHours * (surgeon.allocationRate || 0);

    surgeonAmount = 0;

    const effectivePersonalFees = totalPersonalFees * (1 + urgentPercent);

    let extraFees = 0;
    if (surgery.applyExtraFees && surgery.actualDuration > prestation.duration) {
      const extraduration = surgery.actualDuration - prestation.duration;
      if (extraduration >= (prestation.exceededDurationUnit || 15)) {
        extraFees = (prestation.exceededDurationFee || 0) * extraduration / (prestation.exceededDurationUnit || 15);
      }
    }

    clinicAmount = allocationCost + totalMaterialCost + effectivePersonalFees + extraFees;
  } else if (surgeon.contractType === "percentage") {
    let extraDuration = surgery.actualDuration - prestation.duration;
    let extraUnits = 0;
    let extraFee = 0;

    if (surgery.applyExtraFees && extraDuration > 0) {
      const durationUnit = prestation.exceededDurationUnit || 15;
      const exceededFeePerUnit = prestation.exceededDurationFee || 0;
      extraUnits = Math.ceil(extraDuration / durationUnit);
      extraFee = exceededFeePerUnit * extraUnits;
    }

    const urgentRate = surgery.status === 'urgent' ? (prestation.urgentFeePercentage || 0) : 0;
    const surgeonRate = (surgeon.percentageRate || 45) / 100;
    const clinicRate = 1 - surgeonRate;

    surgeonAmount = ((prestationPriceHT * (1 + urgentRate) - totalPatientMaterialCost) * surgeonRate) - extraFee;
    surgeonAmount = Math.max(0, surgeonAmount);

    const nonPatientMaterials = totalMaterialCost - totalPatientMaterialCost;
    clinicAmount = ((prestationPriceHT * (1 + urgentRate) - totalPatientMaterialCost) * clinicRate) + totalPatientMaterialCost + extraFee;
  }

  surgeonAmount = Math.max(0, surgeonAmount);
  clinicAmount = Math.max(0, clinicAmount);

  await Surgery.findByIdAndUpdate(surgeryId, {
    surgeonAmount: Math.round(surgeonAmount * 100) / 100,
    clinicAmount: Math.round(clinicAmount * 100) / 100,
  });

  return surgeonAmount;
}

async function migrateFees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('Connected to database');

    // Get all surgeries with status planned or urgent
    const surgeries = await Surgery.find({
      status: { $in: ['planned', 'urgent'] }
    });

    console.log(`Found ${surgeries.length} surgeries to process`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const surgery of surgeries) {
      try {
        const result = await calculateSurgeonFees(surgery._id);
        if (result !== null) {
          processed++;
          console.log(`✓ Processed surgery ${surgery.code}`);
        } else {
          skipped++;
        }
      } catch (error) {
        errors++;
        console.error(`✗ Error processing surgery ${surgery.code}:`, error.message);
      }
    }

    console.log(`\nMigration complete:`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateFees();
