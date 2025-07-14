// Frontend - App
// frontend\src\App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import WelcomePage from './pages/WelcomePage';
import DashboardPage from './pages/DashboardPage';
import MonitorPage from './pages/MonitorPage';
import FarmPage from './pages/FarmPage';
import UserPage from './pages/UserPage';
import SideMenu from './components/SideMenu';
import './styles/style.css';

function AuthenticatedApp({ hasSetup, onLogout }) {
  return (
    <div className="main-container">
      <SideMenu onLogout={onLogout} />
      <div className="page-content-container">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage hasSetup={hasSetup} />} />
          <Route path="/monitor" element={<MonitorPage hasSetup={hasSetup} />} />
          <Route path="/farm" element={<FarmPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSetup, setHasSetup] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      return true;
    }
  };

  const handleLogout = (showAlert = false) => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setHasSetup(null);

    if (showAlert) {
      alert("Your session has expired. Please login again.");
    }
  };

  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    if (!token || isTokenExpired(token)) {
      handleLogout(true);
      return null;
    }

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      if (response.status === 401 || response.status === 403) {
        handleLogout(true);
        return null;
      }
      return response;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem('token');
      if (token && !isTokenExpired(token)) {
        setIsAuthenticated(true);
      } else {
        if (token) localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
      setIsInitializing(false);
    };
    initializeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiration = () => {
      const token = localStorage.getItem('token');
      if (!token || isTokenExpired(token)) {
        console.warn('Token expired, logging out.');
        handleLogout(true);
      }
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 300000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const checkSetup = async () => {
      if (!isAuthenticated) {
        setHasSetup(null);
        return;
      }

      try {
        const response = await apiCall(`${process.env.REACT_APP_API_BASE_URL}/api/farms/has-setup`);
        if (response) {
          const data = await response.json();
          setHasSetup(data.hasSetup);
        } else {
          setHasSetup(false);
        }
      } catch (err) {
        console.error("Failed to check setup:", err);
        setHasSetup(false);
      }
    };

    checkSetup();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        const token = e.newValue;
        if (token && !isTokenExpired(token)) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (isInitializing) {
    return (
      <div>Loading</div>
    );
  }

  return (
    <Router>
      {isAuthenticated ? (
        <AuthenticatedApp hasSetup={hasSetup} onLogout={() => handleLogout(false)} />
      ) : (
        <Routes>
          <Route path="/" element={<WelcomePage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
