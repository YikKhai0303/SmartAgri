// Service - Sensor Simulator (user controlled)
// backend\services\sensorSimulator.service.js

const Sensor = require("../models/Sensor");
const SensorReading = require("../models/SensorReading");
const { faker } = require("@faker-js/faker");
const pLimit = require("p-limit").default;

const CONCURRENCY = 10;
const INTERVALS = {
  soilMoisture: 10_000,
  soilTemperature: 10_000,
  relativeHumidity: 10_000,
  airTemperature: 10_000,
  lightIntensity: 10_000,
  windSpeed: 10_000
};
const timers = new Map();

function genValue(type) {
  switch (type) {
    case "soilMoisture": return faker.number.int({ min: 5,  max: 90 });
    case "soilTemperature": return +faker.number.float({ min:5, max:50, precision:0.1 }).toFixed(1);
    case "airTemperature": return +faker.number.float({ min:-5,max:50, precision:0.1 }).toFixed(1);
    case "relativeHumidity": return faker.number.int({ min:20, max:90 });
    case "lightIntensity": return faker.number.int({ min:5, max:10000 });
    case "windSpeed": return +faker.number.float({ min:5,max:20,precision:0.1 }).toFixed(1);
    default: return null;
  }
}

async function _tick(farmId, dataType) {
  const sensors = await Sensor.find({ farmObjectId: farmId, isActive: true, dataTypes: dataType });
  if (!sensors.length) return;
  const limit = pLimit(CONCURRENCY);
  const now = new Date();
  await Promise.all(sensors.map(s =>
    limit(() =>
      SensorReading.create({
        sensorObjectId: s._id,
        sourceSensorObjectId: s._id,
        dataType,
        value: genValue(dataType),
        timestamp: now
      })
    )
  ));
}

async function start(farmObjectId) {
  if (timers.has(farmObjectId)) throw new Error("Already running.");
  const handles = {};
  for (const [type, ms] of Object.entries(INTERVALS)) {
    handles[type] = setInterval(() => _tick(farmObjectId, type), ms);
  }
  timers.set(farmObjectId, handles);
}

function stop(farmObjectId) {
  const handles = timers.get(farmObjectId);
  if (!handles) throw new Error("Not running.");
  for (const h of Object.values(handles)) clearInterval(h);
  timers.delete(farmObjectId);
}

function status(userFarms) {
  return userFarms.map(f => ({
    farmObjectId: f._id,
    isRunning: timers.has(f._id.toString())
  }));
}

module.exports = { start, stop, status };
