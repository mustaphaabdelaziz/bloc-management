/**
 * Migration Script: Initialize stockValue for Existing Materials
 * 
 * This script calculates and sets the initial stockValue for all materials
 * in the database that don't have this field set.
 * 
 * Strategy:
 * - For materials with stock > 0: stockValue = stock × priceHT (conservative approach)
 * - For materials with stock = 0: stockValue = 0
 * 
 * Alternative strategies (commented out):
 * - Sum all arrivals (includes consumed quantities - not accurate)
 * - Use current stock × weighted average from arrivals
 * 
 * Run: node scripts/migrateStockValue.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Material = require('../models/Material');

async function migrateStockValue() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URL);
    console.log('✓ Connected to database');

    // Find all materials that need migration (stockValue not set or = 0)
    const materials = await Material.find({});
    console.log(`Found ${materials.length} materials to process\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const material of materials) {
      try {
        // Skip if stockValue already set and > 0
        if (material.stockValue > 0) {
          console.log(`⊘ Skipping ${material.code} - stockValue already set (${material.stockValue.toFixed(2)} DA)`);
          skipped++;
          continue;
        }

        // Calculate initial stock value
        let newStockValue = 0;

        if (material.stock > 0) {
          // Strategy: Use current stock × base price (conservative approach)
          newStockValue = material.stock * material.priceHT;
          
          console.log(`Processing: ${material.code} (${material.designation})`);
          console.log(`  Stock: ${material.stock} ${material.unitOfMeasure}`);
          console.log(`  Base Price: ${material.priceHT.toFixed(2)} DA`);
          console.log(`  Calculated stockValue: ${newStockValue.toFixed(2)} DA`);
        } else {
          console.log(`⊘ ${material.code} - No stock, setting stockValue = 0`);
        }

        // Update material
        material.stockValue = newStockValue;
        await material.save();
        
        console.log(`✓ Updated ${material.code}\n`);
        updated++;

      } catch (err) {
        console.error(`✗ Error updating ${material.code}:`, err.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total materials processed: ${materials.length}`);
    console.log(`✓ Successfully updated: ${updated}`);
    console.log(`⊘ Skipped (already set): ${skipped}`);
    console.log(`✗ Errors: ${errors}`);
    console.log('='.repeat(60));

    if (errors === 0) {
      console.log('\n✓ Migration completed successfully!');
    } else {
      console.log('\n⚠ Migration completed with errors. Review above.');
    }

  } catch (error) {
    console.error('✗ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run migration
migrateStockValue();
