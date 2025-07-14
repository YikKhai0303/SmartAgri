// Backend - Server
// backend\server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(cors());
// app.use(express.json());
app.use(express.json({ limit: '10mb' }));


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Route Imports
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const farmRoutes = require("./routes/farm.routes");
const zoneRoutes = require("./routes/zone.routes");
const sensorRoutes = require("./routes/sensor.routes");
const sensorReadingRoutes = require("./routes/sensorReading.routes");

// Route Mounting
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/farms", farmRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/readings", sensorReadingRoutes);
app.use("/api/sensorSimulator", require("./routes/sensorSimulator.routes"));

// Default Root
app.get("/", (req, res) => {
  res.send("Smart Agriculture Backend is running.");
});

// Error Handling
app.use((err, req, res, next) => {
  console.error("Uncaught error:", err.stack);
  res.status(500).json({ error: "Something went wrong." });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
