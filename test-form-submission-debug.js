/**
 * Test to verify form submission and material data handling
 * 
 * This script tests:
 * 1. How consumedMaterials are processed in createSurgery controller
 * 2. What data structure is expected vs what the form sends
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Surgery = require("./models/Surgery");
const Patient = require("./models/Patient");
const Surgeon = require("./models/Surgeon");
const Prestation = require("./models/Prestation");
const Material = require("./models/Material");

async function testMaterialSubmission() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URL);
    console.log("✓ Connected to database");

    // Get sample data
    const patient = await Patient.findOne();
    const surgeon = await Surgeon.findOne().populate("specialty");
    const prestation = await Prestation.findOne().populate("specialty");
    const materials = await Material.find().limit(2);

    if (!patient || !surgeon || !prestation || materials.length < 2) {
      console.error("✗ Missing required test data");
      process.exit(1);
    }

    console.log("\n=== Test Scenario 1: Form submission simulation ===");
    console.log("Expected form data when user selects materials:");
    
    // Simulate what the form SHOULD send
    const formData = {
      code: "TEST-MAT-001",
      patient: patient._id.toString(),
      surgeon: surgeon._id.toString(),
      prestation: prestation._id.toString(),
      incisionTime: new Date().toISOString(),
      status: "planned",
      // CONSUMABLE MATERIALS - form names
      consumableMaterialId: [materials[0]._id.toString()], // Array of IDs
      consumableMaterialQuantity: ["2"], // Array of quantities
      // PATIENT MATERIALS - form names
      patientMaterialId: [materials[1]._id.toString()],
      patientMaterialQuantity: ["3"],
    };

    console.log("Form data structure:", JSON.stringify(formData, null, 2));

    // Test material processing (simulate controller logic)
    console.log("\n=== Test Scenario 2: Controller processing ===");
    
    const consumedMaterials = [];

    // Process consumable materials (from controller lines 211-228)
    if (formData.consumableMaterialId && formData.consumableMaterialQuantity) {
      const consumableArray = Array.isArray(formData.consumableMaterialId) 
        ? formData.consumableMaterialId 
        : [formData.consumableMaterialId];
      const consumableQuantityArray = Array.isArray(formData.consumableMaterialQuantity) 
        ? formData.consumableMaterialQuantity 
        : [formData.consumableMaterialQuantity];

      console.log(`Processing ${consumableArray.length} consumable materials...`);
      
      for (let index = 0; index < consumableArray.length; index++) {
        const materialId = consumableArray[index] ? String(consumableArray[index]).trim() : '';
        const quantity = consumableQuantityArray[index] ? String(consumableQuantityArray[index]).trim() : '';
        
        console.log(`  [${index}] materialId: "${materialId}", quantity: "${quantity}"`);
        
        if (materialId && quantity) {
          const materialDoc = await Material.findById(materialId);
          if (materialDoc) {
            const entry = {
              material: materialId,
              quantity: parseFloat(quantity),
              priceUsed: materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
            };
            consumedMaterials.push(entry);
            console.log(`    ✓ Added to consumedMaterials:`, entry);
          } else {
            console.log(`    ✗ Material not found`);
          }
        } else {
          console.log(`    ✗ Skipped: missing materialId or quantity`);
        }
      }
    }

    // Process patient materials
    if (formData.patientMaterialId && formData.patientMaterialQuantity) {
      const patientArray = Array.isArray(formData.patientMaterialId) 
        ? formData.patientMaterialId 
        : [formData.patientMaterialId];
      const patientQuantityArray = Array.isArray(formData.patientMaterialQuantity) 
        ? formData.patientMaterialQuantity 
        : [formData.patientMaterialQuantity];

      console.log(`Processing ${patientArray.length} patient materials...`);
      
      for (let index = 0; index < patientArray.length; index++) {
        const material = patientArray[index] ? String(patientArray[index]).trim() : '';
        const qty = patientQuantityArray[index] ? String(patientQuantityArray[index]).trim() : '';
        
        console.log(`  [${index}] materialId: "${material}", quantity: "${qty}"`);
        
        if (material && qty) {
          const materialDoc = await Material.findById(material);
          if (materialDoc) {
            const entry = {
              material: material,
              quantity: parseFloat(qty),
              priceUsed: materialDoc.sellingPriceHT || materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
            };
            consumedMaterials.push(entry);
            console.log(`    ✓ Added to consumedMaterials:`, entry);
          } else {
            console.log(`    ✗ Material not found`);
          }
        } else {
          console.log(`    ✗ Skipped: missing materialId or quantity`);
        }
      }
    }

    console.log("\n=== Test Scenario 3: Problem diagnosis ===");
    console.log("If consumedMaterials is empty, check:");
    console.log("1. Are the hidden input fields getting populated with material IDs?");
    console.log("2. Is the form actually submitting the consumableMaterialId/patientMaterialId fields?");
    console.log("3. Are the material IDs and quantities being sent as arrays?");
    console.log("\nFinal consumedMaterials array:");
    console.log(JSON.stringify(consumedMaterials, null, 2));
    
    if (consumedMaterials.length === 0) {
      console.log("\n⚠ WARNING: consumedMaterials is EMPTY!");
      console.log("This means the form is not sending material data to the server.");
      console.log("\nLikely causes:");
      console.log("1. Hidden input fields are empty (datalist selection not working)");
      console.log("2. Quantity fields are empty");
      console.log("3. Form name attributes don't match controller expectations");
    } else {
      console.log(`\n✓ SUCCESS: ${consumedMaterials.length} materials would be inserted`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  }
}

testMaterialSubmission();
