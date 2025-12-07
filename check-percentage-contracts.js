const mongoose = require('mongoose');
require('dotenv').config();
const Surgery = require('./models/Surgery');
const Surgeon = require('./models/Surgeon');
const Prestation = require('./models/Prestation');
const Material = require('./models/Material');
const MedicalStaff = require('./models/MedicalStaff');

async function checkPercentageContracts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✓ Connected to database');

    // Check surgeons with percentage contracts
    const percentageSurgeons = await Surgeon.find({ contractType: 'percentage' });
    console.log('\n=== SURGEONS WITH PERCENTAGE CONTRACTS ===');
    console.log(`Total: ${percentageSurgeons.length}`);
    percentageSurgeons.slice(0, 5).forEach(s => {
      console.log(`  - ${s.firstName} ${s.lastName}: ${s.percentageRate}%`);
    });

    // Check surgeries with percentage contract surgeons
    const allSurgeries = await Surgery.find({
      status: { $in: ['planned', 'urgent'] }
    }).limit(10);

    console.log('\n=== ALL SURGERIES IN DB ===');
    console.log(`Total: ${allSurgeries.length}`);
    allSurgeries.forEach(s => {
      console.log(`  - ${s.code}: incisionTime=${s.incisionTime}, closingIncisionTime=${s.closingIncisionTime}`);
    });

    // Check with date filter like the report does
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date();
    const percentageSurgeries = await Surgery.find({
      incisionTime: { $gte: startDate, $lte: endDate },
      status: { $in: ['planned', 'urgent'] }
    })
      .populate('surgeon', 'firstName lastName contractType percentageRate')
      .populate('prestation', 'designation priceHT urgentFeePercentage')
      .limit(10);

    console.log('\n=== SURGERIES WITH DATE FILTER ===');
    console.log(`Total surgeries checked: ${percentageSurgeries.length}`);
    
    const byContractType = {};
    percentageSurgeries.forEach(s => {
      const type = s.surgeon?.contractType || 'unknown';
      byContractType[type] = (byContractType[type] || 0) + 1;
      console.log(`  - ${s.code}: ${s.surgeon?.firstName} ${s.surgeon?.lastName} (${type}) - Amount: ${s.surgeonAmount}`);
    });

    console.log('\n=== CONTRACT TYPE DISTRIBUTION ===');
    Object.entries(byContractType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Check the actual calculation for percentage contracts
    const percentageContractSurgeries = await Surgery.find({
      status: { $in: ['planned', 'urgent'] }
    })
      .populate('surgeon', 'firstName lastName contractType percentageRate')
      .populate('prestation', 'designation priceHT urgentFeePercentage')
      .populate('consumedMaterials.material', 'designation category')
      .populate('medicalStaff.staff', 'firstName lastName personalFee');
      // Removed .lean() to get virtuals computed

    const percentageOnly = percentageContractSurgeries.filter(s => s.surgeon?.contractType === 'percentage');
    
    console.log('\n=== PERCENTAGE CONTRACT SURGERY DETAILS ===');
    percentageOnly.forEach(s => {
      console.log(`\nSurgery ${s.code}:`);
      console.log(`  Surgeon: ${s.surgeon?.firstName} ${s.surgeon?.lastName}`);
      console.log(`  Percentage Rate: ${s.surgeon?.percentageRate}%`);
      console.log(`  Prestation Price: ${s.prestation?.priceHT}`);
      console.log(`  Adjusted Price: ${s.adjustedPrice}`);
      console.log(`  Surgeon Amount: ${s.surgeonAmount}`);
      console.log(`  Clinic Amount: ${s.clinicAmount}`);
      console.log(`  Consumed Materials: ${s.consumedMaterials?.length || 0}`);
      console.log(`  Medical Staff: ${s.medicalStaff?.length || 0}`);
      console.log(`  Actual Duration: ${s.actualDuration} min`);
      console.log(`  incisionTime: ${s.incisionTime}`);
      console.log(`  closingIncisionTime: ${s.closingIncisionTime}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
  process.exit(0);
}

checkPercentageContracts();
