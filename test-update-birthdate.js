const mongoose = require('mongoose');
const Surgeon = require('./models/Surgeon');
const Specialty = require('./models/Specialty');
require('dotenv').config();

const testUpdateBirthdate = async () => {
    try {
        console.log('Testing surgeon birthdate update...\n');
        
        await mongoose.connect(process.env.DB_URL);
        
        // Create a test surgeon
        const specialty = await Specialty.findOne();
        if (!specialty) {
            console.log('❌ No specialties found');
            process.exit(1);
        }

        const testSurgeon = new Surgeon({
            firstName: 'TestUpdate',
            lastName: 'Surgeon',
            dateOfBirth: new Date('1980-01-15'),
            phone: '0550123456',
            specialty: specialty._id,
            contractType: 'location',
            locationRate: 50000,
            code: 'SR-99998'
        });

        const surgeon = await testSurgeon.save();
        console.log('✅ Test surgeon created');
        console.log('   Original birthdate:', surgeon.dateOfBirth.toISOString().split('T')[0]);

        // Simulate form submission with updated birthdate
        const formDataFromRequest = {
            firstName: 'TestUpdate',
            lastName: 'Surgeon',
            dateOfBirth: '1985-06-20',  // New date from form
            phone: '0550999888',
            specialty: specialty._id.toString(),
            contractType: 'percentage',
            percentageRate: '55.5'
        };

        console.log('\nSimulating form submission:');
        console.log('New birthdate from form:', formDataFromRequest.dateOfBirth);

        // Apply the update logic
        const updateData = {
            firstName: formDataFromRequest.firstName,
            lastName: formDataFromRequest.lastName,
            phone: formDataFromRequest.phone,
            specialty: formDataFromRequest.specialty,
            contractType: formDataFromRequest.contractType,
            dateOfBirth: formDataFromRequest.dateOfBirth ? new Date(formDataFromRequest.dateOfBirth) : undefined
        };

        if (formDataFromRequest.contractType === 'percentage') {
            updateData.percentageRate = formDataFromRequest.percentageRate || 0;
            updateData.locationRate = undefined;
        }

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updated = await Surgeon.findByIdAndUpdate(surgeon._id, updateData, { new: true });

        console.log('\n✅ Surgeon updated');
        console.log('   Updated birthdate:', updated.dateOfBirth.toISOString().split('T')[0]);
        console.log('   Contract type:', updated.contractType);
        console.log('   Percentage rate:', updated.percentageRate);
        console.log('   location rate:', updated.locationRate);

        // Verify the date was actually updated
        if (updated.dateOfBirth.toISOString().split('T')[0] === '1985-06-20') {
            console.log('\n🎉 Birthdate update working correctly!');
        } else {
            console.log('\n❌ Birthdate not updated properly');
        }

        // Clean up
        await Surgeon.deleteOne({ _id: surgeon._id });
        console.log('✅ Test data cleaned up');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

testUpdateBirthdate();
