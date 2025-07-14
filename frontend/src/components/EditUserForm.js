// Component - Form - Edit User Form
// frontend\src\components\EditUserForm.js

import React, { useState, useEffect } from 'react';

const EditUserForm = ({ initialValues = {}, onSubmit }) => {
  const [formData, setFormData] = useState({
    userName: '',
    email: ''
  });

  useEffect(() => {
    setFormData({
      userName: initialValues.userName || '',
      email: initialValues.email || ''
    });
  }, [initialValues]);

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
            <label className="form-label">Username</label>
            <input className="form-input-text" name="userName" value={formData.userName} onChange={handleChange} placeholder="Username" required />
          </div>
          <div className="form-container">
            <label className="form-label">Email Address</label>
            <input className="form-input-text" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required />
          </div>
        </div>

        <div className="form-button-container">
          <button className="form-button" type="submit">Update</button>
        </div>
      </div>
    </form>
  );
};

export default EditUserForm;
