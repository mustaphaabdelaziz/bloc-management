#!/usr/bin/env node
// scripts/linkUsersToSurgeons.js
// Idempotent script to populate user.surgeon field by matching user.email to Surgeon.email

const connectDB = require('../database/connection');
const mongoose = require('mongoose');
const User = require('../models/User');
const Surgeon = require('../models/Surgeon');

async function run() {
  await connectDB();
  try {
    const surgeons = await Surgeon.find().select('_id email');
    const emailToId = new Map();
    surgeons.forEach(s => {
      if (s.email) emailToId.set(s.email.toLowerCase(), s._id);
    });

    const users = await User.find().select('email surgeon');
    let updated = 0;
    for (const user of users) {
      if (user.surgeon) continue; // already linked
      if (!user.email) continue;
      const sid = emailToId.get(user.email.toLowerCase());
      if (sid) {
        user.surgeon = sid;
        await user.save();
        updated++;
        console.log(`Linked user ${user._id} -> surgeon ${sid}`);
      }
    }
    console.log(`Migration complete. Updated ${updated} users.`);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    mongoose.connection.close();
  }
}

run();
