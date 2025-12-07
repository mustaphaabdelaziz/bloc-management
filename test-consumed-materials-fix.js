/**
 * Test to verify that consumedMaterials are properly inserted when creating a surgery
 * 
 * This test simulates the complete flow:
 * 1. User fills in surgery form
 * 2. Selects materials from datalist
 * 3. Form submits with material IDs and quantities
 * 4. Controller processes materials and inserts into consumedMaterials array
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Surgery = require("./models/Surgery");
const Patient = require("./models/Patient");
const Surgeon = require("./models/Surgeon");
const Prestation = require("./models/Prestation");
const Material = require("./models/Material");

async function testConsumedMaterialsInsertion() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URL);
    console.log("✓ Connected to database\n");

    // Get test data
    const patient = await Patient.findOne();
    const surgeon = await Surgeon.findOne().populate("specialty");
    const prestation = await Prestation.findOne().populate("specialty");
    const materials = await Material.find().limit(3);

    if (!patient || !surgeon || !prestation || materials.length < 2) {
      console.error("✗ Missing required test data");
      process.exit(1);
    }

    console.log("=== TEST: consumedMaterials Insertion ===\n");
    console.log("Test Data:");
    console.log(`  Patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`  Surgeon: ${surgeon.firstName} ${surgeon.lastName}`);
    console.log(`  Prestation: ${prestation.designation}`);
    console.log(`  Materials available: ${materials.length}\n`);

    // Test Case 1: Surgery with consumable and patient materials
    console.log("TEST CASE 1: Surgery with mixed materials");
    console.log("=========================================");

    const consumableMat = materials.find(m => m.category === 'consumable');
    const patientMat = materials.find(m => m.category === 'patient');

    if (!consumableMat || !patientMat) {
      console.log("⚠ Insufficient material types in database, using available materials");
    }

    const testMat1 = materials[0];
    const testMat2 = materials[1];

    // Simulate form submission data structure
    const formData = {
      code: `TEST-CONSUMED-${Date.now()}`,
      patient: patient._id.toString(),
      surgeon: surgeon._id.toString(),
      prestation: prestation._id.toString(),
      incisionTime: new Date(),
      status: "planned",
      // Form sends arrays for each field
      consumableMaterialId: [testMat1._id.toString()],
      consumableMaterialQuantity: ["2"],
      patientMaterialId: [testMat2._id.toString()],
      patientMaterialQuantity: ["3"],
    };

    console.log("Form data structure:");
    console.log(`  consumableMaterialId: [${formData.consumableMaterialId}]`);
    console.log(`  consumableMaterialQuantity: ["${formData.consumableMaterialQuantity}"]`);
    console.log(`  patientMaterialId: [${formData.patientMaterialId}]`);
    console.log(`  patientMaterialQuantity: ["${formData.patientMaterialQuantity}"]`);

    // Simulate controller processing
    console.log("\nProcessing materials (simulating controller)...");
    const consumedMaterials = [];

    // Process consumable materials
    if (formData.consumableMaterialId && formData.consumableMaterialQuantity) {
      const consumableArray = Array.isArray(formData.consumableMaterialId) 
        ? formData.consumableMaterialId 
        : [formData.consumableMaterialId];
      const consumableQuantityArray = Array.isArray(formData.consumableMaterialQuantity) 
        ? formData.consumableMaterialQuantity 
        : [formData.consumableMaterialQuantity];

      for (let index = 0; index < consumableArray.length; index++) {
        const materialId = consumableArray[index] ? String(consumableArray[index]).trim() : '';
        const quantity = consumableQuantityArray[index] ? String(consumableQuantityArray[index]).trim() : '';

        if (materialId && quantity) {
          const materialDoc = await Material.findById(materialId);
          if (materialDoc) {
            consumedMaterials.push({
              material: materialId,
              quantity: parseFloat(quantity),
              priceUsed: materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
            });
            console.log(`  ✓ Consumable: ${materialDoc.designation} x${quantity}`);
          }
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

      for (let index = 0; index < patientArray.length; index++) {
        const material = patientArray[index] ? String(patientArray[index]).trim() : '';
        const qty = patientQuantityArray[index] ? String(patientQuantityArray[index]).trim() : '';

        if (material && qty) {
          const materialDoc = await Material.findById(material);
          if (materialDoc) {
            consumedMaterials.push({
              material: material,
              quantity: parseFloat(qty),
              priceUsed: materialDoc.sellingPriceHT || materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
            });
            console.log(`  ✓ Patient material: ${materialDoc.designation} x${qty}`);
          }
        }
      }
    }

    if (consumedMaterials.length === 0) {
      console.error("✗ ERROR: No materials were processed!");
      process.exit(1);
    }

    console.log(`\n✓ Total materials to insert: ${consumedMaterials.length}`);

    // Create surgery with materials
    console.log("\nCreating surgery with consumedMaterials...");
    const surgery = new Surgery({
      code: formData.code,
      patient: formData.patient,
      surgeon: formData.surgeon,
      prestation: formData.prestation,
      incisionTime: formData.incisionTime,
      status: formData.status,
      consumedMaterials: consumedMaterials,
    });

    await surgery.save();
    console.log(`✓ Surgery created: ${surgery._id}`);

    // Verify surgery was saved with materials
    const savedSurgery = await Surgery.findById(surgery._id).populate("consumedMaterials.material");

    if (!savedSurgery) {
      console.error("✗ ERROR: Surgery not found after save!");
      process.exit(1);
    }

    console.log(`\nVerifying saved surgery:`);
    console.log(`  Code: ${savedSurgery.code}`);
    console.log(`  consumedMaterials count: ${savedSurgery.consumedMaterials.length}`);

    if (savedSurgery.consumedMaterials.length === 0) {
      console.error("✗ ERROR: consumedMaterials is empty after save!");
      process.exit(1);
    }

    console.log("\nSaved materials:");
    savedSurgery.consumedMaterials.forEach((cm, idx) => {
      const matName = cm.material ? cm.material.designation : 'Unknown';
      console.log(`  [${idx}] ${matName} x${cm.quantity} @ ${cm.priceUsed}/unit`);
    });

    console.log("\n=== TEST PASSED ===");
    console.log(`✓ consumedMaterials properly inserted (${savedSurgery.consumedMaterials.length} items)`);

    // Cleanup
    await Surgery.deleteOne({ _id: surgery._id });
    console.log("✓ Test surgery cleaned up");

    await mongoose.connection.close();
  } catch (error) {
    console.error("✗ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testConsumedMaterialsInsertion();
