// Component - Form - Reset Pass Form
// frontend\src\components\ResetPassForm.js

import React, { useState } from 'react';

const ResetPassForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNew: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
            <label className="form-label">Current Password</label>
            <input
              className="form-input-text" name="oldPassword" type="password"
              value={formData.oldPassword} onChange={handleChange} placeholder="Current Password" required
            />
          </div>
          <div className="form-container">
            <label className="form-label">New Password</label>
            <input
              className="form-input-text" name="newPassword" type="password"
              value={formData.newPassword} onChange={handleChange} placeholder="New Password" required
            />
          </div>
          <div className="form-container">
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-input-text" name="confirmNew" type="password"
              value={formData.confirmNew} onChange={handleChange} placeholder="Confirm New Password" required
            />
          </div>
        </div>

        <div className="form-button-container">
          <button className="form-button" type="submit">Reset</button>
        </div>
      </div>
    </form>
  );
};

export default ResetPassForm;
