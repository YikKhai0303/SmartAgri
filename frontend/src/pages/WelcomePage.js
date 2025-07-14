// Page - Welcome Page
// frontend\src\pages\WelcomePage.js

import React, { useState } from 'react';
import UserForm from '../components/UserForm';

const WelcomePage = () => {
  const [formMode, setFormMode] = useState('login');

  const handleSubmit = async (data) => {
    try {
      const endpoint = formMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Something went wrong.');

      if (formMode === 'login') {
        localStorage.setItem('token', result.token);
        window.location.href = '/dashboard';
      } else {
        alert('Registered successfully.');
        const autoLoginResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password
          })
        });

        const autoLoginResult = await autoLoginResponse.json();
        if (!autoLoginResponse.ok) throw new Error(autoLoginResult.error || 'Auto login failed.');

        localStorage.setItem('token', autoLoginResult.token);
        window.location.href = '/dashboard';
      }
    } catch (err) {
      alert(err.message);
    }
  };



  return (
    <div className="welcome-page-container">
      <div className="welcome-page-title">Welcome to SmartAgri</div>

      <div className="user-form-container">
        <UserForm mode={formMode === 'login' ? 'login' : 'register'} onSubmit={handleSubmit} />

        {formMode === 'login'
          ? (<button className="link-button" onClick={() => setFormMode('register')}>Do not have an account? Register here.</button>)
          : (<button className="link-button" onClick={() => setFormMode('login')}>Already have an account? Login here.</button>)
        }
      </div>
    </div>
  );
};

export default WelcomePage;
