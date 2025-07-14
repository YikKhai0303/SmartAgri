// Component - Form - Simulator Config Form
// frontend\src\components\SimulatorConfigForm.js

import React, { useState, useEffect } from 'react';

const SimulatorConfigForm = ({ onClose }) => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStatuses = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/sensorSimulator/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("Simulator status fetch failed:", await res.text());
      setFarms([]);
      return;
    }

    const data = await res.json();
    const arr = Array.isArray(data)
      ? data
      : Array.isArray(data.statuses)
        ? data.statuses
        : [];
    setFarms(arr);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadStatuses();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (farmObjectId, isRunning) => {
    const token = localStorage.getItem('token');
    const action = isRunning ? 'stop' : 'start';
    const url = `${process.env.REACT_APP_API_BASE_URL}/api/sensorSimulator/${action}/${farmObjectId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || 'Simulator toggle failed');
    }
    await loadStatuses();
  };

  return (
    <div className="form-box">
      <div className="simulator-group">
        <div className="simulator-container simulator-header">
          <div className="simulator-info">Farm Name</div>
          <div className="simulator-info">Status</div>
          <div className="simulator-info">Role</div>
          <div className="simulator-info">Action</div>
        </div>

        {farms.map(f => (
          <div className="simulator-container" key={f.farmObjectId}>
            <div className="simulator-info">{f.farmName}</div>
            <div className="simulator-info">{f.isRunning ? "Running" : "Stopped"}</div>
            <div className="simulator-info">{f.isAdmin ? "Admin" : "Member"}</div>
            <div className="simulator-info">
              {f.isAdmin ? (
                <button className="simulator-button" onClick={() => toggle(f.farmObjectId, f.isRunning)}>
                  {f.isRunning ? "Stop" : "Start"}
                </button>
              ) : (
                <button className="simulator-button" disabled>
                  {f.isRunning ? "Running" : "Stopped"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="form-button-container">
        <button className="simulator-close-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default SimulatorConfigForm;
