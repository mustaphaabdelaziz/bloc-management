const mongoose = require('mongoose');
require('dotenv').config();

// Import Material model before using it
const Material = require('./models/Material');

mongoose.connect(process.env.DB_URL).then(async () => {
    try {
        const material = await Material.findOne();
        
        if (!material) {
            console.error('No material found');
            process.exit(1);
        }
        
        console.log('Original material:');
        console.log('- Designation:', material.designation);
        console.log('- Price HT:', material.priceHT);
        console.log('- TVA:', material.tva);
        console.log('- Selling Markup:', material.sellingMarkupPercent);
        
        // Simulate form submission data
        const updateData = {
            designation: material.designation,
            category: material.category,
            priceHT: '500000',  // String from form
            tva: '0.19',        // String from form
            sellingMarkupPercent: '15',  // String from form
            unitOfMeasure: material.unitOfMeasure
        };
        
        // Remove code (same as controller)
        delete updateData.code;
        
        // Convert numeric fields
        if (updateData.priceHT) {
            updateData.priceHT = parseFloat(updateData.priceHT);
            console.log('\nParsed priceHT:', updateData.priceHT, typeof updateData.priceHT);
        }
        
        if (updateData.tva) {
            updateData.tva = parseFloat(updateData.tva);
            console.log('Parsed tva:', updateData.tva, typeof updateData.tva);
        }
        
        if (updateData.sellingMarkupPercent) {
            updateData.sellingMarkupPercent = parseFloat(updateData.sellingMarkupPercent);
            console.log('Parsed markup:', updateData.sellingMarkupPercent, typeof updateData.sellingMarkupPercent);
        }
        
        // Apply update
        Object.assign(material, updateData);
        await material.save();
        
        console.log('\n✅ Material updated successfully!');
        console.log('New material:');
        console.log('- Price HT:', material.priceHT);
        console.log('- TVA:', material.tva);
        console.log('- Selling Markup:', material.sellingMarkupPercent);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating material:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}).catch(err => {
    console.error('Database connection error:', err.message);
    process.exit(1);
});
