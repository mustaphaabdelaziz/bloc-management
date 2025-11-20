/**
 * Test script to verify auto-code generation for Fonction, Prestation, and Surgery
 * Run with: node test-autogen.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Fonction = require("./models/Fonction");
const Prestation = require("./models/Prestation");
const Specialty = require("./models/Specialty");
const Surgery = require("./models/Surgery");
const Patient = require("./models/Patient");
const Surgeon = require("./models/Surgeon");

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/bloc-management";

async function runTests() {
  try {
    // Connect to database
    console.log("📡 Connecting to database...");
    await mongoose.connect(DB_URL);
    console.log("✅ Connected to MongoDB\n");

    // Test 1: Fonction auto-generation
    console.log("🧪 TEST 1: Fonction Auto-Generation");
    console.log("====================================");
    try {
      // Clear existing test data
      await Fonction.deleteMany({ code: { $regex: "^FCT" } });
      
      // Create without code
      const fonction = new Fonction({
        name: "Test Anesthésiste",
        description: "Test auto-generation"
      });
      console.log("Before save - code:", fonction.code || "(not set)");
      
      await fonction.save();
      console.log("After save - code:", fonction.code);
      console.log("✅ Fonction created with auto-generated code\n");
    } catch (error) {
      console.log("❌ Fonction test failed:", error.message, "\n");
    }

    // Test 2: Prestation auto-generation
    console.log("🧪 TEST 2: Prestation Auto-Generation");
    console.log("=====================================");
    try {
      // Get a specialty
      let specialty = await Specialty.findOne();
      if (!specialty) {
        specialty = await Specialty.create({
          name: "Test Specialité",
          code: "TST"
        });
      }

      // Clear existing test data for this specialty
      await Prestation.deleteMany({ 
        code: { $regex: `^CO-${specialty.code}` },
        specialty: specialty._id 
      });
      
      // Create without code
      const prestation = new Prestation({
        designation: "Test Prestation",
        specialty: specialty._id,
        priceHT: 1000,
        tva: 0.09,
        duration: 60
      });
      console.log("Before save - code:", prestation.code || "(not set)");
      
      await prestation.save();
      console.log("After save - code:", prestation.code);
      console.log("✅ Prestation created with auto-generated code\n");
    } catch (error) {
      console.log("❌ Prestation test failed:", error.message, "\n");
    }

    // Test 3: Surgery auto-generation
    console.log("🧪 TEST 3: Surgery Auto-Generation");
    console.log("===================================");
    try {
      // Get or create test data
      let patient = await Patient.findOne();
      if (!patient) {
        patient = await Patient.create({
          firstname: "Test",
          lastname: "Patient",
          email: "test@example.com"
        });
      }

      let surgeon = await Surgeon.findOne();
      if (!surgeon) {
        const specialty = await Specialty.findOne();
        surgeon = await Surgeon.create({
          firstname: "Test",
          lastname: "Surgeon",
          email: "test-surgeon@example.com",
          specialty: specialty._id
        });
      }

      let prestation = await Prestation.findOne();
      if (!prestation) {
        const specialty = await Specialty.findOne();
        prestation = await Prestation.create({
          designation: "Test",
          specialty: specialty._id,
          priceHT: 1000,
          duration: 60
        });
      }

      // Clear existing test data for current year
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear + 1, 0, 1);
      await Surgery.deleteMany({
        code: { $regex: `^${currentYear}/` },
        createdAt: { $gte: startOfYear, $lt: endOfYear }
      });
      
      // Create without code
      const surgery = new Surgery({
        patient: patient._id,
        surgeon: surgeon._id,
        prestation: prestation._id,
        beginDateTime: new Date(),
        endDateTime: new Date(new Date().getTime() + 60 * 60 * 1000)
      });
      console.log("Before save - code:", surgery.code || "(not set)");
      
      await surgery.save();
      console.log("After save - code:", surgery.code);
      console.log("✅ Surgery created with auto-generated code\n");
    } catch (error) {
      console.log("❌ Surgery test failed:", error.message, "\n");
    }

    console.log("🎉 All tests completed!");
    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

runTests();
