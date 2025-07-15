// Controller - Sensor Reading
// backend\controllers\sensorReading.controller.js

const SensorReading = require("../models/SensorReading");
const Sensor = require("../models/Sensor");
const Farm = require("../models/Farm");
const Zone = require("../models/Zone");

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST: Add a new sensor reading (for both live sensor simulator operation and user controlled simulator)
exports.addReading = async (req, res) => {
  try {
    const reading = new SensorReading({
      ...req.body,
      sourceSensorObjectId: req.body.sensorObjectId,
    });
    await reading.save();
    res.status(201).json(reading);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Helper Function: Extract Sensor ObjectIds based on (sensorName, farmName, zoneName) + (user auth)
const buildSensorFilter = async (query, userId) => {
  const sensorFilter = {};

  if (query.sensorId) {
    const safe = escapeRegex(query.sensorId.trim());
    sensorFilter.sensorId = { $regex: safe, $options: 'i' };
  }

  if (query.sensorName) {
    const safe = escapeRegex(query.sensorName.trim());
    sensorFilter.sensorName = { $regex: safe, $options: 'i' };
  }

  if (query.farmId || query.farmName) {
    const farmFilter = {};
    if (query.farmId) {
      const safe = escapeRegex(query.farmId.trim());
      farmFilter.farmId   = { $regex: safe, $options: 'i' };
    }
    if (query.farmName) {
      const safe = escapeRegex(query.farmName.trim());
      farmFilter.farmName = { $regex: safe, $options: 'i' };
    }
    const farms = await Farm.find(farmFilter);
    if (!farms.length) return [];
    sensorFilter.farmObjectId = { $in: farms.map(f => f._id) };
  }

  if (query.zoneId || query.zoneName) {
    const zoneFilter = {};
    if (query.zoneId) {
      const safe = escapeRegex(query.zoneId.trim());
      zoneFilter.zoneId   = { $regex: safe, $options: 'i' };
    }
    if (query.zoneName) {
      const safe = escapeRegex(query.zoneName.trim());
      zoneFilter.zoneName = { $regex: safe, $options: 'i' };
    }
    const zones = await Zone.find(zoneFilter);
    if (!zones.length) return [];
    sensorFilter.zoneObjectId = { $in: zones.map(z => z._id) };
  }

  const userFarms = await Farm.find({
    "members.user": userId
  }).select("_id");
  if (!userFarms.length) return [];

  const userFarmIds = userFarms.map(f => f._id);

  if (sensorFilter.farmObjectId) {
    const filteredFarmIds = sensorFilter.farmObjectId.$in;
    const intersected = filteredFarmIds.filter(id =>
      userFarmIds.map(String).includes(String(id))
    );
    if (!intersected.length) return [];
    sensorFilter.farmObjectId = { $in: intersected };
  } else {
    sensorFilter.farmObjectId = { $in: userFarmIds };
  }

  const matchingSensors = await Sensor.find(sensorFilter).select("_id");
  return matchingSensors.map(s => s._id);
};

// GET: Get latest readings (live) (Optionally filter by farmName, zoneName, sensorName, dataType)
exports.getLatestReadings = async (req, res) => {
  try {
    const sensorObjectIds = await buildSensorFilter(req.query, req.user._id);
    if (!sensorObjectIds.length) {
      return res.json([]);
    }
    const match = { sensorObjectId: { $in: sensorObjectIds } };

    if (req.query.dataType) {
      const types = Array.isArray(req.query.dataType) ? req.query.dataType : [req.query.dataType];
      match.dataType = { $in: types };
    }

    const mytOffsetMs = 8 * 60 * 60 * 1000;
    const oneHourAgoUTC = new Date(Date.now() - mytOffsetMs - (60 * 60 * 1000));
    match.timestamp = { $gte: oneHourAgoUTC };

    const results = await SensorReading.aggregate([
      { $match: match },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: { sensorObjectId: "$sensorObjectId", dataType: "$dataType" },
          latest: { $first: "$$ROOT" }
        }
      },
      { $replaceWith: "$latest" }
    ]).exec();

    const populated = await SensorReading.populate(results, {
      path: "sensorObjectId",
      select: "sensorId sensorName farmObjectId zoneObjectId",
      populate: [
        { path: "farmObjectId", select: "_id farmId farmName" },
        { path: "zoneObjectId", select: "_id zoneId zoneName" }
      ]
    });

    const sensorIds = populated.map(r => r.sensorObjectId._id);
    const activeSensors = await Sensor.find({ _id: { $in: sensorIds }, isActive: true }).select("_id");
    const activeSensorSet = new Set(activeSensors.map(s => s._id.toString()));

    const filtered = populated.filter(r => activeSensorSet.has(r.sensorObjectId._id.toString()));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST: Add multiple sensor readings (batch insert) (for historical data insertion)
exports.addReadingsBulk = async (req, res) => {
  try {
    const readings = req.body;

    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array." });
    }

    for (const reading of readings) {
      if (!reading.sensorObjectId || !reading.dataType || reading.value === undefined || !reading.timestamp) {
        return res.status(400).json({ error: "Missing fields in one or more readings." });
      }
    }

    const bulkData = readings.map(reading => ({
      ...reading,
      sourceSensorObjectId: reading.sensorObjectId
    }));

    const inserted = await SensorReading.insertMany(bulkData, { ordered: false });

    res.status(201).json({ message: `Inserted ${inserted.length} readings.` });
  } catch (err) {
    console.error("Error generating historical data:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Message:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
};

// GET: Get historical readings (zone level summary)
exports.getZoneAggregatedReadings = async (req, res) => {
  try {
    const { zoneObjectId, dataType, interval, startTime, endTime } = req.query;
    if (!zoneObjectId || !dataType || !interval) {
      return res.status(400).json({ error: "zoneObjectId, dataType, and interval are required." });
    }

    const zone = await Zone.findById(zoneObjectId).populate('farmObjectId');
    if (!zone) return res.status(404).json({ error: "Zone not found." });

    const isMember = zone.farmObjectId.members.some(
      m => m.user.equals(req.user._id)
    );
    if (!isMember) {
      return res.status(403).json({ error: "You do not have access to this zone." });
    }

    const sensors = await Sensor.find({
      zoneObjectId: zone._id,
      dataTypes: dataType
    });
    const sensorIds = sensors.map(s => s._id);
    if (sensorIds.length === 0) {
      return res.json([]);
    }

    const match = {
      sourceSensorObjectId: { $in: sensorIds },
      dataType
    };
    if (startTime || endTime) {
      match.timestamp = {};
      if (startTime) match.timestamp.$gte = new Date(startTime);
      if (endTime) match.timestamp.$lt  = new Date(endTime);
    }

    const timeFormat = {
      minute: { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" }, hour: { $hour: "$timestamp" }, minute: { $minute: "$timestamp" } },
      hour: { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" }, hour: { $hour: "$timestamp" } },
      day: { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" } }
    }[interval];

    if (!timeFormat) {
      return res
        .status(400)
        .json({ error: "Invalid interval. Use minute, hour, or day." });
    }

    const result = await SensorReading.aggregate([
      { $match: match },
      { $group: { _id: timeFormat, avgValue: { $avg: "$value" } } },
      { $sort: { "_id": 1 } }
    ]);

    const aggregated = result.map(r => {
      const { year, month = 1, day = 1, hour = 0, minute = 0 } = r._id;
      return {
        timestamp: new Date(year, month - 1, day, hour, minute),
        average: r.avgValue
      };
    });

    return res.json(aggregated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: Get historical readings (farm level summary)
exports.getFarmAggregatedReadings = async (req, res) => {
  try {
    const { farmObjectId, dataType, interval, startTime, endTime } = req.query;
    if (!farmObjectId || !dataType || !interval) {
      return res.status(400).json({ error: "farmObjectId, dataType and interval are required." });
    }

    const farm = await Farm.findById(farmObjectId).populate("members.user");
    if (!farm) return res.status(404).json({ error: "Farm not found." });

    const isMember = farm.members.some(m => m.user.equals(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: "Access denied to this farm." });
    }

    const sensors = await Sensor.find({
      farmObjectId,
      dataTypes: dataType
    });
    const sensorIds = sensors.map(s => s._id);
    if (sensorIds.length === 0) {
      return res.json([]);
    }

    const match = {
      sourceSensorObjectId: { $in: sensorIds },
      dataType
    };
    if (startTime || endTime) {
      match.timestamp = {};
      if (startTime) match.timestamp.$gte = new Date(startTime);
      if (endTime)   match.timestamp.$lt  = new Date(endTime);
    }

    const timeFormat = {
      minute: { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" }, hour: { $hour: "$timestamp" }, minute: { $minute: "$timestamp" } },
      hour: { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" }, hour: { $hour: "$timestamp" } },
      day: { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" } }
    }[interval];

    if (!timeFormat) {
      return res
        .status(400)
        .json({ error: "Invalid interval. Use minute, hour, or day." });
    }

    const result = await SensorReading.aggregate([
      { $match: match },
      { $group: { _id: timeFormat, avgValue: { $avg: "$value" } }},
      { $sort: { "_id": 1 } }
    ]);

    const aggregated = result.map(r => {
      const { year, month = 1, day = 1, hour = 0, minute = 0 } = r._id;
      return {
        timestamp: new Date(year, month - 1, day, hour, minute),
        average: r.avgValue
      };
    });

    return res.json(aggregated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
