// Component - Form - User Form
// frontend\src\components\UserForm.js

import React, { useState } from 'react';

const UserForm = ({ onSubmit, mode = 'login' }) => {
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: ''
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
      <div className="user-form-box">
        <div className="user-form-title">{mode === 'login' ? 'Login' : 'Register'}</div>
        {mode === 'register' && (<input className="user-form-field" name="userName" value={formData.userName} onChange={handleChange} placeholder="Username" required />)}
        <input className="user-form-field" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required />
        <input className="user-form-field" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" required />
        <button className="user-form-button" type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
      </div>
    </form>
  );
};

export default UserForm;
