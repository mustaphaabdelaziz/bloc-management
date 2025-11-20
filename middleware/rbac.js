// middleware/rbac.js
// Role-based access control helpers for Express
// Assumes req.isAuthenticated(), req.user and req.user.privileges (array of strings)
// Uses req.flash and res.redirect for web pages; for API requests returns 401/403 JSON.

const mongoose = require('mongoose');

const isApiRequest = (req) => {
  const accept = req.headers && req.headers.accept ? req.headers.accept : '';
  return (req.originalUrl && req.originalUrl.startsWith('/api')) || accept.includes('application/json');
};

function sendUnauthorized(req, res, message = 'Accès non autorisé', redirectUrl = '/') {
  if (isApiRequest(req)) {
    return res.status(403).json({ error: message });
  }
  req.flash('error', message);
  return res.redirect(redirectUrl);
}

// Generic guard factory: require any of these privileges
function requireAny(...requiredPrivileges) {
  return (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return sendUnauthorized(req, res, 'Vous devez être connecté', '/login');
    }
    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    if (userPriv.includes('admin')) return next(); // admin override
    for (const p of requiredPrivileges) {
      if (userPriv.includes(p)) return next();
    }
    return sendUnauthorized(req, res, `Accès non autorisé - droit requis: ${requiredPrivileges.join(' ou ')}`);
  };
}

// Specific role middlewares
const ensureAdmin = requireAny('admin');
const ensureDirection = requireAny('direction');
const ensureHeadDepart = requireAny('headDepart');
const ensureAssistante = requireAny('assistante');
const ensureBuyer = requireAny('buyer');

// Combined role checks for common use cases
const ensureAdminOrDirection = requireAny('admin', 'direction');
const ensureManagementAccess = requireAny('admin', 'direction'); // Only admin/direction can manage (headDepart excluded)
const ensureMaterialsAccess = requireAny('admin', 'buyer', 'headDepart'); // Can manage materials (admin, buyer, headDepart)
const ensureViewPatients = requireAny('admin', 'direction', 'headDepart', 'assistante'); // Can view patients
const ensureViewSurgeries = requireAny('admin', 'direction', 'headDepart', 'assistante'); // Can view surgeries
const ensureViewMaterials = requireAny('admin', 'direction', 'headDepart', 'buyer'); // Can view materials
const ensureViewPrestations = requireAny('admin', 'direction', 'headDepart'); // Can view prestations
const ensureViewMedicalStaff = requireAny('admin', 'direction', 'headDepart'); // Can view medical staff
const ensureViewSurgeons = requireAny('admin', 'direction', 'headDepart'); // Can view surgeons

// Ownership guard for resource: allow admin and headDepart; allow direction only if linked to the resource
// getResourceOwnerId may return an id or a Promise resolving to an id (ObjectId or string)
function ensureOwnerOrRole(getResourceOwnerId, options = {}) {
  // options.allowedRoles could be used to expand bypass roles
  const allowedRoles = options.allowedRoles || ['admin', 'headDepart'];
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return sendUnauthorized(req, res, 'Vous devez être connecté', '/login');
    }

    const userPriv = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
    // bypass for allowed roles
    for (const role of allowedRoles) {
      if (userPriv.includes(role)) return next();
    }

    // If user is direction, check ownership
    if (userPriv.includes('direction')) {
      try {
        const ownerId = await Promise.resolve(getResourceOwnerId(req));
        if (!ownerId) {
          return sendUnauthorized(req, res, 'Ressource introuvable ou propriétaire inconnu', '/');
        }

        const uid = req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : null;
        // Common patterns: user may have a linked surgeon id stored as user.surgeon or user.surgeonId
        const linkedSurgeonId = req.user && (req.user.surgeon || req.user.surgeonId || req.user.surgeonId === 0 ? req.user.surgeon || req.user.surgeonId : null);

        // Compare strings (ObjectId to string)
        if (String(ownerId) === String(linkedSurgeonId) || String(ownerId) === String(uid)) {
          return next();
        }

        return sendUnauthorized(req, res, 'Accès non autorisé - vous ne pouvez accéder qu\'à vos propres ressources');
      } catch (err) {
        return sendUnauthorized(req, res, 'Erreur lors de la vérification des droits');
      }
    }

    return sendUnauthorized(req, res, 'Accès non autorisé - rôle requis');
  };
}

module.exports = {
  requireAny,
  ensureAdmin,
  ensureDirection,
  ensureHeadDepart,
  ensureAssistante,
  ensureBuyer,
  ensureAdminOrDirection,
  ensureManagementAccess,
  ensureMaterialsAccess,
  ensureViewPatients,
  ensureViewSurgeries,
  ensureViewMaterials,
  ensureViewPrestations,
  ensureViewMedicalStaff,
  ensureViewSurgeons,
  ensureOwnerOrRole,
  sendUnauthorized,
};
