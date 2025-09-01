const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const session = require("express-session");
const moment = require("moment");
const ejsMate = require("ejs-mate");
const path = require("path");
require("dotenv").config();

const app = express();

// Configuration
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "operating-room-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Middleware pour passer moment à toutes les vues
app.use((req, res, next) => {
  res.locals.moment = moment;
  next();
});

// Connexion MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/operating_room",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Erreur de connexion MongoDB:"));
db.once("open", () => {
  console.log("Connecté à MongoDB");
});

// Import des modèles
require("./models/Specialty");
require("./models/Fonction");
require("./models/Patient");
require("./models/Surgeon");
require("./models/MedicalStaff");
require("./models/Material");
require("./models/Prestation");
require("./models/Surgery");

// Import des routes
const indexRoutes = require("./routes/index.routes");
const patientRoutes = require("./routes/patient.routes");
const surgeonRoutes = require("./routes/surgeon.routes");
const medicalStaffRoutes = require("./routes/medicalStaff.routes");
const materialRoutes = require("./routes/material.routes");
const prestationRoutes = require("./routes/prestation.routes");
const surgeryRoutes = require("./routes/surgery.routes");
const specialtyRoutes = require("./routes/speciality.routes");
const fonctionRoutes = require("./routes/fonction.routes");
const reportRoutes = require("./routes/report.routes");
const { errorPage } = require("./middleware/middleware");

// Utilisation des routes
app.use("/", indexRoutes);
app.use("/patients", patientRoutes);
app.use("/surgeons", surgeonRoutes);
app.use("/medical-staff", medicalStaffRoutes);
app.use("/materials", materialRoutes);
app.use("/prestations", prestationRoutes);
app.use("/surgeries", surgeryRoutes);
app.use("/specialties", specialtyRoutes);
app.use("/fonctions", fonctionRoutes);
app.use("/reports", reportRoutes);

// Gestion d'erreurs
app.use(errorPage);
// app.use((req, res) => {
//   res.status(404).render("errorHandling/error2", { statusCode : "Page non trouvée" });
// });

// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).render("errorHandling/error", { statusCode: "Erreur serveur", error: err });
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Application accessible sur http://localhost:${PORT}`);
});
