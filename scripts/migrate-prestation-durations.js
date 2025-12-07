#!/usr/bin/env node

/**
 * Migration script to populate minDuration and maxDuration for existing prestations
 * Run: node scripts/migrate-prestation-durations.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Prestation = require('../models/Prestation');

async function migratePrestationnDurations() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URL || 'mongodb://localhost:27017/blocManagement', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all prestations that don't have minDuration and maxDuration set
    const prestations = await Prestation.find({
      $or: [
        { minDuration: { $exists: false } },
        { maxDuration: { $exists: false } },
      ]
    });

    console.log(`Found ${prestations.length} prestations to migrate`);

    let updated = 0;
    for (const prestation of prestations) {
      // Set minDuration and maxDuration to current duration if not already set
      if (!prestation.minDuration) {
        prestation.minDuration = prestation.duration;
      }
      if (!prestation.maxDuration) {
        prestation.maxDuration = prestation.duration;
      }
      
      await prestation.save();
      updated++;
      console.log(`✓ Migrated prestation: ${prestation.code} (${prestation.designation})`);
    }

    console.log(`\n✓ Migration complete: ${updated} prestations updated`);
    console.log(`  - minDuration set to current duration (informational)`);
    console.log(`  - maxDuration set to current duration (used in fee calculations)`);

    // Show summary stats
    const stats = await Prestation.aggregate([
      {
        $group: {
          _id: null,
          totalPrestations: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          avgMinDuration: { $avg: '$minDuration' },
          avgMaxDuration: { $avg: '$maxDuration' },
          withMinMax: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$minDuration', null] },
                    { $ne: ['$maxDuration', null] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('\nMigration Statistics:');
      console.log(`  Total prestations: ${stat.totalPrestations}`);
      console.log(`  Prestations with min/max duration: ${stat.withMinMax}`);
      console.log(`  Average duration: ${Math.round(stat.avgDuration)} min`);
      console.log(`  Average min duration: ${Math.round(stat.avgMinDuration)} min`);
      console.log(`  Average max duration: ${Math.round(stat.avgMaxDuration)} min`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migratePrestationnDurations();
