const mongoose = require('mongoose');
const Surgeon = require('./models/Surgeon');
const Specialty = require('./models/Specialty');
require('dotenv').config();

const testSurgeonCreation = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.DB_URL);
        console.log('Connected!');

        // Get a specialty to use
        const specialty = await Specialty.findOne();
        if (!specialty) {
            console.log('No specialties found. Please seed specialties first.');
            process.exit(1);
        }

        console.log('\nTesting surgeon creation with correct field names...\n');

        // Simulate form data with correct field names (as sent by the form)
        const formData = {
            firstName: 'Test',
            lastName: 'Surgeon',
            dateOfBirth: new Date('1980-01-01'),
            phone: '0550123456',
            specialty: specialty._id,
            contractType: 'location',
            locationRate: 50000,
            code: 'SR-99999'
        };

        console.log('Form data to be saved:');
        console.log(JSON.stringify(formData, null, 2));

        const surgeon = new Surgeon(formData);
        const result = await surgeon.save();

        console.log('\n✅ Surgeon created successfully!');
        console.log('Saved surgeon:');
        console.log(JSON.stringify(result.toObject(), null, 2));

        // Clean up
        await Surgeon.deleteOne({ _id: result._id });
        console.log('\n✅ Test surgeon cleaned up');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

testSurgeonCreation();
