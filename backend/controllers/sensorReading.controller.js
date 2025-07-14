// Controller - SensorReading
// backend\controllers\sensorReading.controller.js

const SensorReading = require("../models/SensorReading");
const Sensor = require("../models/Sensor");
const Farm = require("../models/Farm");
const Zone = require("../models/Zone");

function escapeRegex(text) {
  // escape characters that have special meaning in a JS RegExp
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST: Add a new sensor reading
exports.addReading = async (req, res) => {
  try {
    const reading = new SensorReading({
      ...req.body,
      sourceSensorObjectId: req.body.sensorObjectId, // snapshot at creation
    });
    await reading.save();
    res.status(201).json(reading);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// BOTH GET: Optionally filter by [sensorId, sensorName],  [farmId, farmName], [zoneId, zoneName], dataType
// Helper Function: Extract Sensor ObjectIds based on (sensorId, sensorName, farmId, farmName, zoneId, zoneName) + (user auth)
const buildSensorFilter = async (query, userId) => {
  const sensorFilter = {};

  // if (query.sensorId) sensorFilter.sensorId = { $regex: query.sensorId.trim(), $options: "i" };
  // if (query.sensorName) sensorFilter.sensorName = { $regex: query.sensorName.trim(), $options: "i" };

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
    // if (query.farmId) farmFilter.farmId = { $regex: query.farmId.trim(), $options: "i" };
    // if (query.farmName) farmFilter.farmName = { $regex: query.farmName.trim(), $options: "i" };
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
    // if (query.zoneId) zoneFilter.zoneId = { $regex: query.zoneId.trim(), $options: "i" };
    // if (query.zoneName) zoneFilter.zoneName = { $regex: query.zoneName.trim(), $options: "i" };
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
  // sensorFilter.farmObjectId = {
  //   ...(sensorFilter.farmObjectId || {}),
  //   $in: userFarms.map(f => f._id)
  // };

  const userFarmIds = userFarms.map(f => f._id);

  if (sensorFilter.farmObjectId) {
    // Intersect filter.farmObjectId with user-accessible farm IDs
    const filteredFarmIds = sensorFilter.farmObjectId.$in;
    const intersected = filteredFarmIds.filter(id =>
      userFarmIds.map(String).includes(String(id))
    );
    if (!intersected.length) return []; // No matching accessible farms
    sensorFilter.farmObjectId = { $in: intersected };
  } else {
    // No farmName filter — fallback to user's accessible farms
    sensorFilter.farmObjectId = { $in: userFarmIds };
  }

  const matchingSensors = await Sensor.find(sensorFilter).select("_id");

  return matchingSensors.map(s => s._id);
};

// GET: Get latest readings
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

    // Only consider readings from the last 1 hour
    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
    match.timestamp = { $gte: oneHourAgo };



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


// POST: Add multiple sensor readings in bulk
exports.addReadingsBulk = async (req, res) => {
  try {
    const readings = req.body;

    // Optional: validate array
    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array." });
    }

    // Optional: enforce required fields in each reading
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
    console.error("❌ Error generating historical data:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Message:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
};



exports.getZoneAggregatedReadings = async (req, res) => {
  try {
    const { zoneObjectId, dataType, interval, startTime, endTime } = req.query;
    if (!zoneObjectId || !dataType || !interval) {
      return res.status(400).json({ error: "zoneObjectId, dataType, and interval are required." });
    }

    // Find the zone by its unique ID
    const zone = await Zone.findById(zoneObjectId).populate('farmObjectId');
    if (!zone) return res.status(404).json({ error: "Zone not found." });

    // Authorization: make sure user is a member of the parent farm
    const isMember = zone.farmObjectId.members.some(
      m => m.user.equals(req.user._id)
    );
    if (!isMember) {
      return res.status(403).json({ error: "You do not have access to this zone." });
    }

    // Fetch sensors that have this dataType
    const sensors = await Sensor.find({
      zoneObjectId: zone._id,
      dataTypes: dataType
    });
    const sensorIds = sensors.map(s => s._id);
    if (sensorIds.length === 0) {
      return res.json([]);     // no sensors → empty result
    }

    // Build the match filter, with [start, end) semantics
    const match = {
      sourceSensorObjectId: { $in: sensorIds },
      dataType
    };
    if (startTime || endTime) {
      match.timestamp = {};
      if (startTime) match.timestamp.$gte = new Date(startTime);
      if (endTime)   match.timestamp.$lt  = new Date(endTime);
    }

    // Pick the right bucketing expression
    const timeFormat = {
      minute: { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" }, hour: { $hour: "$timestamp" }, minute: { $minute: "$timestamp" } },
      hour:   { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" }, hour: { $hour: "$timestamp" } },
      day:    { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" } }
    }[interval];

    if (!timeFormat) {
      return res
        .status(400)
        .json({ error: "Invalid interval. Use minute, hour, or day." });
    }

    // 6) Aggregate and average
    const result = await SensorReading.aggregate([
      { $match: match },
      { $group: { _id: timeFormat, avgValue: { $avg: "$value" } } },
      { $sort: { "_id": 1 } }
    ]);

    // 7) Remap into { timestamp, average }
    const aggregated = result.map(r => {
      const { year, month = 1, day = 1, hour = 0, minute = 0 } = r._id;
      return {
        timestamp: new Date(year, month - 1, day, hour, minute),
        average:   r.avgValue
      };
    });

    return res.json(aggregated);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.getFarmAggregatedReadings = async (req, res) => {
  try {
    const { farmObjectId, dataType, interval, startTime, endTime } = req.query;
    if (!farmObjectId || !dataType || !interval) {
      return res.status(400).json({ error: "farmObjectId, dataType and interval are required." });
    }

    // 1) Fetch and authorize farm
    const farm = await Farm.findById(farmObjectId).populate("members.user");
    if (!farm) return res.status(404).json({ error: "Farm not found." });

    const isMember = farm.members.some(m => m.user.equals(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: "Access denied to this farm." });
    }

    // 2) Find all sensors in this farm that record this dataType
    const sensors = await Sensor.find({
      farmObjectId,
      dataTypes: dataType
    });
    const sensorIds = sensors.map(s => s._id);
    if (sensorIds.length === 0) {
      return res.json([]);
    }

    // 3) Build the match filter for SensorReading
    const match = {
      sourceSensorObjectId: { $in: sensorIds },
      dataType
    };
    if (startTime || endTime) {
      match.timestamp = {};
      if (startTime) match.timestamp.$gte = new Date(startTime);
      if (endTime)   match.timestamp.$lt  = new Date(endTime);
    }

    // 4) Choose the grouping key by interval
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

    // 5) Aggregate & average across all readings in that farm
    const result = await SensorReading.aggregate([
      { $match: match },
      { $group: { _id: timeFormat, avgValue: { $avg: "$value" } }},
      { $sort: { "_id": 1 } }
    ]);

    // 6) Remap into { timestamp, average } - same as Zone function
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


