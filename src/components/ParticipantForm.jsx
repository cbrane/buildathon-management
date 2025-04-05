import React from 'react';

// ParticipantForm.jsx
export default function ParticipantForm({
  participant = null,
  onSubmit,
  onCancel,
  title = "Add New Participant"
}) {
  // Form state initialized with existing data or default values
  const formData = {
    name: participant?.name || '',
    email: participant?.email || '',
    college: participant?.college || '',
    experienceLevel: participant?.experienceLevel || '',
    themePreference: participant?.themePreference || '',
    seekingTeam: participant?.seekingTeam !== undefined ? participant.seekingTeam : true
  };

  function handleSubmit(e) {
    e.preventDefault();
    
    // Extract form values
    const form = e.target;
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      college: form.college.value.trim(),
      experienceLevel: form.experienceLevel.value,
      themePreference: form.themePreference.value,
      seekingTeam: true,  // All new participants are seeking by default
      isTeamLead: false,  // Not a team lead
      isTeamMember: false // Not a team member
    };
    
    // Pass form data to parent
    onSubmit(data);
  }

  return (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">{title}</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Full Name *</label>
            <input 
              type="text" 
              className="form-control" 
              id="name" 
              name="name"
              defaultValue={formData.name}
              required
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input 
              type="email" 
              className="form-control" 
              id="email" 
              name="email"
              defaultValue={formData.email}
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="college" className="form-label">College/School</label>
            <input 
              type="text" 
              className="form-control" 
              id="college" 
              name="college"
              defaultValue={formData.college}
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="experienceLevel" className="form-label">AI Experience Level</label>
            <select 
              className="form-select" 
              id="experienceLevel" 
              name="experienceLevel"
              defaultValue={formData.experienceLevel}
            >
              <option value="">Select experience level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          
          <div className="mb-3">
            <label htmlFor="themePreference" className="form-label">Theme Preference</label>
            <select 
              className="form-select" 
              id="themePreference" 
              name="themePreference"
              defaultValue={formData.themePreference}
            >
              <option value="">Select theme preference</option>
              <option value="AI-Powered Smart Living">AI-Powered Smart Living</option>
              <option value="AI-Powered Biomedical">AI-Powered Biomedical</option>
              <option value="Entrepreneurial AI">Entrepreneurial AI</option>
              <option value="Open to any theme">Open to any theme</option>
            </select>
          </div>
          
          <div className="mb-3 form-check">
            <input 
              type="checkbox" 
              className="form-check-input" 
              id="seekingTeam" 
              name="seekingTeam"
              defaultChecked={formData.seekingTeam}
            />
            <label className="form-check-label" htmlFor="seekingTeam">Looking for a team</label>
          </div>
          
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {participant ? 'Update' : 'Add'} Participant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}