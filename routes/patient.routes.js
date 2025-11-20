const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureManagementAccess, ensureViewPatients } = require('../middleware/rbac');
const {
  patientList,
  renderCreatePatientForm,
  createPatient,
  showPatient,
  renderEditPatientForm,
  updatePatient,
  deletePatient,
} = require("../controller/patient.controller");

// Liste des patients - admin, direction, chefBloc, assistante can view
router.get("/", isLoggedIn, ensureViewPatients, catchAsync(patientList));

// Formulaire nouveau patient - admin, direction, chefBloc, assistante can create
router.get("/new", isLoggedIn, ensureViewPatients, renderCreatePatientForm);

// Créer patient
router.post("/", isLoggedIn, ensureViewPatients, catchAsync(createPatient));

// Voir patient - admin, direction, chefBloc, assistante can view
router.get("/:id", isLoggedIn, ensureViewPatients, catchAsync(showPatient));

// Formulaire édition patient - admin, direction, chefBloc, assistante can edit
router.get("/:id/edit", isLoggedIn, ensureViewPatients, catchAsync(renderEditPatientForm));

// Mettre à jour patient
router.put("/:id", isLoggedIn, ensureViewPatients, catchAsync(updatePatient));

// Supprimer patient - only admin, direction, chefBloc can delete
router.delete("/:id", isLoggedIn, ensureManagementAccess, catchAsync(deletePatient));

module.exports = router;
