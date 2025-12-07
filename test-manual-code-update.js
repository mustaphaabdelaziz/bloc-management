const mongoose = require('mongoose');
const Surgeon = require('./models/Surgeon');
const Specialty = require('./models/Specialty');
require('dotenv').config();

const testUpdateWithoutCodeValidation = async () => {
    try {
        console.log('Testing surgeon update WITHOUT code validation...\n');
        
        await mongoose.connect(process.env.DB_URL);
        
        const specialty = await Specialty.findOne();
        if (!specialty) {
            console.log('❌ No specialties found');
            process.exit(1);
        }

        // Create test surgeon with manual code (not auto-generated)
        const testSurgeon = new Surgeon({
            firstName: 'Manual',
            lastName: 'CodeSurgeon',
            dateOfBirth: new Date('1982-05-12'),
            phone: '0550444444',
            specialty: specialty._id,
            contractType: 'location',
            locationRate: 60000,
            code: 'SR-MANUAL'  // Manual code, not auto-generated
        });

        let surgeon = await testSurgeon.save();
        console.log('✅ Test surgeon created with manual code');
        console.log('   Code:', surgeon.code);
        console.log('   Name:', surgeon.firstName, surgeon.lastName);
        console.log('   Original contract: location @ 60000 DA/hr');

        // Simulate form submission WITHOUT code being changed
        console.log('\n📝 Submitting update form (WITHOUT code field):');
        console.log('   - New firstName: UpdatedManual');
        console.log('   - New phone: 0550555555');
        console.log('   - Contract type: location → percentage');
        console.log('   - New percentage rate: 52.5');
        console.log('   ⚠️  Code field NOT being sent (readonly in form)');

        // Apply update logic from controller
        // Note: code is NOT extracted from req.body in the controller
        const updateData = {
            firstName: 'UpdatedManual',
            lastName: 'CodeSurgeon',
            phone: '0550555555',
            specialty: specialty._id,
            contractType: 'percentage',
            percentageRate: 52.5,
            locationRate: null,
            // NOTE: code is NOT included in updateData
        };

        surgeon = await Surgeon.findByIdAndUpdate(surgeon._id, updateData, { new: true });

        console.log('\n✅ Surgeon updated successfully');
        console.log('   Code (unchanged):', surgeon.code);
        console.log('   Name:', surgeon.firstName, surgeon.lastName);
        console.log('   Phone:', surgeon.phone);
        console.log('   New contract: percentage @ 52.5%');

        // Verify the code wasn't changed
        const tests = [
            { name: 'firstName updated', passed: surgeon.firstName === 'UpdatedManual' },
            { name: 'phone updated', passed: surgeon.phone === '0550555555' },
            { name: 'contract type changed', passed: surgeon.contractType === 'percentage' },
            { name: 'percentage rate set', passed: surgeon.percentageRate === 52.5 },
            { name: 'location rate cleared', passed: surgeon.locationRate === null },
            { name: 'code preserved', passed: surgeon.code === 'SR-MANUAL' }
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
            console.log('\n🎉 All tests passed! Manual code surgeons can now be updated.');
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

testUpdateWithoutCodeValidation();
