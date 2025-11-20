module.exports.locals = (req, res, next) => {
  const moment = require("moment");

  // Handle query parameter flash messages
  // These messages are meant to be shown after a redirect
  // We add them to flash storage, but only if they don't already exist
  if (req.query.success) {
    req.flash("success", req.query.success);
  }
  if (req.query.error) {
    req.flash("error", req.query.error);
  }

  res.locals.currentUser = req.user;
  res.locals.user = req.user;

  // Compute permission flags for templates so views can show/hide menus consistently
  const privileges = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
  const permissions = {
    isLoggedIn: req.isAuthenticated && req.isAuthenticated(),
    isAdmin: privileges.includes('admin'),
    isDirection: privileges.includes('direction'),
    isHeadDepart: privileges.includes('headDepart'),
    isAssistante: privileges.includes('assistante'),
    isBuyer: privileges.includes('buyer'),
  };
  
  // Convenience derived flags for specific access patterns
  // General abilities
  permissions.canManageMaterials = permissions.isAdmin || permissions.isBuyer || permissions.isHeadDepart;
  permissions.canManageSurgeries = permissions.isAdmin || permissions.isDirection; // headDepart excluded from management
  permissions.canManagePrestations = permissions.isAdmin || permissions.isDirection; // Can manage prestations (actes)
  permissions.canManageSurgeons = permissions.isAdmin || permissions.isDirection; // Can manage surgeons
  permissions.canManageMedicalStaff = permissions.isAdmin || permissions.isDirection; // Can manage medical staff
  permissions.canManageSpecialties = permissions.isAdmin || permissions.isDirection; // Can manage specialties
  permissions.canManageFonctions = permissions.isAdmin || permissions.isDirection; // Can manage fonctions
  permissions.canManageUsers = permissions.isAdmin; // Only admin - restrict from direction
  permissions.canManageSystemConfig = permissions.isAdmin; // Only admin for system configuration - restrict from direction
  
  // View permissions (read-only or limited access)
  permissions.canViewPatients = permissions.isAdmin || permissions.isDirection || permissions.isHeadDepart || permissions.isAssistante;
  permissions.canViewSurgeries = permissions.isAdmin || permissions.isDirection || permissions.isHeadDepart || permissions.isAssistante;
  permissions.canViewReports = permissions.isAdmin || permissions.isDirection;
  permissions.canViewPricing = permissions.isAdmin || permissions.isDirection || permissions.isBuyer; // Can see prices - buyers need material pricing
  permissions.canManageData = permissions.isAdmin || permissions.isDirection; // Can create/edit/delete main entities
  
  // Buyer specific permissions (materials only)
  permissions.isBuyerOnly = permissions.isBuyer && !permissions.isAdmin && !permissions.isDirection;
  
  // headDepart specific permissions (view-only without financial data)
  permissions.isHeadDepartOnly = permissions.isHeadDepart && !permissions.isAdmin && !permissions.isDirection;
  permissions.canViewFinancialInfo = permissions.isAdmin || permissions.isDirection; // Financial data (honoraires, prix, etc.)
  permissions.canSeeContractInfo = permissions.isAdmin || permissions.isDirection; // Contract type and rates
  permissions.canEditSurgeryFinancials = permissions.isAdmin || permissions.isDirection; // Can edit adjustedPrice, etc.
  
  // Assistante specific permissions (view-only without sensitive data)
  permissions.isAssistanteOnly = permissions.isAssistante && !permissions.isAdmin && !permissions.isDirection && !permissions.isHeadDepart;
  
  res.locals.permissions = permissions;

  // Get flash messages and consume them (removes from session)
  const successMessages = req.flash("success") || [];
  const errorMessages = req.flash("error") || [];

  // Remove duplicates and set locals - only the first unique message
  const uniqueSuccess = [...new Set(successMessages)];
  const uniqueError = [...new Set(errorMessages)];

  res.locals.success = uniqueSuccess.length > 0 ? uniqueSuccess[0] : null;
  res.locals.error = uniqueError.length > 0 ? uniqueError[0] : null;

  res.locals.session = req.session;
  res.locals.moment = moment;
  next();
};
