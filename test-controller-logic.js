const mongoose = require('mongoose');
const Surgeon = require('./models/Surgeon');
const Specialty = require('./models/Specialty');
require('dotenv').config();

const testControllerLogic = async () => {
    try {
        console.log('Testing controller logic with form data...\n');
        
        await mongoose.connect(process.env.DB_URL);
        
        // Get a specialty
        const specialty = await Specialty.findOne();
        if (!specialty) {
            console.log('❌ No specialties found');
            process.exit(1);
        }

        // Simulate req.body from form submission
        const req_body = {
            firstName: 'TestDoctor',
            lastName: 'Surgeon',
            dateOfBirth: '1985-05-20',
            phone: '0550999888',
            specialty: specialty._id.toString(),
            contractType: 'location',
            locationRate: '75000',
            autoGenerate: 'on'
        };

        console.log('Simulated form submission (req.body):');
        console.log(JSON.stringify(req_body, null, 2));
        console.log('\n');

        // Test the validation logic from controller
        const { firstName, lastName, email, phone, specialty: spec, degree, contractType, locationRate, percentageRate, code, autoGenerate } = req_body;

        console.log('Extracted values:');
        console.log('- firstName:', firstName);
        console.log('- lastName:', lastName);
        console.log('- specialty:', spec);
        console.log('- contractType:', contractType);
        console.log('\n');

        // Test validation
        if (!firstName || !lastName || !spec || !contractType) {
            console.log('❌ VALIDATION FAILED - Missing required fields!');
            console.log('Missing:');
            if (!firstName) console.log('  - firstName');
            if (!lastName) console.log('  - lastName');
            if (!spec) console.log('  - specialty');
            if (!contractType) console.log('  - contractType');
            process.exit(1);
        }

        console.log('✅ All validation checks passed!\n');

        // Test code generation
        let finalCode = '';

        if (autoGenerate || !code) {
            const allSurgeons = await Surgeon.find({ code: /^SR-\d{5}$/ }).sort({ code: -1 });
            
            let nextNumber = 1;
            if (allSurgeons.length > 0) {
                const lastCode = allSurgeons[0].code;
                const match = lastCode.match(/^SR-(\d{5})$/);
                if (match) {
                    const lastNumber = parseInt(match[1]);
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }
            }
            
            finalCode = `SR-${nextNumber.toString().padStart(5, "0")}`;
            console.log('✅ Auto-generated code:', finalCode);
        }

        // Test surgeon creation
        const surgeonData = {
            ...req_body,
            code: finalCode
        };

        const surgeon = new Surgeon(surgeonData);
        const result = await surgeon.save();

        console.log('\n✅ SURGEON CREATED SUCCESSFULLY!');
        console.log('\nCreated surgeon:');
        console.log(JSON.stringify(result.toObject(), null, 2));

        // Clean up
        await Surgeon.deleteOne({ _id: result._id });
        console.log('\n✅ Test data cleaned up');

        console.log('\n🎉 Form submission would work correctly with the fix!');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

testControllerLogic();
