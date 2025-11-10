module.exports = {
    isLoggedIn: (req, res, next) => {
        console.log('=== isLoggedIn Check ===');
        console.log('req.isAuthenticated():', req.isAuthenticated());
        console.log('req.user:', req.user);
        console.log('req.session:', !!req.session);
        console.log('req.session.passport:', req.session ? req.session.passport : 'No session');
        console.log('=======================');

        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error', 'Vous devez être connecté pour accéder à cette page');
        res.redirect('/login');
    },

    isAdmin: (req, res, next) => {
        if (req.isAuthenticated() && req.user && req.user.privileges && req.user.privileges.includes('admin')) {
            return next();
        }
        req.flash('error', 'Accès non autorisé - droits administrateur requis');
        res.redirect('/');
    },

    hasPrivilege: (privilege) => {
        return (req, res, next) => {
            if (req.isAuthenticated() && req.user && req.user.privileges && req.user.privileges.includes(privilege)) {
                return next();
            }
            req.flash('error', `Accès non autorisé - droit '${privilege}' requis`);
            res.redirect('/');
        };
    },

    // Role-based access control
    isMedecin: (req, res, next) => {
        if (req.isAuthenticated() && req.user && req.user.privileges && 
            (req.user.privileges.includes('admin') || req.user.privileges.includes('medecin'))) {
            return next();
        }
        req.flash('error', 'Accès non autorisé - droits médecin requis');
        res.redirect('/');
    },

    isAcheteur: (req, res, next) => {
        if (req.isAuthenticated() && req.user && req.user.privileges && 
            (req.user.privileges.includes('admin') || req.user.privileges.includes('acheteur'))) {
            return next();
        }
        req.flash('error', 'Accès non autorisé - droits acheteur requis');
        res.redirect('/');
    },

    isChefBloc: (req, res, next) => {
        if (req.isAuthenticated() && req.user && req.user.privileges && 
            (req.user.privileges.includes('admin') || req.user.privileges.includes('chefBloc'))) {
            return next();
        }
        req.flash('error', 'Accès non autorisé - droits chef de bloc requis');
        res.redirect('/');
    },

    // Surgery access control - medecin can only view their own surgeries
    canViewSurgery: (req, res, next) => {
        if (req.isAuthenticated() && req.user && req.user.privileges) {
            // Admin and chefBloc can view all surgeries
            if (req.user.privileges.includes('admin') || req.user.privileges.includes('chefBloc')) {
                return next();
            }
            // Medecin can only view their own surgeries (need to check in route)
            if (req.user.privileges.includes('medecin')) {
                return next(); // Will be further restricted in the route
            }
        }
        req.flash('error', 'Accès non autorisé');
        res.redirect('/');
    },

    // Surgery modification control - only admin and chefBloc can modify
    canModifySurgery: (req, res, next) => {
        if (req.isAuthenticated() && req.user && req.user.privileges && 
            (req.user.privileges.includes('admin') || req.user.privileges.includes('chefBloc'))) {
            return next();
        }
        req.flash('error', 'Accès non autorisé - seuls admin et chef de bloc peuvent modifier les chirurgies');
        res.redirect('/');
    },

    // Material/Product access control - only admin and acheteur can modify
    canModifyMaterial: (req, res, next) => {
        if (req.isAuthenticated() && req.user && req.user.privileges && 
            (req.user.privileges.includes('admin') || req.user.privileges.includes('acheteur'))) {
            return next();
        }
        req.flash('error', 'Accès non autorisé - seuls admin et acheteur peuvent modifier les produits');
        res.redirect('/');
    }
};