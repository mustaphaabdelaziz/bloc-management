// scripts/migrate-asa-to-flat-fee.js
/**
 * ASA Pricing Migration Script
 * 
 * Migrates existing ASA pricing records from old structure (surgeonFee, clinicFee, urgentMultiplier)
 * to new flat fee structure (single fee field).
 * 
 * This is a ONE-TIME migration script.
 * 
 * Usage: node scripts/migrate-asa-to-flat-fee.js [--dry-run]
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import model
const AsaPricing = require(path.join(__dirname, '../models/AsaPricing'));

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

async function migrateAsaPricing() {
  try {
    console.log('\n🔄 ASA Pricing Migration Script');
    console.log('================================\n');

    if (isDryRun) {
      console.log('⚠️  DRY-RUN MODE: No database changes will be made.\n');
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database\n');

    // Check existing records
    console.log('📋 Checking existing ASA pricing records...');
    const existingRecords = await mongoose.connection.db.collection('asapricings').find({}).toArray();
    
    console.log(`📊 Found ${existingRecords.length} existing records\n`);

    if (existingRecords.length === 0) {
      console.log('✅ No existing records found.');
      console.log('💡 Recommendation: Initialize default pricing via admin UI (/asa-pricing)\n');
      process.exit(0);
    }

    // Analyze records
    console.log('🔍 Analyzing records...\n');
    const migrations = [];

    for (const record of existingRecords) {
      const hasOldFields = record.surgeonFee !== undefined || record.clinicFee !== undefined;
      const hasNewField = record.fee !== undefined;

      if (hasOldFields && !hasNewField) {
        // Need migration
        // Strategy: Use clinicFee as the new fee (since location surgeons pay to clinic)
        // Fallback to surgeonFee if clinicFee missing
        const newFee = record.clinicFee || record.surgeonFee || 0;
        
        migrations.push({
          class: record.class,
          oldSurgeonFee: record.surgeonFee,
          oldClinicFee: record.clinicFee,
          oldMultiplier: record.urgentMultiplier,
          newFee: newFee,
          action: 'UPDATE'
        });
      } else if (hasNewField) {
        console.log(`✓ ASA ${record.class} - Already migrated (fee: ${record.fee})`);
      } else {
        console.log(`⚠️  ASA ${record.class} - No valid data found`);
      }
    }

    if (migrations.length === 0) {
      console.log('\n✅ All records already migrated or no migration needed.');
      process.exit(0);
    }

    // Show migration plan
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION PLAN');
    console.log('='.repeat(80));

    migrations.forEach(m => {
      console.log(`\n📋 ASA ${m.class}`);
      console.log(`   OLD - Surgeon Fee: ${m.oldSurgeonFee} DA`);
      console.log(`   OLD - Clinic Fee:  ${m.oldClinicFee} DA`);
      console.log(`   OLD - Multiplier:  ${m.oldMultiplier}x`);
      console.log(`   NEW - Flat Fee:    ${m.newFee} DA`);
      console.log(`   Strategy: Using clinic fee as new fee (location surgeons pay to clinic)`);
    });

    console.log('\n' + '='.repeat(80));

    if (isDryRun) {
      console.log('\n⚠️  DRY-RUN MODE: No changes made to database.');
      console.log('💡 Run without --dry-run to apply changes.\n');
      process.exit(0);
    }

    // Confirm before applying
    console.log('\n⚠️  WARNING: This will modify ASA pricing records.');
    console.log('📌 Recommendation: Backup database before proceeding.');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Apply migrations
    console.log('🚀 Applying migrations...\n');
    let updated = 0;
    let errors = 0;

    for (const migration of migrations) {
      try {
        const result = await mongoose.connection.db.collection('asapricings').updateOne(
          { class: migration.class },
          {
            $set: {
              fee: migration.newFee
            },
            $unset: {
              surgeonFee: "",
              clinicFee: "",
              urgentMultiplier: ""
            }
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`✓ ASA ${migration.class} - Migrated (fee: ${migration.newFee} DA)`);
          updated++;
        } else {
          console.log(`⏭️  ASA ${migration.class} - No changes needed`);
        }
      } catch (err) {
        console.error(`✗ ASA ${migration.class} - ERROR:`, err.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✓ Updated: ${updated}`);
    console.log(`✗ Errors: ${errors}`);
    console.log(`📊 Total: ${migrations.length}`);
    console.log('='.repeat(80));

    if (errors === 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📌 Next Steps:');
      console.log('   1. Verify ASA pricing via admin UI (/asa-pricing)');
      console.log('   2. Adjust fees if needed');
      console.log('   3. Run recalculation script: node scripts/recalculate-asa-fees.js --dry-run');
      console.log('   4. Review changes and apply: node scripts/recalculate-asa-fees.js\n');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review and fix manually.\n');
    }

    process.exit(errors > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err);
    process.exit(1);
  }
}

// Run the script
migrateAsaPricing();
