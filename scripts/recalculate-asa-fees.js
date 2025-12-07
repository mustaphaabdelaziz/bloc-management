#!/usr/bin/env node
/**
 * Recalculate ASA Fees for All Surgeries
 * 
 * This script reprocesses all surgeries to apply the new ASA fee logic:
 * - Location contracts: ASA fees go to clinic only (surgeon gets 0)
 * - Percentage contracts: No ASA fees
 * - Urgent multiplier: Based on surgery.status (not asaUrgent flag)
 * 
 * Usage: node scripts/recalculate-asa-fees.js [--dry-run] [--surgeonId=ID]
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import models
const Surgery = require(path.join(__dirname, '../models/Surgery'));
const Surgeon = require(path.join(__dirname, '../models/Surgeon'));

// Import controller for fee calculation
const { calculateSurgeonFees } = require(path.join(__dirname, '../controller/surgery.controller.js'));

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const surgeonIdArg = args.find(arg => arg.startsWith('--surgeonId='));
const surgeonId = surgeonIdArg ? surgeonIdArg.split('=')[1] : null;

const BATCH_SIZE = 50;

async function recalculateAllFees() {
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database\n');

    // Build query
    let query = {};
    if (surgeonId) {
      query.surgeon = mongoose.Types.ObjectId(surgeonId);
      console.log(`🔍 Filtering for surgeon: ${surgeonId}`);
    }

    // Get all surgeries
    console.log('📋 Fetching surgeries...');
    const totalCount = await Surgery.countDocuments(query);
    console.log(`📊 Found ${totalCount} surgeries to process\n`);

    if (totalCount === 0) {
      console.log('⚠️  No surgeries found matching criteria.');
      process.exit(0);
    }

    let processed = 0;
    let errors = 0;
    let skipped = 0;
    const changes = [];

    // Process in batches
    for (let skip = 0; skip < totalCount; skip += BATCH_SIZE) {
      const surgeries = await Surgery.find(query)
        .populate('surgeon')
        .populate('prestation')
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      for (const surgery of surgeries) {
        try {
          // Get old amounts
          const oldSurgeonAmount = surgery.surgeonAmount;
          const oldClinicAmount = surgery.clinicAmount;

          // Calculate new fees (this is async, so we need the full document)
          const surgeryFull = await Surgery.findById(surgery._id)
            .populate('surgeon')
            .populate('prestation')
            .populate('consumedMaterials.material')
            .populate('medicalStaff.staff');

          if (!surgeryFull || !surgeryFull.surgeon || !surgeryFull.prestation) {
            console.log(`⏭️  SKIP ${surgery.code} - Missing surgeon or prestation`);
            skipped++;
            continue;
          }

          // In dry-run, we manually calculate; otherwise use the controller
          if (isDryRun) {
            // Simulate calculation (simplified - just to show what would happen)
            console.log(`🧮 [DRY-RUN] Would recalculate ${surgery.code}`);
            console.log(`   Surgeon: ${surgeryFull.surgeon.firstName} ${surgeryFull.surgeon.lastName} (${surgeryFull.surgeon.contractType})`);
            console.log(`   ASA Class: ${surgery.asaClass || 'None'}`);
          } else {
            // Actually recalculate
            await calculateSurgeonFees(surgery._id);
            
            // Fetch updated surgery to show changes
            const updated = await Surgery.findById(surgery._id);
            const newSurgeonAmount = updated.surgeonAmount;
            const newClinicAmount = updated.clinicAmount;

            if (oldSurgeonAmount !== newSurgeonAmount || oldClinicAmount !== newClinicAmount) {
              const change = {
                code: surgery.code,
                surgeon: `${surgeryFull.surgeon.firstName} ${surgeryFull.surgeon.lastName}`,
                contractType: surgeryFull.surgeon.contractType,
                asaClass: surgery.asaClass || 'None',
                status: surgery.status,
                oldSurgeonAmount,
                newSurgeonAmount,
                surgeonDelta: newSurgeonAmount - oldSurgeonAmount,
                oldClinicAmount,
                newClinicAmount,
                clinicDelta: newClinicAmount - oldClinicAmount
              };
              changes.push(change);
              console.log(`✓ ${surgery.code} - Updated`);
            } else {
              console.log(`↔️  ${surgery.code} - No change`);
            }
          }

          processed++;
        } catch (err) {
          console.error(`✗ ERROR ${surgery.code}:`, err.message);
          errors++;
        }
      }

      // Progress indicator
      if (!isDryRun) {
        const percent = Math.round((processed + skipped) / totalCount * 100);
        console.log(`📈 Progress: ${processed + skipped}/${totalCount} (${percent}%)\n`);
      }
    }

    // Summary Report
    console.log('\n' + '='.repeat(80));
    console.log('RECALCULATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✓ Processed: ${processed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`✗ Errors: ${errors}`);
    console.log(`💾 Total: ${processed + skipped + errors}`);
    console.log(`🏃 Mode: ${isDryRun ? 'DRY-RUN (no changes made)' : 'LIVE (changes saved)'}`);

    // Show top changes if any
    if (changes.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('TOP CHANGES (First 10)');
      console.log('='.repeat(80));
      
      changes.slice(0, 10).forEach(change => {
        console.log(`\n📊 ${change.code} | ${change.surgeon} (${change.contractType})`);
        console.log(`   ASA Class: ${change.asaClass} | Status: ${change.status}`);
        console.log(`   Surgeon: ${change.oldSurgeonAmount} → ${change.newSurgeonAmount} (${change.surgeonDelta >= 0 ? '+' : ''}${change.surgeonDelta})`);
        console.log(`   Clinic:  ${change.oldClinicAmount} → ${change.newClinicAmount} (${change.clinicDelta >= 0 ? '+' : ''}${change.clinicDelta})`);
      });

      if (changes.length > 10) {
        console.log(`\n... and ${changes.length - 10} more changes`);
      }

      // Aggregate stats
      const totalSurgeonDelta = changes.reduce((sum, c) => sum + c.surgeonDelta, 0);
      const totalClinicDelta = changes.reduce((sum, c) => sum + c.clinicDelta, 0);
      console.log('\n' + '-'.repeat(80));
      console.log('AGGREGATE IMPACT');
      console.log('-'.repeat(80));
      console.log(`Surgeon Compensation Delta: ${totalSurgeonDelta >= 0 ? '+' : ''}${totalSurgeonDelta.toFixed(2)} DZD`);
      console.log(`Clinic Revenue Delta: ${totalClinicDelta >= 0 ? '+' : ''}${totalClinicDelta.toFixed(2)} DZD`);
    } else if (!isDryRun) {
      console.log('\n✅ All surgeries already have correct amounts.');
    }

    console.log('\n' + '='.repeat(80));

    process.exit(errors > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err);
    process.exit(1);
  }
}

// Run the script
console.log('\n🚀 ASA Fee Recalculation Script');
console.log('================================\n');

if (isDryRun) {
  console.log('⚠️  DRY-RUN MODE: No database changes will be made.\n');
}

recalculateAllFees();
