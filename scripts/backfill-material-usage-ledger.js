#!/usr/bin/env node
/**
 * Backfill Material Usage Ledger Script
 * 
 * This script populates the usedInSurgeries[] array on all materials
 * based on existing surgery data. Run this once after deploying the
 * ledger feature to migrate historical data.
 * 
 * Usage:
 *   node scripts/backfill-material-usage-ledger.js
 *   
 * Options (via environment variables):
 *   CLEAR_FIRST=true    - Clear existing ledger entries before backfill (default: true)
 *   BATCH_SIZE=100      - Number of surgeries to process per batch (default: 100)
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to database
const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/bloc-management';

async function main() {
    console.log('='.repeat(60));
    console.log('Material Usage Ledger Backfill Script');
    console.log('='.repeat(60));
    console.log(`Database: ${DB_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    console.log('');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(DB_URL);
        console.log('✓ Connected to MongoDB');
        
        // Load models (must be after connection)
        require('../models/Material');
        require('../models/Surgery');
        require('../models/Patient');
        require('../models/Surgeon');
        
        // Load the ledger helper
        const { backfillAllSurgeries } = require('../utils/materialUsageLedger');
        
        // Parse options
        const clearFirst = process.env.CLEAR_FIRST !== 'false';
        const batchSize = parseInt(process.env.BATCH_SIZE) || 100;
        
        console.log(`Options: clearFirst=${clearFirst}, batchSize=${batchSize}`);
        console.log('');
        
        // Run backfill
        const startTime = Date.now();
        const result = await backfillAllSurgeries({ clearFirst, batchSize });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('');
        console.log('='.repeat(60));
        console.log('Backfill Complete');
        console.log('='.repeat(60));
        console.log(`Surgeries processed: ${result.processed}/${result.total}`);
        console.log(`Time elapsed: ${elapsed}s`);
        console.log('');
        
        // Show sample stats
        const Material = mongoose.model('Material');
        const sampleMaterials = await Material.find({ 'usedInSurgeries.0': { $exists: true } })
            .select('code designation usedInSurgeries')
            .limit(5);
        
        if (sampleMaterials.length > 0) {
            console.log('Sample materials with usage data:');
            sampleMaterials.forEach(m => {
                const totalQty = m.usedInSurgeries.reduce((sum, u) => sum + u.quantity, 0);
                console.log(`  - ${m.code}: ${m.designation.substring(0, 30)}... (${m.usedInSurgeries.length} surgeries, ${totalQty} units)`);
            });
        }
        
        console.log('');
        console.log('✓ Backfill completed successfully');
        
    } catch (error) {
        console.error('✗ Error during backfill:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('✓ Disconnected from MongoDB');
    }
}

main();
