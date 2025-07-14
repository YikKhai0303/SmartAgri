// Component - Form - Join Farm Form
// frontend\src\components\JoinFarmForm.js

import React, { useState } from 'react';

const JoinFarmForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    farmName: '',
    accessCode: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-box">
        <div className="form-group">
          <div className="form-container">
            <label className="form-label">Farm Name</label>
            <input className="form-input-text" name="farmName" value={formData.farmName} onChange={handleChange} placeholder="Farm Name" required />
          </div>
          <div className="form-container">
            <label className="form-label">Access Code</label>
            <input className="form-input-text" name="accessCode" value={formData.accessCode} onChange={handleChange} placeholder="Access Code" required />
          </div>
        </div>

        <div className="form-button-container">
          <button className="form-button" type="submit">Join</button>
        </div>
      </div>
    </form>
  );
};

export default JoinFarmForm;
