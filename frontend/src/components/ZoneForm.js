// Component - Form - Zone Form
// frontend\src\components\ZoneForm.js

import React, { useState, useEffect } from 'react';

const ZoneForm = ({ initialValues = {}, onSubmit, mode = 'create', farmOptions = [], onDelete }) => {
  const [formData, setFormData] = useState({
    zoneName: '',
    description: '',
    farmObjectId: ''
  });
  const selectedFarm = farmOptions.find(f => f._id === formData.farmObjectId);

  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      setFormData({
        zoneName: initialValues.zoneName || '',
        description: initialValues.description || '',
        farmObjectId: initialValues.farmObjectId || ''
      });
    } else if (mode === 'create') {
      setFormData({
        zoneName: '',
        description: '',
        farmObjectId: ''
      });
    }
  }, [initialValues, mode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleDeleteZone = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this zone?\nThis action cannot be undone.\nAll sensors and readings under this zone will be deleted."
    );
    if (!confirmed) return;
  
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/zones/${initialValues._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete zone");
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
          <>
            {mode === 'edit' ? (
              <div className="form-container">
                <div className="form-label">Farm Name</div>
                <div className="form-input-text readonly">{selectedFarm?.farmName}</div>
              </div>
            ) : (
              <div className="form-container">
                <label className="form-label">Farm Name</label>
                <select className="form-dropdown" name="farmObjectId" value={formData.farmObjectId} onChange={handleChange} required disabled={farmOptions.length === 0}>
                  <option value="">Select a farm</option>
                  {farmOptions.map((farm) => (
                    <option key={farm._id} value={farm._id}>{farm.farmName}</option>
                  ))}
                </select>
              </div>
            )}
            {farmOptions.length === 0 && mode === 'create' && (
              <div>No farms available. Please create one first.</div>
            )}
          </>

          <div className="form-container">
            <label className="form-label">Zone Name</label>
            <input className="form-input-text" name="zoneName" value={formData.zoneName} onChange={handleChange} placeholder="Zone Name" required />
          </div>
          <div className="form-container">
            <label className="form-label">Description</label>
            <input className="form-input-text" name="description" value={formData.description} onChange={handleChange} placeholder="Description" required />
          </div>
        </div>

        <div className="form-button-container">
          {mode === 'edit' && (<button className="form-delete-button" type="button" onClick={handleDeleteZone}>Delete</button>)}
          <button className="form-button" type="submit">{mode === 'edit' ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </form>
  );
};

export default ZoneForm;
