if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const path = require("path");
const ejs = require("ejs");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local").Strategy;
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const { sessionConfig } = require("./config/sessionConfig");
const passport = require("./config/passportConfig");
const { locals } = require("./config/local");
const connectDB = require("./database/connection");
const app = express();
const startApp = async () => {
  try {
    await connectDB();
    // EJS setup
    app.engine("ejs", ejsMate);
    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(methodOverride("_method"));
    app.use(express.static(path.join(__dirname, "public")));
    app.use(cookieParser());
    app.use(mongoSanitize({ replaceWith: "_" }));
  app.use(session(sessionConfig));
  app.use(flash());

  // Passport configuration
  // require("./config/passportConfig");
  app.use(passport.initialize());
  app.use(passport.session());

  // Locals middleware must run after passport.session so req.user is available
  app.use(locals);

    // Import des routes
    const indexRoutes = require("./routes/index.routes");
    const patientRoutes = require("./routes/patient.routes");
    const surgeonRoutes = require("./routes/surgeon.routes");
    const medicalStaffRoutes = require("./routes/medicalStaff.routes");
    const materialRoutes = require("./routes/material.routes");
    const prestationRoutes = require("./routes/prestation.routes");
    const surgeryRoutes = require("./routes/surgery.routes");
    const specialtyRoutes = require("./routes/speciality.routes");
    const familyRoutes = require("./routes/family.routes");
    const fonctionRoutes = require("./routes/fonction.routes");
    const reportRoutes = require("./routes/report.routes");
    const authRoutes = require("./routes/auth.routes");
    const usersRoutes = require("./routes/users.routes");
    const paymentRoutes = require("./routes/payment.routes");
    const asaPricingRoutes = require("./routes/asaPricing.routes");
    const operatingRoomRoutes = require("./routes/operatingRoom.routes");
 

    // Utilisation des routes
    app.use("/", indexRoutes);
    app.use("/patients", patientRoutes);
    app.use("/surgeons", surgeonRoutes);
    app.use("/medical-staff", medicalStaffRoutes);
    app.use("/materials", materialRoutes);
    app.use("/prestations", prestationRoutes);
    app.use("/surgeries", surgeryRoutes);
    app.use("/specialties", specialtyRoutes);
    app.use("/families", familyRoutes);
    app.use("/fonctions", fonctionRoutes);
    app.use("/reports", reportRoutes);
    app.use("/operating-rooms", operatingRoomRoutes);
    app.use("/", authRoutes);
    app.use("/users", usersRoutes);
    app.use("/payments", paymentRoutes);
    app.use("/asa-pricing", asaPricingRoutes);
    // Gestion d'erreurs

    // app.use((req, res) => {
    //   res.status(404).render("errorHandling/error2", { statusCode : "Page non trouvée" });
    // });

    // app.use((err, req, res, next) => {
    //   console.error(err.stack);
    //   res.status(500).render("errorHandling/error", { statusCode: "Erreur serveur", error: err });
    // });

    // const PORT = process.env.PORT
    const PORT = 7777
    const server = app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
      console.log(`Application accessible sur http://localhost:${PORT}`);
    });

    // WebSocket setup for real-time updates
    const io = require('socket.io')(server);
    
    io.on('connection', (socket) => {
      console.log('Client connected to WebSocket');
      
      socket.on('planning-changed', (data) => {
        // Broadcast to all other clients
        socket.broadcast.emit('planning-update', data);
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected from WebSocket');
      });
    });
    
    // Make io available to controllers
    app.set('io', io);

  } catch (error) {
    console.error("Failed to connect to the database", error);
  }
}
startApp();
