const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn } = require("../middleware/auth");
const { ensureHeadChief } = require('../middleware/rbac');
const {
  patientList,
  renderCreatePatientForm,
  createPatient,
  showPatient,
  renderEditPatientForm,
  updatePatient,
  deletePatient,
} = require("../controller/patient.controller");

// Liste des patients
router.get("/", isLoggedIn, catchAsync(patientList)); // All can view patients

// Formulaire nouveau patient
// Créer patient
router.get("/new", isLoggedIn, ensureHeadChief, renderCreatePatientForm); // Only admin/chefBloc can create

// Créer patient
router.post("/", isLoggedIn, ensureHeadChief, catchAsync(createPatient));

// Voir patient
router.get("/:id", isLoggedIn, catchAsync(showPatient)); // All can view individual patients

// Formulaire édition patient
// Mettre à jour patient
// Supprimer patient
router.get("/:id/edit", isLoggedIn, ensureHeadChief, catchAsync(renderEditPatientForm));

// Mettre à jour patient
router.put("/:id", isLoggedIn, ensureHeadChief, catchAsync(updatePatient));

// Supprimer patient
router.delete("/:id", isLoggedIn, ensureHeadChief, catchAsync(deletePatient));

module.exports = router;
