// Page - Farm Page
// frontend\src\pages\FarmPage.js

import React, { useState,  useEffect } from 'react';
import Modal from '../components/Modal';
import FarmForm from '../components/FarmForm';
import ZoneForm from '../components/ZoneForm';
import SensorForm from '../components/SensorForm';
import JoinFarmForm from '../components/JoinFarmForm';

const DATA_TYPES = [
  { key: 'soilMoisture', label: 'Soil Moisture', unit: '%' },
  { key: 'soilTemperature', label: 'Soil Temperature', unit: '°C' },
  { key: 'relativeHumidity', label: 'Relative Humidity', unit: '%' },
  { key: 'airTemperature', label: 'Air Temperature', unit: '°C' },
  { key: 'lightIntensity', label: 'Light Intensity', unit: 'lux' },
  { key: 'windSpeed', label: 'Wind Speed', unit: 'm/s' }
];

const FarmPage = () => {
  const [userFarms, setUserFarms] = useState([]);
  const [userZones, setUserZones] = useState([]);
  const [allSensors, setAllSensors] = useState([]);

  const [showFarmForm, setShowFarmForm] = useState(false);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [showSensorForm, setShowSensorForm] = useState(false);
  const [showJoinFarmForm, setShowJoinFarmForm] = useState(false);

  const [editFarm, setEditFarm] = useState(null);
  const [editZone, setEditZone] = useState(null);
  const [editSensor, setEditSensor] = useState(null);
  const [mode, setMode] = useState('create');

  const fetchFarmsZonesSensors = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      const farmsRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/farms`, { headers });
      const farms = await farmsRes.json();
      if (!farmsRes.ok) throw new Error(farms.error || 'Failed to fetch farms');
      setUserFarms(farms);

      const zonesRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/zones`, { headers });
      const zones = await zonesRes.json();
      if (!zonesRes.ok) throw new Error(zones.error || 'Failed to fetch zones');
      setUserZones(zones);

      const sensorsRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/sensors`, { headers });
      const sensors = await sensorsRes.json();
      if (!sensorsRes.ok) throw new Error(sensors.error || 'Failed to fetch sensors');
      setAllSensors(sensors);
    } catch (err) {
      console.error('Fetch error:', err.message);
    }
  };

  useEffect(() => { fetchFarmsZonesSensors(); }, []);

  const handleFarmSubmit = async (data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("User not authenticated.");

      const isEdit = mode === 'edit';
      const url = isEdit
        ? `${process.env.REACT_APP_API_BASE_URL}/api/farms/${data._id || editFarm._id}`
        : `${process.env.REACT_APP_API_BASE_URL}/api/farms`;

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create farm.");

      setShowFarmForm(false);
      await fetchFarmsZonesSensors();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleZoneSubmit = async (data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("User not authenticated.");

      const isEdit = mode === 'edit';
      const url = isEdit
        ? `${process.env.REACT_APP_API_BASE_URL}/api/zones/${data._id || editZone._id}`
        : `${process.env.REACT_APP_API_BASE_URL}/api/zones`;

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save zone.");

      setShowZoneForm(false);
      setEditZone(null);
      setMode('create');
      await fetchFarmsZonesSensors();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSensorSubmit = async (data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("User not authenticated.");

      const isEdit = mode === 'edit';
      const url = isEdit
        ? `${process.env.REACT_APP_API_BASE_URL}/api/sensors/${data._id || editSensor._id}`
        : `${process.env.REACT_APP_API_BASE_URL}/api/sensors`;

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save sensor.");

      setShowSensorForm(false);
      setEditSensor(null);
      setMode('create');
      await fetchFarmsZonesSensors();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleJoinFarm = async ({ farmName, accessCode }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/farms/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ farmName, accessCode })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to join farm.");

      alert(result.message);
      setShowJoinFarmForm(false);
      await fetchFarmsZonesSensors();
    } catch (err) {
      alert(err.message);
    }
  };

  /* Expand/Collapse Level */
  const [expandedFarms, setExpandedFarms] = useState({});
  const [expandedZones, setExpandedZones] = useState({});

  useEffect(() => {
    const farmState = {};
    userFarms.forEach(f => { farmState[f._id] = true; });
    setExpandedFarms(farmState);

    const zoneState = {};
    userZones.forEach(z => { zoneState[z._id] = true; });
    setExpandedZones(zoneState);
  }, [userFarms, userZones]);

  const toggleFarm = (farmId) => {
    setExpandedFarms(prev => ({ ...prev, [farmId]: !prev[farmId] }));
  };

  const toggleZone = (zoneId) => {
    setExpandedZones(prev => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  /* Filter Section */
  const [filters, setFilters] = useState({
    farmName: '',
    zoneName: '',
    sensorName: '',
    dataTypes: DATA_TYPES.map(d => d.key),
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const selectedCount = filters.dataTypes.length;
  const [showDropdown, setShowDropdown] = useState(false);
  const toggleOption = (value) => {
    setFilters(prev => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(value) ? prev.dataTypes.filter(v => v !== value) : [...prev.dataTypes, value]
    }));
  };

  const match = (a = '', b = '') => {
    const needle = b.trim().toLowerCase();
    return needle === '' ? true : a.toLowerCase().includes(needle);
  };

  const getFilteredData = () => {
    // Filter user farms based on farm name filter
    let filteredFarms = userFarms;
    if (appliedFilters.farmName !== '') {
      filteredFarms = filteredFarms.filter(farm => match(farm.farmName, appliedFilters.farmName));
    }

    // Filter user zones based on zone name filter AND belonging to filtered user farms
    let filteredZones = userZones.filter(zone => {
      const belongsToFilteredFarm = filteredFarms.some(farm => farm._id === zone.farmObjectId._id);
      const matchesZoneName = appliedFilters.zoneName === '' || match(zone.zoneName, appliedFilters.zoneName);
      return belongsToFilteredFarm && matchesZoneName;
    });

    // Filter user sensors based on sensor name and data types AND belonging to filtered user zones
    let filteredSensors = allSensors.filter(sensor => {
      const belongsToFilteredZone = filteredZones.some(zone => zone._id === sensor.zoneObjectId?._id);
      const matchesSensorName = appliedFilters.sensorName === '' || match(sensor.sensorName, appliedFilters.sensorName);
      const matchesDataType = appliedFilters.dataTypes.length === 0 || sensor.dataTypes.some(dt => appliedFilters.dataTypes.includes(dt));
      return belongsToFilteredZone && matchesSensorName && matchesDataType;
    });

    // Reverse filtering: if zone/sensor filters are applied, ensure parent farms/zones are included
    if (appliedFilters.zoneName !== '' || appliedFilters.sensorName !== '' || appliedFilters.dataTypes.length < DATA_TYPES.length) {
      if (appliedFilters.zoneName !== '') {
        const parentFarmIds = filteredZones.map(zone => zone.farmObjectId._id);
        filteredFarms = filteredFarms.filter(farm => parentFarmIds.includes(farm._id));
      }

      if (appliedFilters.sensorName !== '' || appliedFilters.dataTypes.length < DATA_TYPES.length) {
        const parentZoneIds = filteredSensors.map(sensor => sensor.zoneObjectId?._id);
        filteredZones = filteredZones.filter(zone => parentZoneIds.includes(zone._id));
        const parentFarmIds = filteredZones.map(zone => zone.farmObjectId._id);
        filteredFarms = filteredFarms.filter(farm => parentFarmIds.includes(farm._id));
      }
    }
    return { filteredFarms, filteredZones, filteredSensors };
  };

  const { filteredFarms, filteredZones, filteredSensors } = getFilteredData();

  const handleFarmDelete = async () => {
    setShowFarmForm(false);
    setEditFarm(null);
    setMode('create');
    await fetchFarmsZonesSensors();
  };

  const handleZoneDelete = async () => {
    setShowZoneForm(false);
    setEditZone(null);
    setMode('create');
    await fetchFarmsZonesSensors();
  };

  const handleSensorDelete = async () => {
    setShowSensorForm(false);
    setEditSensor(null);
    setMode('create');
    await fetchFarmsZonesSensors();
  };



  return (
    <div>
      <div className="page-title">Farm</div>

      <div className="page-content">

        <div className="filter-parent">
          <div className="filter-group">
            <div className="filter-container">
              <label className="filter-label">Farm Name</label>
              <input
                className="filter-input-text"
                value={filters.farmName} onChange={e => setFilters({ ...filters, farmName: e.target.value })}
                placeholder="Farm Name"
              />
            </div>
            <div className="filter-container">
              <label className="filter-label">Zone Name</label>
              <input
                className="filter-input-text"
                value={filters.zoneName} onChange={e => setFilters({ ...filters, zoneName: e.target.value })}
                placeholder="Zone Name"
              />
            </div>
            <div className="filter-container">
              <label className="filter-label">Sensor Name</label>
              <input
                className="filter-input-text"
                value={filters.sensorName}
                onChange={e => setFilters({ ...filters, sensorName: e.target.value })}
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
              setAppliedFilters({
                farmName: '', zoneName: '', sensorName: '', dataTypes: DATA_TYPES.map(d => d.key)
              });
            }}>
              Clear Filters
            </button>
            <button className="main-button" onClick={() => setAppliedFilters(filters)}>Apply Filters</button>
          </div>
        </div>

        <div className="create-button-container">
          <button className="main-button" onClick={() => { setMode('create'); setEditFarm(null); setShowFarmForm(true); }}>Add Farm</button>
          <button className="main-button" onClick={() => { setMode('create'); setEditZone(null); setShowZoneForm(true); }}>Add Zone</button>
          <button className="main-button" onClick={() => { setMode('create'); setEditSensor(null); setShowSensorForm(true);}}>Add Sensor</button>
          <button className="main-button" onClick={() => { setShowJoinFarmForm(true); }}>Join Farm</button>
        </div>

        {showFarmForm && (
          <Modal
            title={mode === 'edit' ? "Edit Farm" : "Create Farm"}
            onClose={() => { setShowFarmForm(false); setEditFarm(null); setMode('create'); }}
          >
            <FarmForm onSubmit={handleFarmSubmit} initialValues={editFarm} mode={mode} onDelete={handleFarmDelete}/>
          </Modal>
        )}
        {showZoneForm && (
          <Modal
            title={mode === 'edit' ? "Edit Zone" : "Create Zone"}
            onClose={() => { setShowZoneForm(false); setEditZone(null); setMode('create'); }}
          >
            <ZoneForm onSubmit={handleZoneSubmit} initialValues={editZone} mode={mode} farmOptions={userFarms} onDelete={handleZoneDelete} />
          </Modal>
        )}
        {showSensorForm && (
          <Modal
            title={mode === 'edit' ? "Edit Sensor" : "Add Sensor"}
            onClose={() => { setShowSensorForm(false); setEditSensor(null); setMode('create'); }}
          >
            <SensorForm onSubmit={handleSensorSubmit} initialValues={editSensor} mode={mode} farmOptions={userFarms} zoneOptions={userZones} onDelete={handleSensorDelete} />
          </Modal>
        )}
        {showJoinFarmForm && (
          <Modal
            title="Join Farm"
            onClose={() => setShowJoinFarmForm(false)}
          >
            <JoinFarmForm onSubmit={handleJoinFarm} />
          </Modal>
        )}

        <div className="page-content-table">
          <div className="info-row row-header">
            <div></div>
            <div>Farm / Zone / Sensor</div>
            <div>ID</div>
            <div>Location / Description / Data Types</div>
            <div>Access Code / Sensor Status</div>
            <div>Edit</div>
          </div>

          {filteredFarms.map(farm => {
            const isFarmExpanded = expandedFarms[farm._id];
            const zones = filteredZones.filter(z => z.farmObjectId._id === farm._id);

            return (
              <div key={farm._id}>
                <div className="info-row row-farm">
                  <div>
                    <button className="toggle-btn" onClick={() => toggleFarm(farm._id)}>
                      {isFarmExpanded ? '\u002D' : '\u002B'}
                    </button>
                  </div>
                  <div>{farm.farmName}</div>
                  <div>{farm.farmId}</div>
                  <div>{farm.location}</div>
                  <div>{farm.accessCode}</div>
                  <div>
                    <button className="edit-button" onClick={() => {
                      const enrichedMembers = (farm.members || []).map(m => ({
                        email: m.user?.email || '',
                        userName: m.user?.userName || '',
                        role: m.role || 'member'
                      }));
                      setEditFarm({ ...farm, members: enrichedMembers });
                      setMode('edit');
                      setShowFarmForm(true);
                    }}>
                      Edit
                    </button>
                  </div>
                </div>

                {isFarmExpanded && zones.map(zone => {
                  const isZoneExpanded = expandedZones[zone._id];
                  const sensors = filteredSensors.filter(s => s.zoneObjectId?._id === zone._id);

                    return (
                      <div key={zone._id}>
                        <div className="info-row row-zone">
                          <div>
                            <button className="toggle-btn" onClick={() => toggleZone(zone._id)}>
                              {isZoneExpanded ? '\u002D' : '\u002B'}
                            </button>
                          </div>
                          <div>{zone.zoneName}</div>
                          <div>{zone.zoneId}</div>
                          <div>{zone.description}</div>
                          <div></div>
                          <div>
                            <button className="edit-button" onClick={() => {
                              setEditZone({
                                _id: zone._id,
                                zoneName: zone.zoneName,
                                description: zone.description,
                                farmObjectId: zone.farmObjectId._id
                              });
                              setMode('edit');
                              setShowZoneForm(true);
                            }}>
                              Edit
                            </button>
                          </div>
                        </div>

                        {isZoneExpanded && sensors.map(sensor => (

                          <div key={sensor._id} className="info-row row-sensor">
                            <div></div>
                            <div>{sensor.sensorName}</div>
                            <div>{sensor.sensorId}</div>
                            <div>
                              {sensor.dataTypes
                                .map(typeKey => {
                                  const match = DATA_TYPES.find(d => d.key === typeKey);
                                  return match ? match.label : typeKey;
                                })
                                .join(', ')
                              }
                            </div>
                            <div>{sensor.isActive ? 'ON' : 'OFF'}</div>
                            <div>
                              <button className="edit-button" onClick={() => {
                                setEditSensor({
                                  ...sensor,
                                  farmObjectId: sensor.farmObjectId?._id || '',
                                  zoneObjectId: sensor.zoneObjectId?._id || ''
                                });
                                setMode('edit');
                                setShowSensorForm(true);
                              }}>
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}

                      </div>
                    );
                  })}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default FarmPage;
