// historyDataGenerator.js
// Batch generator to simulate 1 month of historical sensor readings

const axios = require("axios");
const dotenv = require("dotenv");
const { faker } = require("@faker-js/faker");
const { differenceInSeconds, addSeconds, parseISO } = require("date-fns");

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000/api";
const SENSOR_ENDPOINT = `${BACKEND_URL}/sensors/public/active`;
const POST_ENDPOINT = `${BACKEND_URL}/readings/bulk`;

const BATCH_SIZE = 1000; // MongoDB bulk insert size
const INTERVAL_SECONDS = 30;

// const START_DATE = new Date("2025-07-01T00:00:00Z");     // 8:00 AM MYT
// const END_DATE = new Date("2025-07-01T02:59:30Z");       // 10:59:30 AM MYT
// const START_DATE = new Date("2025-06-01T00:00:00Z");
// const END_DATE = new Date("2025-06-30T23:59:30Z");

// Malaysia Time 2025-06-01 00:00 → UTC 2025-05-31T16:00:00Z
const START_DATE = new Date("2025-05-31T16:00:00Z");
// Malaysia Time 2025-07-12 23:59 → UTC 2025-07-12T15:59:00Z
const END_DATE   = new Date("2025-07-12T15:59:00Z");

const generateValue = (dataType) => {
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
};

(async () => {
  try {
    const sensorRes = await axios.get(SENSOR_ENDPOINT);
    const sensors = sensorRes.data;

    if (!sensors.length) {
      console.log("❌ No active sensors found.");
      return;
    }

    let current = START_DATE;
    const readings = [];

    while (current <= END_DATE) {
      for (const sensor of sensors) {
        for (const dataType of sensor.dataTypes) {
          const value = generateValue(dataType);
          if (value === null) continue;

          readings.push({
            sensorObjectId: sensor._id,
            dataType,
            value,
            timestamp: current.toISOString()
          });
        }
      }

      if (readings.length >= BATCH_SIZE) {
        await axios.post(POST_ENDPOINT, readings.splice(0, BATCH_SIZE));
        console.log(`✅ Inserted ${BATCH_SIZE} readings up to ${current.toISOString()}`);
      }

      current = addSeconds(current, INTERVAL_SECONDS);
    }

    // Insert remaining readings
    if (readings.length > 0) {
      await axios.post(POST_ENDPOINT, readings);
      console.log(`✅ Inserted final ${readings.length} readings.`);
    }

    console.log("🎉 Historical data generation complete.");
  } catch (err) {
    console.error("❌ Error generating historical data:", err.message);
  }
})();
