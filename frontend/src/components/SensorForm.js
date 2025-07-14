// Component - Form - Sensor Form
// frontend\src\components\SensorForm.js

import React, { useState, useEffect } from 'react';

const SENSOR_DATA_TYPES = [
  { label: "Soil Moisture", value: "soilMoisture" },
  { label: "Soil Temperature", value: "soilTemperature" },
  { label: "Relative Humidity", value: "relativeHumidity" },
  { label: "Air Temperature", value: "airTemperature" },
  { label: "Light Intensity", value: "lightIntensity" },
  { label: "Wind Speed", value: "windSpeed" }
];

const SensorForm = ({ initialValues = {}, onSubmit, mode = 'create', farmOptions = [], zoneOptions = [], onDelete }) => {
  const [formData, setFormData] = useState({
    sensorName: '',
    dataTypes: [],
    isActive: true,
    farmObjectId: '',
    zoneObjectId: ''
  });
  const [filteredZones, setFilteredZones] = useState([]);

  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      setFormData({
        sensorName: initialValues.sensorName || '',
        dataTypes: initialValues.dataTypes || [],
        isActive: initialValues.isActive ?? true,
        farmObjectId: initialValues.farmObjectId || '',
        zoneObjectId: initialValues.zoneObjectId || ''
      });
    } else if (mode === 'create') {
      setFormData({
        sensorName: '',
        dataTypes: [],
        isActive: true,
        farmObjectId: '',
        zoneObjectId: ''
      });
    }
  }, [initialValues, mode]);

  useEffect(() => {
    const matchingZones = zoneOptions.filter((zone) => zone.farmObjectId?._id === formData.farmObjectId);
    setFilteredZones(matchingZones);
  
    if (mode === 'create') {
      setFormData(prev => ({ ...prev, zoneObjectId: '' }));
    }
  }, [formData.farmObjectId, zoneOptions, mode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' && name !== 'dataTypes' ? checked : value
    });
  };

  const handleDataTypeChange = (value, checked) => {
    const updatedTypes = checked ? [...formData.dataTypes, value] : formData.dataTypes.filter(t => t !== value);
    setFormData({ ...formData, dataTypes: updatedTypes });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.dataTypes.length === 0) {
      alert("Please select at least one data type.");
      return;
    }
    onSubmit(formData);
  };

  const handleDeleteSensor = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this sensor?\nThis action cannot be undone.\nThe sensor and all readings under it will be deleted."
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/sensors/${initialValues._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete sensor");
      }
      if (onDelete) {
        onDelete();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-box">
        <div className="form-group">
          <div className="form-container">
            <label className="form-label">Sensor Name</label>
            <input className="form-input-text" name="sensorName" value={formData.sensorName} onChange={handleChange} placeholder="Sensor Name" required />
          </div>

          <div className="datatypes-select-section">
            <div>Data Types:</div>
            <div className="datatypes-select-container">
              {SENSOR_DATA_TYPES.map(({ label, value }) => (
                <label className="datatypes-select-option" key={value}>
                  <input type="checkbox" name="dataTypes" value={value}
                    checked={formData.dataTypes.includes(value)} onChange={(e) => handleDataTypeChange(value, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="active-box-label-container">
            <label className="active-label">Sensor Status</label>
            <div className="active-box-label">
              <input name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} />
              <div>Active</div>
            </div>
          </div>
          <div className="form-container">
            <label className="form-label">Farm Name</label>
            <select className="form-dropdown" name="farmObjectId" value={formData.farmObjectId} onChange={handleChange} required disabled={farmOptions.length === 0}>
              <option value="">Select a farm</option>
              {farmOptions.map(farm => (
                <option key={farm._id} value={farm._id}>{farm.farmName}</option>
              ))}
            </select>
          </div>
          <div className="form-container">
            <label className="form-label">Zone Name</label>
            <select className="form-dropdown" name="zoneObjectId" value={formData.zoneObjectId} onChange={handleChange} required disabled={!formData.farmObjectId || filteredZones.length === 0}>
              <option value="">Select a zone</option>
              {filteredZones.map(zone => (
                <option key={zone._id} value={zone._id}>{zone.zoneName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-button-container">
          {mode === 'edit' && (<button className="form-delete-button" type="button" onClick={handleDeleteSensor}>Delete</button>)}
          <button className="form-button" type="submit">{mode === 'edit' ? 'Save' : 'Add'}</button>
        </div>
      </div>
    </form>
  );
};

export default SensorForm;
