const mongoose = require('mongoose');
require('dotenv').config();

const Surgery = require('./models/Surgery');
const Material = require('./models/Material');

mongoose.connect(process.env.DB_URL).then(async () => {
    try {
        // Find a surgery to test with
        const surgery = await Surgery.findOne({ statusLifecycle: 'editable' })
            .populate('consumedMaterials.material');
        
        if (!surgery) {
            console.error('No editable surgery found');
            process.exit(1);
        }
        
        console.log('Found surgery:', surgery.code);
        console.log('Current materials:', surgery.consumedMaterials?.length || 0);
        
        // Find a material to add
        const material = await Material.findOne();
        if (!material) {
            console.error('No materials found');
            process.exit(1);
        }
        
        console.log('Found material:', material.designation);
        
        // Simulate adding material
        if (!surgery.consumedMaterials) {
            surgery.consumedMaterials = [];
        }
        
        surgery.consumedMaterials.push({
            material: material._id,
            quantity: 5,
            priceUsed: material.weightedPrice || material.priceHT
        });
        
        await surgery.save();
        
        // Reload to verify
        const updatedSurgery = await Surgery.findById(surgery._id)
            .populate('consumedMaterials.material');
        
        console.log('✅ Material added successfully!');
        console.log('Updated materials count:', updatedSurgery.consumedMaterials?.length || 0);
        
        updatedSurgery.consumedMaterials?.forEach((cm, idx) => {
            console.log(`  ${idx + 1}. ${cm.material?.designation} - Qty: ${cm.quantity}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}).catch(err => {
    console.error('Database connection error:', err.message);
    process.exit(1);
});
