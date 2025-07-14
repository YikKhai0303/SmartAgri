// Page - User Page
// frontend\src\pages\UserPage.js

import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import EditUserForm from '../components/EditUserForm';
import ResetPassForm from '../components/ResetPassForm';
import SimulatorConfigForm from '../components/SimulatorConfigForm';

const UserPage = () => {
  const [profile, setProfile] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showSimulatorConfig, setShowSimulatorConfig] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch profile');

        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);
  if (!profile) return null;

  const handleProfileSubmit = async ({ userName, email }) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userName, email })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Update profile failed');
      setProfile(result);
      setShowEdit(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetSubmit = async ({ oldPassword, newPassword, confirmNew }) => {
    if (newPassword !== confirmNew) {
      alert('New Password and Confirm New Password do not match.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Reset password failed');
      alert(result.message);
      setShowReset(false);
    } catch (err) {
      alert(err.message);
    }
  };



  return (
    <div>
      <div className="page-title">User Profile</div>

      <div className="page-content">
        <div className="profile-container-parent">
          <div className="profile-container">
            <div className="profile-container-label">User ID</div>
            <div className="profile-container-info">{profile.userId}</div>
          </div>
          <div className="profile-container">
            <div className="profile-container-label">Username</div>
            <div className="profile-container-info">{profile.userName}</div>
          </div>
          <div className="profile-container">
            <div className="profile-container-label">Email Address</div>
            <div className="profile-container-info">{profile.email}</div>
          </div>
        </div>

        <div className="profile-button-container">
          <button className="main-button-clear" onClick={() => setShowReset(true)}>Reset Password</button>
          <button className="main-button" onClick={() => setShowEdit(true)}>Edit Profile</button>
        </div>

        <div className="config-section-container">
          <div className="config-section-label">Sensor Simulator Configuration</div>
          <button className="main-button" onClick={() => setShowSimulatorConfig(true)}>Configure</button>
        </div>

        {showEdit && (
          <Modal title="Edit Profile" onClose={() => setShowEdit(false)}>
            <EditUserForm initialValues={{ userName: profile.userName, email: profile.email }} onSubmit={handleProfileSubmit} />
          </Modal>
        )}
        {showReset && (
          <Modal title="Reset Password" onClose={() => setShowReset(false)}>
            <ResetPassForm onSubmit={handleResetSubmit} />
          </Modal>
        )}
        {showSimulatorConfig && (
          <Modal title="Sensor Simulator Configuration" onClose={() => setShowSimulatorConfig(false)}>
            <SimulatorConfigForm onClose={() => setShowSimulatorConfig(false)} />
          </Modal>
        )}
      </div>

    </div>
  );
};

export default UserPage;
