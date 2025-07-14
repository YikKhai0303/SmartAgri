// Sensor Simulator (Developer Live Data Generator)
// sensorSimulator\sensorSimulator.js

const axios = require("axios");
const dotenv = require("dotenv");
const { faker } = require("@faker-js/faker");
const pLimit = require("p-limit").default;

dotenv.config();
const BACKEND_URL = process.env.BACKEND_URL;
const SENSOR_ENDPOINT = `${BACKEND_URL}/sensors/public/active`;
const POST_ENDPOINT = `${BACKEND_URL}/readings`;
const CONCURRENCY_LIMIT = 10;

const UPDATE_INTERVALS = {
  soilMoisture: 30000,
  soilTemperature: 30000,
  relativeHumidity: 30000,
  airTemperature: 30000,
  lightIntensity: 30000,
  windSpeed: 30000
};

function generateValue(dataType) {
  switch (dataType) {
    case "soilMoisture":
      return faker.number.int({ min: 5, max: 90 });
    case "soilTemperature":
      return parseFloat(faker.number.float({ min: 5, max: 50, precision: 0.1 }).toFixed(1));
    case "airTemperature":
      return parseFloat(faker.number.float({ min: -5, max: 50, precision: 0.1 }).toFixed(1));
    case "relativeHumidity":
      return faker.number.int({ min: 20, max: 90 });
    case "lightIntensity":
      return faker.number.int({ min: 5, max: 10000 });
    case "windSpeed":
      return parseFloat(faker.number.float({ min: 5, max: 20, precision: 0.1 }).toFixed(1));
    default:
      return null;
  }
}

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
    console.error(`Error for ${dataType}:`, err.message);
  }
}

Object.entries(UPDATE_INTERVALS).forEach(([dataType, interval]) => {
  setInterval(() => simulateDataType(dataType), interval);
  console.log(`Simulator running for [${dataType}] every ${interval / 1000}s`);
});
