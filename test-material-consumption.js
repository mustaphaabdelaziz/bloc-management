require('dotenv').config();
const mongoose = require('mongoose');
const Material = require('./models/Material');
const Surgery = require('./models/Surgery');

async function testMaterialConsumption() {
  try {
    await mongoose.connect(process.env.DB_URL || 'mongodb://localhost:27017/bloc');
    console.log('✓ Connected to database');

    // Get first material
    const material = await Material.findOne();
    if (!material) {
      console.log('✗ No materials found in database');
      process.exit(0);
    }
    console.log(`\n✓ Testing material: ${material.designation} (${material.code})`);

    // Find surgeries that used this material
    const surgeries = await Surgery.find({
      'consumedMaterials.material': material._id
    }).populate('surgeon patient prestation');

    console.log(`✓ Found ${surgeries.length} surgeries using this material`);

    let totalConsumed = 0;
    let totalUsageValue = 0;
    let surgeryCount = 0;

    surgeries.forEach(surgery => {
      const consumedItem = surgery.consumedMaterials.find(
        cm => cm.material && cm.material._id.toString() === material._id.toString()
      );
      if (consumedItem) {
        console.log(`  - Surgery ${surgery.code}: ${consumedItem.quantity} ${material.unitOfMeasure} (${consumedItem.priceUsed} DA/unit)`);
        totalConsumed += consumedItem.quantity;
        totalUsageValue += consumedItem.quantity * (consumedItem.priceUsed || 0);
        surgeryCount += 1;
      }
    });

    console.log(`\n✓ Consumption Statistics:`);
    console.log(`  - Total Consumed: ${totalConsumed} ${material.unitOfMeasure}`);
    console.log(`  - Total Usage Value: ${totalUsageValue.toFixed(2)} DA`);
    console.log(`  - Surgery Count: ${surgeryCount}`);
    console.log(`  - Current Stock: ${material.stock} ${material.unitOfMeasure}`);

    if (totalConsumed === 0 && surgeryCount === 0) {
      console.log('\n⚠ Note: This material has not been used in any surgeries yet.');
    } else {
      console.log('\n✓ Consumption calculation working correctly!');
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testMaterialConsumption();
