// Page - Monitor Page
// frontend\src\pages\MonitorPage.js

import React, { useEffect, useState } from 'react';

const DATA_TYPES = [
  { key: 'soilMoisture', label: 'Soil Moisture', unit: '%' },
  { key: 'soilTemperature', label: 'Soil Temperature', unit: '°C' },
  { key: 'relativeHumidity', label: 'Relative Humidity', unit: '%' },
  { key: 'airTemperature', label: 'Air Temperature', unit: '°C' },
  { key: 'lightIntensity', label: 'Light Intensity', unit: 'lux' },
  { key: 'windSpeed', label: 'Wind Speed', unit: 'm/s' }
];

const MonitorPage = ({ hasSetup }) => {
  const [latestReadings, setLatestReadings] = useState([]);
  const [farmAggregations, setFarmAggregations] = useState({});
  const [zoneAggregations, setZoneAggregations] = useState({});

  /* Expand/Collapse Level */
  const [expandedFarms, setExpandedFarms] = useState({});
  const [expandedZones, setExpandedZones] = useState({});

  useEffect(() => {
    setExpandedFarms(prev => {
      const updated = { ...prev };
      latestReadings.forEach(r => {
        const farm = r.sensorObjectId.farmObjectId;
        if (farm && !(farm._id in updated)) { updated[farm._id] = true; }
      });
      return updated;
    });

    setExpandedZones(prev => {
      const updated = { ...prev };
      latestReadings.forEach(r => {
        const farm = r.sensorObjectId.farmObjectId;
        const zone = r.sensorObjectId.zoneObjectId;
        const key = `${farm._id}-${zone._id}`;
        if (!(key in updated)) { updated[key] = true; }
      });
      return updated;
    });
  }, [latestReadings]);

  const toggleFarm = farmObjectId => {
    setExpandedFarms(prev => ({ ...prev, [farmObjectId]: !prev[farmObjectId] }));
  };

  const toggleZone = (farmObjectId, zoneObjectId) => {
    const key = `${farmObjectId}-${zoneObjectId}`;
    setExpandedZones(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /* Filter Section */
  const [filters, setFilters] = useState({
    farmName: '',
    zoneName: '',
    sensorName: '',
    dataTypes: DATA_TYPES.map(d => d.key)
  });
  const [applyFilters, setApplyFilters] = useState(0);

  const selectedCount = filters.dataTypes.length;
  const [showDropdown, setShowDropdown] = useState(false);
  const toggleOption = (value) => {
    setFilters(prev => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(value) ? prev.dataTypes.filter(v => v !== value) : [...prev.dataTypes, value]
    }));
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filters.farmName) params.append('farmName', filters.farmName);
    if (filters.zoneName) params.append('zoneName', filters.zoneName);
    if (filters.sensorName) params.append('sensorName', filters.sensorName);
    filters.dataTypes.forEach(dt => params.append('dataType', dt));
    return params.toString();
  };

  /* Main */
  const fetchAggregationData = async (level, ids) => {
    const token = localStorage.getItem('token');
    const promises = ids.map(async (id) => {
      const params = new URLSearchParams();
      params.append(level, id);
      filters.dataTypes.forEach(dt => params.append('dataType', dt));

      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/readings/latest?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to fetch aggregation data');
      return { id, readings: result };
    });

    const results = await Promise.all(promises);
    const aggregationMap = {};
    results.forEach(({ id, readings }) => {
      aggregationMap[id] = computeAverages(readings);
    });
    return aggregationMap;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/readings/latest?${buildQuery()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to fetch readings');
        setLatestReadings(result);

        const uniqueFarmIds = [...new Set(result.map(r => r.sensorObjectId.farmObjectId._id))];
        const uniqueZoneIds = [...new Set(result.map(r => r.sensorObjectId.zoneObjectId._id))];
        if (uniqueFarmIds.length > 0) {
          const farmAggs = await fetchAggregationData(
            'farmId', uniqueFarmIds.map(id => result.find(r => r.sensorObjectId.farmObjectId._id === id)?.sensorObjectId.farmObjectId.farmId)
          );
          setFarmAggregations(farmAggs);
        }
        if (uniqueZoneIds.length > 0) {
          const zoneAggs = await fetchAggregationData(
            'zoneId', uniqueZoneIds.map(id => result.find(r => r.sensorObjectId.zoneObjectId._id === id)?.sensorObjectId.zoneObjectId.zoneId)
          );
          setZoneAggregations(zoneAggs);
        }
      } catch (err) {
        console.error("Fetch error:", err.message);
      }
    };
    fetchData();
    const intervalId = setInterval(fetchData, 10000);
    return () => clearInterval(intervalId);
  }, [applyFilters]);

  const grouped = {};
  latestReadings.forEach(reading => {
    const { farmObjectId: farm, zoneObjectId: zone } = reading.sensorObjectId;
    const sensor = reading.sensorObjectId;
    const sensorKey = sensor._id;

    if (!grouped[farm._id]) {
      grouped[farm._id] = {
        farmId: farm.farmId,
        farmName: farm.farmName,
        zones: {},
        readings: []
      };
    }
    grouped[farm._id].readings.push(reading);

    if (!grouped[farm._id].zones[zone._id]) {
      grouped[farm._id].zones[zone._id] = {
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        sensors: {},
        readings: []
      };
    }
    grouped[farm._id].zones[zone._id].readings.push(reading);

    if (!grouped[farm._id].zones[zone._id].sensors[sensorKey]) {
      grouped[farm._id].zones[zone._id].sensors[sensorKey] = {
        sensorId: sensor.sensorId,
        sensorName: sensor.sensorName,
        readings: []
      };
    }
    grouped[farm._id].zones[zone._id].sensors[sensorKey].readings.push(reading);
  });

  const computeAverages = (readings) => {
    const totals = {}, counts = {};
    DATA_TYPES.forEach(({ key }) => { totals[key] = 0; counts[key] = 0; });

    readings.forEach(r => {
      if (totals.hasOwnProperty(r.dataType)) {
        totals[r.dataType] += r.value;
        counts[r.dataType] += 1;
      }
    });

    const avg = {};
    DATA_TYPES.forEach(({ key }) => {
      avg[key] = counts[key] > 0 ? (totals[key] / counts[key]).toFixed(2) : 'N/A';
    });

    const latest = readings.reduce((latest, r) =>
      !latest || new Date(r.timestamp) > new Date(latest.timestamp) ? r : latest, null
    );

    return {
      avg,
      lastUpdate: latest
        ? new Date(latest.timestamp).toLocaleString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
          })
        : "N/A"
    };
  };

  const getFarmStats = (farm) => {
    return farmAggregations[farm.farmId] || computeAverages(farm.readings);
  };
  const getZoneStats = (zone) => {
    return zoneAggregations[zone.zoneId] || computeAverages(zone.readings);
  };



  return (
    <div>
      <div className="page-title">Live Monitor</div>

      {!hasSetup ? (
        <div className="noSetup">No farm setup found. Please go to Farm Page to begin setup.</div>
      ) : (
        <div className="page-content">

          <div className="filter-parent">
            <div className="filter-group">
              <div className="filter-container">
                <label className="filter-label">Farm Name</label>
                <input
                  className="filter-input-text" type="text"
                  value={filters.farmName} onChange={e => setFilters({ ...filters, farmName: e.target.value })}
                  placeholder="Farm Name"
                />
              </div>
              <div className="filter-container">
                <label className="filter-label">Zone Name</label>
                <input
                  className="filter-input-text" type="text"
                  value={filters.zoneName} onChange={e => setFilters({ ...filters, zoneName: e.target.value })}
                  placeholder="Zone Name"
                />
              </div>
              <div className="filter-container">
                <label className="filter-label">Sensor Name</label>
                <input
                  className="filter-input-text" type="text"
                  value={filters.sensorName} onChange={e => setFilters({ ...filters, sensorName: e.target.value })}
                  placeholder="Sensor Name"
                />
              </div>
              <div className="filter-container">
                <label className="filter-label">Data Types</label>
                <div className="filter-multi-select">
                  <div className="filter-multi-select-inner" onClick={() => setShowDropdown(prev => !prev)}>
                    {selectedCount > 0 ? `${selectedCount} Selected` : 'Data Types'}
                    <span className="dropdown-arrow">{showDropdown ? '\u25B2' : '\u25BC'}</span>
                  </div>
                  {showDropdown && (
                    <div className="dropdown-list">
                      {DATA_TYPES.map(({ key, label }) => (
                        <label key={key} className="dropdown-item">
                          <input type="checkbox" checked={filters.dataTypes.includes(key)} onChange={() => toggleOption(key)} />
                          {label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="filter-button-container">
              <button className="main-button-clear" onClick={() => { setFilters({
                farmName: '', zoneName: '', sensorName: '', dataTypes: DATA_TYPES.map(d => d.key)
              });
                setApplyFilters(prev => prev + 1);
              }}>
                Clear Filters
              </button>
              <button className="main-button" onClick={() => setApplyFilters(prev => prev + 1)}>Apply Filters</button>
            </div>
          </div>

          <div className="page-content-table">
            <div className="reading-row row-header">
              <div></div>
              <div>Farm / Zone / Sensor</div>
              {DATA_TYPES.map(({ label, unit }) => (
                <div key={label}>{label} ({unit})</div>
              ))}
              <div>Last Updated</div>
            </div>

            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([farmOid, farm]) => {
              const farmStats = getFarmStats(farm);
              const isFarmExpanded = expandedFarms[farmOid];

              return (
                <div key={farmOid}>
                  <div className="reading-row row-farm">
                    <div>
                      <button className="toggle-btn" onClick={() => toggleFarm(farmOid)}>
                        {isFarmExpanded ? '\u002D' : '\u002B'}
                      </button>
                    </div>
                    <div>{farm.farmName}</div>
                    {DATA_TYPES.map(({ key, unit }) => (
                      <div key={key}>{farmStats.avg[key]} {farmStats.avg[key] !== 'N/A' ? unit : ''}</div>
                    ))}
                    <div>{farmStats.lastUpdate}</div>
                  </div>

                  {isFarmExpanded &&
                    Object.entries(farm.zones)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([zoneOid, zone]) => {
                        const zoneStats = getZoneStats(zone);
                        const key = `${farmOid}-${zoneOid}`;
                        const isZoneExpanded = expandedZones[key];

                        return (
                          <div key={zoneOid}>
                            <div className="reading-row row-zone">
                              <div>
                                <button className="toggle-btn" onClick={() => toggleZone(farmOid, zoneOid)}>
                                  {isZoneExpanded ? '\u002D' : '\u002B'}
                                </button>
                              </div>
                              <div>{zone.zoneName}</div>
                              {DATA_TYPES.map(({ key, unit }) => (
                                <div key={key}>{zoneStats.avg[key]} {zoneStats.avg[key] !== 'N/A' ? unit : ''}</div>
                              ))}
                              <div>{zoneStats.lastUpdate}</div>
                            </div>

                            {isZoneExpanded &&
                              Object.entries(zone.sensors)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([sensorKey, sensor]) => {
                                  const sensorMap = {};
                                  sensor.readings.forEach(r => { sensorMap[r.dataType] = r; });

                                  return (
                                    <div key={sensorKey} className="reading-row row-sensor">
                                      <div></div>
                                      <div>{sensor.sensorName}</div>
                                      {DATA_TYPES.map(({ key, unit }) => (
                                        <div key={key}>{sensorMap[key] ? `${sensorMap[key].value} ${unit}` : 'N/A'}</div>
                                      ))}
                                      <div>
                                        {(() => {
                                          const timestamps = Object.values(sensorMap)
                                            .map(r => new Date(r.timestamp))
                                            .filter(Boolean);
                                          if (!timestamps.length) return 'N/A';
                                          const latest = new Date(Math.max(...timestamps));
                                          return latest.toLocaleString();
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}

                          </div>
                        );
                      })}

                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
};

export default MonitorPage;
