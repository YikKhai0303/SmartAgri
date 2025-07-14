// Sensor Simulator
// sensorSimulator\sensorSimulator.js

const axios = require("axios");
const dotenv = require("dotenv");
const { faker } = require("@faker-js/faker");
const pLimit = require("p-limit").default;  // ✅ NEW: Limit concurrency //new

dotenv.config();
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000/api";
const SENSOR_ENDPOINT = `${BACKEND_URL}/sensors/public/active`;
const POST_ENDPOINT = `${BACKEND_URL}/readings`;

const CONCURRENCY_LIMIT = 10;

// ✅ Define update interval (ms) per data type
const UPDATE_INTERVALS = {
  soilMoisture: 30000,       // 30s
  soilTemperature: 30000,    // 30s
  relativeHumidity: 30000,   // 20s
  airTemperature: 30000,     // 15s
  lightIntensity: 30000,     // 12s
  windSpeed: 30000          // 10s
};

function generateValue(dataType) {
  switch (dataType) {
    case "soilMoisture":
      return faker.number.int({ min: 5, max: 90 }); // %
    case "soilTemperature":
      return parseFloat(faker.number.float({ min: 5, max: 50, precision: 0.1 }).toFixed(1)); // °C
    case "airTemperature":
      return parseFloat(faker.number.float({ min: -5, max: 50, precision: 0.1 }).toFixed(1)); // °C
    case "relativeHumidity":
      return faker.number.int({ min: 20, max: 90 }); // %
    case "lightIntensity":
      return faker.number.int({ min: 5, max: 10000 }); // lux
    case "windSpeed":
      return parseFloat(faker.number.float({ min: 5, max: 20, precision: 0.1 }).toFixed(1)); // m/s
    default:
      return null;
  }
}


// ✅ Main function to simulate a specific data type
async function simulateDataType(dataType) {
  try {
    const res = await axios.get(SENSOR_ENDPOINT);
    const sensors = res.data;

    if (!sensors.length) {
      console.log(`[${dataType}] No sensors found.`);
      return;
    }

    const limit = pLimit(CONCURRENCY_LIMIT);
    const tasks = [];

    for (const sensor of sensors) {
      if (!sensor.dataTypes.includes(dataType)) continue;

      const value = generateValue(dataType);
      if (value === null) continue;

      const payload = {
        sensorObjectId: sensor._id,
        dataType,
        value,
        timestamp: new Date().toISOString()
      };

      tasks.push(limit(async () => {
        await axios.post(POST_ENDPOINT, payload);
        console.log(`[${new Date().toLocaleTimeString()}] ${dataType} ->`, payload);
      }));
    }

    await Promise.all(tasks);
  } catch (err) {
    console.error(`❌ Error for ${dataType}:`, err.message);
  }
}

// ✅ Start individual timers per data type
Object.entries(UPDATE_INTERVALS).forEach(([dataType, interval]) => {
  setInterval(() => simulateDataType(dataType), interval);
  console.log(`✅ Simulator running for [${dataType}] every ${interval / 1000}s`);
});
