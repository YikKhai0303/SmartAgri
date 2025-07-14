// Component - Side Menu
// frontend\src\components\SideMenu.js

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const SideMenu = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    localStorage.removeItem('token');
    onLogout();
    navigate('/');
  };

  return (
    <div className="side-menu-container">
      <div className="side-menu-brand">SmartAgri</div>
      <div className="side-menu">
        <nav>
          <ul>
            <li><NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>Dashboard</NavLink></li>
            <li><NavLink to="/monitor" className={({ isActive }) => isActive ? "active" : ""}>Live Monitor</NavLink></li>
            <li><NavLink to="/farm" className={({ isActive }) => isActive ? "active" : ""}>Farm</NavLink></li>
            <li><NavLink to="/user" className={({ isActive }) => isActive ? "active" : ""}>User</NavLink></li>
            <li><button onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default SideMenu;
