const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
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
router.get("/", catchAsync(patientList));

// Formulaire nouveau patient
router.get("/new", renderCreatePatientForm);

// Créer patient
router.post("/", catchAsync(createPatient));

// Voir patient
router.get("/:id", catchAsync(showPatient));

// Formulaire édition patient
router.get("/:id/edit", catchAsync(renderEditPatientForm));

// Mettre à jour patient
router.put("/:id", catchAsync(updatePatient));

// Supprimer patient
router.delete("/:id", catchAsync(deletePatient));

module.exports = router;
