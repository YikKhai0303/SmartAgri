// Component - Form - Farm Form
// frontend\src\components\FarmForm.js

import React, { useState, useEffect } from 'react';

const FarmForm = ({ initialValues = {}, onSubmit, mode = 'create', onDelete }) => {
  const [formData, setFormData] = useState({
    farmName: '',
    location: '',
    accessCode: '',
    members: []
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [activeEditIndex, setActiveEditIndex] = useState(null);

  useEffect(() => {
    if (mode === 'edit' && initialValues && Array.isArray(initialValues.members)) {
      setFormData({
        farmName: initialValues.farmName || '',
        location: initialValues.location || '',
        accessCode: initialValues.accessCode || '',
        members: initialValues.members
      });
    } else if (mode === 'create') {
      setFormData({
        farmName: '',
        location: '',
        accessCode: ''
      });
    }
  }, [initialValues, mode]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addMember = async () => {
    const email = newMemberEmail.trim();
    if (!email || formData.members.some(m => m.email === email)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/email/${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to fetch user.");
        return;
      }

      const user = await res.json();
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, { email: user.email, userName: user.userName, role: 'member' }]
      }));
      setNewMemberEmail('');
    } catch (err) {
      alert("Failed to add member. " + err.message);
    }
  };

  const removeMember = (index) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const toggleAdmin = (index) => {
    setFormData(prev => {
      const updatedMembers = prev.members.map((m, i) =>
        i === index ? { ...m, role: m.role === 'admin' ? 'member' : 'admin' } : m
      );
      return { ...prev, members: updatedMembers };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'edit') {
      const hasAdmin = formData.members.some(m => m.role === 'admin');
      if (!hasAdmin) {
        alert("There must be at least one admin.");
        return;
      }

      const finalMembers = formData.members.map(({ email, role }) => ({ email, role }));
      onSubmit({ ...formData, members: finalMembers });
    } else if (mode === 'create') {
      const { farmName, location, accessCode } = formData;
      onSubmit({ farmName, location, accessCode });
    }
  };

  const handleDeleteFarm = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this farm?\nThis action cannot be undone.\nAll zones, sensors, and readings under this farm will be deleted."
    );
    if (!confirmed) return;
  
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/farms/${initialValues._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete farm");
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
          <div className="form-container">
            <label className="form-label">Farm Name</label>
            <input className="form-input-text" name="farmName" value={formData.farmName} onChange={handleChange} placeholder="Farm Name" required />
          </div>
          <div className="form-container">
            <label className="form-label">Location</label>
            <input className="form-input-text" name="location" value={formData.location} onChange={handleChange} placeholder="Location" required />
          </div>
          <div className="form-container">
            <label className="form-label">Access Code</label>
            <input className="form-input-text" name="accessCode" value={formData.accessCode} onChange={handleChange} placeholder="Access Code" required />
          </div>

          {mode === 'edit' && (
            <div className="member-edit-section">
              <div className="member-group">
                <div>Members:</div>
                {formData.members.map((m, idx) => (
                  <div className="member-container" key={`${m.email}-${idx}`}>
                    <div className="member-info">{m.userName || '—'}</div>
                    <div className="member-info">{m.email}</div>
                    <div className="member-info capitalize-first-char">{m.role}</div>
                    <div className="member-info member-edit-button" onClick={() => setActiveEditIndex(idx === activeEditIndex ? null : idx)}>Edit</div>

                    {activeEditIndex === idx && (
                      <div className="member-edit-popup">
                        <button className="form-button" style={{ width: "100%" }} type="button"
                          onClick={() => {
                            toggleAdmin(idx);
                            setActiveEditIndex(null);
                          }}
                        >
                          {m.role === 'admin' ? 'Make Member' : 'Make Admin'}
                        </button>
                        <button className="form-delete-button" style={{ width: "100%" }} type="button"
                          onClick={() => {
                            removeMember(idx);
                            setActiveEditIndex(null);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-container">
                <label className="form-label">Add Member by Email</label>
                <input className="form-input-text" type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="Email" />
              </div>
              <div className="form-button-container">
                <button className="form-button" type="button" onClick={addMember}>Add</button>
              </div>
            </div>
          )}
        </div>

        <div className="form-button-container">
          {mode === 'edit' && (<button className="form-delete-button" type="button" onClick={handleDeleteFarm}>Delete</button>)}
          <button className="form-button" type="submit">{mode === 'edit' ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </form>
  );
};

export default FarmForm;
