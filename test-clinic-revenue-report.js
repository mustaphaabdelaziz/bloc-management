const mongoose = require('mongoose');
require('dotenv').config();
const Surgery = require('./models/Surgery');
const Surgeon = require('./models/Surgeon');
const Prestation = require('./models/Prestation');
const Material = require('./models/Material');
const MedicalStaff = require('./models/MedicalStaff');

async function testClinicRevenueReport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✓ Connected to database\n');

    // Same dates as the report
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date();

    console.log('=== TESTING CLINIC REVENUE REPORT QUERY ===');
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);

    // Old query (broken)
    console.log('OLD QUERY (broken): incisionTime filter only');
    const oldSurgeries = await Surgery.find({
      incisionTime: { $gte: startDate, $lte: endDate },
      status: { $in: ['planned', 'urgent'] }
    }).populate('surgeon', 'firstName lastName contractType');

    console.log(`Result: ${oldSurgeries.length} surgeries found`);
    oldSurgeries.forEach(s => {
      console.log(`  - ${s.code}: ${s.surgeon?.firstName} ${s.surgeon?.lastName} (${s.surgeon?.contractType})`);
    });

    // New query (fixed)
    console.log('\n✓ NEW QUERY (fixed): incisionTime OR (no incisionTime AND updatedAt in range)');
    const newSurgeries = await Surgery.find({
      $or: [
        { incisionTime: { $gte: startDate, $lte: endDate } },
        { incisionTime: { $exists: false, $eq: null }, updatedAt: { $gte: startDate, $lte: endDate } }
      ],
      status: { $in: ['planned', 'urgent'] }
    }).populate('surgeon', 'firstName lastName contractType percentageRate locationRate')
     .populate('prestation', 'priceHT urgentFeePercentage duration')
     .populate('consumedMaterials.material', 'category priceHT weightedPrice')
     .populate('medicalStaff.staff', 'personalFee');

    console.log(`Result: ${newSurgeries.length} surgeries found`);
    
    let locationCount = 0, percentageCount = 0;
    newSurgeries.forEach(s => {
      const type = s.surgeon?.contractType || 'unknown';
      if (type === 'location') locationCount++;
      else if (type === 'percentage') percentageCount++;
      console.log(`  - ${s.code}: ${s.surgeon?.firstName} ${s.surgeon?.lastName} (${type})`);
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Location contracts: ${locationCount}`);
    console.log(`Percentage contracts: ${percentageCount}`);

    // Test calculations for percentage contracts
    console.log('\n=== PERCENTAGE CONTRACT CALCULATION TEST ===');
    const percentageSurgeries = newSurgeries.filter(s => s.surgeon?.contractType === 'percentage');
    
    percentageSurgeries.forEach(surgery => {
      console.log(`\nSurgery: ${surgery.code}`);
      
      const durationHours = surgery.actualDuration ? surgery.actualDuration / 60 : 0;
      const prestationPriceHT = surgery.adjustedPrice || surgery.prestation?.priceHT;
      const urgentPercent = surgery.status === 'urgent' ? (surgery.prestation?.urgentFeePercentage || 0) : 0;

      const totalPatientMaterials = surgery.consumedMaterials?.reduce((sum, mat) => {
        if (!mat.material || mat.material.category !== 'patient') return sum;
        const weightedPrice = mat.material.weightedPrice || mat.material.priceHT || 0;
        return sum + (weightedPrice * (mat.quantity || 0));
      }, 0) || 0;

      const netAmount = (prestationPriceHT * (1 + urgentPercent)) - totalPatientMaterials;
      const surgeonPercentage = surgery.surgeon?.percentageRate || 0;

      let extraFees = 0;
      if (surgery.applyExtraFees && surgery.actualDuration > surgery.prestation?.duration) {
        const extraduration = surgery.actualDuration - surgery.prestation?.duration;
        const threshold = surgery.prestation?.exceededDurationUnit || 15;
        if (extraduration >= threshold) {
          extraFees = (surgery.prestation?.exceededDurationFee || 0) * extraduration / threshold;
        }
      }

      let surgeonAmount = (netAmount * (surgeonPercentage / 100)) - extraFees;
      if (surgeonAmount < 0) surgeonAmount = 0;

      const clinicBaseRevenue = netAmount * (1 - surgeonPercentage / 100);

      const clinicMaterials = surgery.consumedMaterials?.reduce((sum, mat) => {
        if (!mat.material || mat.material.category === 'patient') return sum;
        const weightedPrice = mat.material.weightedPrice || mat.material.priceHT || 0;
        return sum + (weightedPrice * (mat.quantity || 0));
      }, 0) || 0;

      const clinicPersonnel = surgery.medicalStaff?.reduce((sum, staff) => sum + (staff.staff?.personalFee * durationHours || 0), 0) || 0;
      const clinicPersonnelWithUrgent = clinicPersonnel * (1 + urgentPercent);

      const totalClinicRevenue = clinicBaseRevenue + extraFees + clinicMaterials + clinicPersonnelWithUrgent;

      console.log(`  Prestation Price: ${prestationPriceHT}`);
      console.log(`  Urgent %: ${urgentPercent * 100}%`);
      console.log(`  Patient Materials: ${totalPatientMaterials}`);
      console.log(`  Net Amount: ${netAmount}`);
      console.log(`  Surgeon %: ${surgeonPercentage}%`);
      console.log(`  Surgeon Amount: ${surgeonAmount}`);
      console.log(`  Clinic Base Revenue: ${clinicBaseRevenue}`);
      console.log(`  Clinic Materials: ${clinicMaterials}`);
      console.log(`  Clinic Personnel (with urgent): ${clinicPersonnelWithUrgent}`);
      console.log(`  Total Clinic Revenue: ${totalClinicRevenue}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
  process.exit(0);
}

testClinicRevenueReport();
