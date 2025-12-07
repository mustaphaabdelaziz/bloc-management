const mongoose = require('mongoose');
const Surgeon = require('./models/Surgeon');
const Specialty = require('./models/Specialty');
require('dotenv').config();

const testCompleteSurgeonUpdate = async () => {
    try {
        console.log('Testing complete surgeon update with birthdate...\n');
        
        await mongoose.connect(process.env.DB_URL);
        
        const specialty = await Specialty.findOne();
        if (!specialty) {
            console.log('❌ No specialties found');
            process.exit(1);
        }

        // Create test surgeon
        const testSurgeon = new Surgeon({
            firstName: 'Original',
            lastName: 'Surgeon',
            dateOfBirth: new Date('1975-03-10'),
            phone: '0550111111',
            specialty: specialty._id,
            contractType: 'location',
            locationRate: 40000,
            code: 'SR-99996'
        });

        let surgeon = await testSurgeon.save();
        console.log('✅ Test surgeon created');
        console.log('   Name:', surgeon.firstName, surgeon.lastName);
        console.log('   Birthdate:', surgeon.dateOfBirth.toISOString().split('T')[0]);
        console.log('   Contract: location');
        console.log('   location Rate:', surgeon.locationRate);

        // Simulate form update
        console.log('\n📝 Submitting update form with:');
        console.log('   - New firstName: Updated');
        console.log('   - New birthdate: 1988-07-25');
        console.log('   - New phone: 0550222222');
        console.log('   - Contract type change: location → percentage');
        console.log('   - New percentage rate: 48.5');

        // Apply update logic from controller
        const formData = {
            firstName: 'Updated',
            lastName: 'Surgeon',
            phone: '0550222222',
            specialty: specialty._id.toString(),
            contractType: 'percentage',
            locationRate: '40000',  // Old value, should be cleared
            percentageRate: '48.5',   // New value
            dateOfBirth: '1988-07-25'
        };

        const updateData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            specialty: formData.specialty,
            contractType: formData.contractType,
            dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined
        };

        if (formData.contractType === 'percentage') {
            updateData.percentageRate = parseFloat(formData.percentageRate) || 0;
            updateData.locationRate = null;
        }

        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        surgeon = await Surgeon.findByIdAndUpdate(surgeon._id, updateData, { new: true });

        console.log('\n✅ Surgeon updated successfully');
        console.log('   Name:', surgeon.firstName, surgeon.lastName);
        console.log('   Birthdate:', surgeon.dateOfBirth.toISOString().split('T')[0]);
        console.log('   Phone:', surgeon.phone);
        console.log('   Contract:', surgeon.contractType);
        console.log('   Percentage Rate:', surgeon.percentageRate);
        console.log('   location Rate:', surgeon.locationRate);

        // Verify all changes
        const tests = [
            { name: 'firstName updated', passed: surgeon.firstName === 'Updated' },
            { name: 'birthdate updated', passed: surgeon.dateOfBirth.toISOString().split('T')[0] === '1988-07-25' },
            { name: 'phone updated', passed: surgeon.phone === '0550222222' },
            { name: 'contract type changed', passed: surgeon.contractType === 'percentage' },
            { name: 'percentage rate set', passed: surgeon.percentageRate === 48.5 },
            { name: 'location rate cleared', passed: surgeon.locationRate === null }
        ];

        console.log('\n📋 Verification Results:');
        let allPassed = true;
        tests.forEach(test => {
            const status = test.passed ? '✅' : '❌';
            console.log(`   ${status} ${test.name}`);
            if (!test.passed) allPassed = false;
        });

        // Clean up
        await Surgeon.deleteOne({ _id: surgeon._id });

        if (allPassed) {
            console.log('\n🎉 All tests passed! Surgeon update is working correctly.');
            process.exit(0);
        } else {
            console.log('\n⚠️ Some tests failed!');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

testCompleteSurgeonUpdate();
