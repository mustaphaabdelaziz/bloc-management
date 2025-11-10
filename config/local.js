module.exports.locals = (req, res, next) => {
  const moment = require("moment");

  // Handle query parameter flash messages
  if (req.query.success) {
    req.flash("success", req.query.success);
    // Remove the query parameter to clean up the URL
    delete req.query.success;
  }
  if (req.query.error) {
    req.flash("error", req.query.error);
    // Remove the query parameter to clean up the URL
    delete req.query.error;
  }

  res.locals.currentUser = req.user;
  res.locals.user = req.user;

  // Compute permission flags for templates so views can show/hide menus consistently
  const privileges = (req.user && Array.isArray(req.user.privileges)) ? req.user.privileges : [];
  const permissions = {
    isLoggedIn: req.isAuthenticated && req.isAuthenticated(),
    isAdmin: privileges.includes('admin'),
    isMedecin: privileges.includes('medecin'),
    isAcheteur: privileges.includes('acheteur'),
    isChefBloc: privileges.includes('chefBloc'),
    isTechnicien: privileges.includes('technicien'),
    isAssistant: privileges.includes('assistant'),
  };
  // Convenience derived flags
  permissions.onlyAcheteur = permissions.isAcheteur && !permissions.isAdmin && !permissions.isMedecin && !permissions.isChefBloc && !permissions.isTechnicien && !permissions.isAssistant;
  // General abilities
  permissions.canManageMaterials = permissions.isAdmin || permissions.isAcheteur;
  permissions.canManageSurgeries = permissions.isAdmin || permissions.isChefBloc;
  permissions.canManageUsers = permissions.isAdmin;

  res.locals.permissions = permissions;

  // Get flash messages without consuming them first
  const successMessages = req.flash("success");
  const errorMessages = req.flash("error");

  // Set locals for template use
  if (successMessages && successMessages.length > 0) {
    res.locals.success = successMessages[0]; // Pass the first message as a string
  } else {
    res.locals.success = null;
  }

  if (errorMessages && errorMessages.length > 0) {
    res.locals.error = errorMessages[0]; // Pass the first message as a string
  } else {
    res.locals.error = null;
  }

  res.locals.session = req.session;
  res.locals.moment = moment;
  next();
};
