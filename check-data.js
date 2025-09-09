const mongoose = require('mongoose');
require('dotenv').config();
const Patient = require('./models/Patient');
const Surgeon = require('./models/Surgeon');
const Prestation = require('./models/Prestation');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const patientCount = await Patient.countDocuments();
    const surgeonCount = await Surgeon.countDocuments();
    const prestationCount = await Prestation.countDocuments();

    console.log('Patients:', patientCount);
    console.log('Surgeons:', surgeonCount);
    console.log('Prestations:', prestationCount);

    if (patientCount > 0) {
      const patients = await Patient.find().limit(3);
      console.log('Sample patients:', patients.map(p => ({ name: p.firstName + ' ' + p.lastName, code: p.code })));
    }

    if (surgeonCount > 0) {
      const surgeons = await Surgeon.find().populate('specialty').limit(3);
      console.log('Sample surgeons:', surgeons.map(s => ({ name: s.firstName + ' ' + s.lastName, specialty: s.specialty?.name })));
    }

    if (prestationCount > 0) {
      const prestations = await Prestation.find().populate('specialty').limit(3);
      console.log('Sample prestations:', prestations.map(p => ({ designation: p.designation, specialty: p.specialty?.name })));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkData();
