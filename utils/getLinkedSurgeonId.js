// utils/getLinkedSurgeonId.js
// Helper to resolve a Surgeon ObjectId from a user document.
// Looks for common fields: user.surgeon, user.surgeonId, or fallbacks to matching by email.

const Surgeon = require('../models/Surgeon');

module.exports = async function getLinkedSurgeonId(user) {
  if (!user) return null;
  // Direct reference on user
  if (user.surgeon) return user.surgeon;
  if (user.surgeonId) return user.surgeonId;

  // Fallback: try to find Surgeon by email if user.email exists
  if (user.email) {
    const surgeon = await Surgeon.findOne({ email: user.email }).select('_id');
    if (surgeon) return surgeon._id;
  }

  return null;
};
