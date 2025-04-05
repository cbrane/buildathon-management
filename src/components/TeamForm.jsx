import React, { useState, useMemo } from 'react';

// TeamForm.jsx
export default function TeamForm({
  team = null,
  participants = [],
  onSubmit,
  onCancel,
  title = "Add New Team"
}) {
  // Search and filter state
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberThemeFilter, setMemberThemeFilter] = useState('');
  const [memberExperienceFilter, setMemberExperienceFilter] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  
  // States for team lead selection
  const [selectedLeadId, setSelectedLeadId] = useState(team?.leaderId || '');
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  
  // State to track selected new members
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  
  // Form state initialized with existing data or default values
  const formData = {
    name: team?.name || '', // Keep existing team number when editing
    leaderName: team?.leaderName || '',
    college: team?.college || '',
    themePreference: team?.themePreference || '',
    experienceLevel: team?.experienceLevel || '',
    seekingMembers: team?.seekingMembers !== undefined ? team.seekingMembers : false,
    slotsNeeded: team?.slotsNeeded || 0,
    leaderId: team?.leaderId || ''
  };
  
  // Handle checkbox changes for new member selection
  const handleMemberSelection = (participantId, isChecked) => {
    if (isChecked) {
      setSelectedNewMembers(prev => [...prev, participantId]);
    } else {
      setSelectedNewMembers(prev => prev.filter(id => id !== participantId));
    }
  };

  // Filter out participants who are already in other teams, unless they're already in this team
  const availableParticipants = participants.filter(p => 
    !p.teamId || (team && team.members && team.members.includes(p.id))
  );
  
  // Apply search and filters to the available participants
  const filteredParticipants = useMemo(() => {
    console.log("Available participant count:", participants.length);
    console.log("Filtering participants with search:", memberSearchTerm);
    
    // Start with all participants instead of filtering first
    return participants.filter(participant => {
      // Log participant status for debugging
      console.log(`Filtering ${participant.name}: teamId=${participant.teamId}, seekingTeam=${participant.seekingTeam}, isTeamLead=${participant.isTeamLead}, isTeamMember=${participant.isTeamMember}`);
      
      // Search by name or email
      const matchesSearch = memberSearchTerm === '' || 
        (participant.name?.toLowerCase() || '').includes(memberSearchTerm.toLowerCase()) || 
        (participant.email?.toLowerCase() || '').includes(memberSearchTerm.toLowerCase()) ||
        (participant.college?.toLowerCase() || '').includes(memberSearchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Filter by theme preference
      const matchesTheme = memberThemeFilter === '' || 
        (participant.themePreference || '').includes(memberThemeFilter);
      
      if (!matchesTheme) return false;
      
      // Filter by experience level
      const matchesExperience = memberExperienceFilter === '' || 
        (participant.experienceLevel || '').includes(memberExperienceFilter);
      
      if (!matchesExperience) return false;
      
      // Special handling for when editing a team - don't show current members
      if (team && team.members?.includes(participant.id)) {
        return false; // Don't show current team members in the "Add New" section
      }
      
      // Filter by availability - if enabled, only show truly available participants
      if (showOnlyAvailable) {
        // When "Show only available" is checked, strictly filter out anyone on a team or a team lead
        if (participant.teamId || participant.isTeamLead) {
          return false; // Already on a team or is a team lead
        }
      } else {
        // Even when not explicitly filtering, still don't show team leads as available for adding
        if (participant.isTeamLead) {
          return false; // Don't show team leads in the list
        }
      }
      
      return true;
    });
  }, [participants, memberSearchTerm, memberThemeFilter, memberExperienceFilter, showOnlyAvailable, team]);

  function handleSubmit(e) {
    e.preventDefault();
    
    // Extract form values
    const form = e.target;
    
    // Get team lead info - handle both creating and editing differently
    let leaderId, leaderName;
    if (team) {
      if (selectedLeadId && selectedLeadId !== 'change') {
        // Changing team lead
        leaderId = selectedLeadId;
        // Find the new leader's name from participants
        const leader = participants.find(p => p.id === leaderId);
        leaderName = leader ? leader.name : '';
      } else {
        // Keep existing team lead
        leaderId = team.leaderId;
        leaderName = team.leaderName;
      }
    } else {
      // Creating: get selected team lead
      leaderId = form.leaderId.value;
      // Find the leader's name from participants
      const leader = participants.find(p => p.id === leaderId);
      leaderName = leader ? leader.name : '';
    }
    
    const data = {
      name: team ? team.name : `Team ${Date.now().toString().slice(-5)}`, // Keep existing team number or generate new one
      leaderId: leaderId,
      leaderName: leaderName,
      college: form.college.value.trim(),
      themePreference: form.themePreference.value,
      experienceLevel: form.experienceLevel.value,
      seekingMembers: form.seekingMembers.checked,
      slotsNeeded: parseInt(form.slotsNeeded.value) || 0
    };
    
    // Get all members based on current mode
    let members = [];
    
    if (team) {
      // For editing teams: collect current members (hidden inputs) and new members (checkboxes)
      
      // Get current team members (including team lead) from hidden inputs
      const currentMemberInputs = [...form.elements]
        .filter(el => (el.name === 'members' || el.name === 'currentMembers'))
        .map(el => el.value);
      
      // Use the selectedNewMembers state for newly selected members
      const newMemberInputs = selectedNewMembers;
      
      // Combine all members, ensuring the team lead is included
      members = [...new Set([leaderId, ...currentMemberInputs, ...newMemberInputs])];
    } else {
      // For new teams: use the selectedNewMembers state
      members = [...selectedNewMembers];
      
      // Always include the team lead for new teams
      if (leaderId && !members.includes(leaderId)) {
        members.push(leaderId);
      }
    }
    
    // Pass form data to parent
    onSubmit({ ...data, members });
  }

  return (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">{title}</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          {team && (
            <div className="alert alert-info">
              {team.name} - This number is assigned automatically and won't be changed
            </div>
          )}
          
          <div className="mb-3">
            <label htmlFor="teamLead" className="form-label">Team Lead *</label>
            {team ? (
              // When editing: Show current team lead with option to change
              <div className="card">
                <div className="card-header bg-warning bg-opacity-25">
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>Current Team Lead</strong>
                    {!selectedLeadId && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setSelectedLeadId('change')}
                      >
                        Change Team Lead
                      </button>
                    )}
                  </div>
                </div>
                {!selectedLeadId ? (
                  // Show current team lead
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <strong>{formData.leaderName || 'No team lead selected'}</strong>
                      <input type="hidden" name="leaderId" value={formData.leaderId || ''} />
                      <input type="hidden" name="leaderName" value={formData.leaderName || ''} />
                    </div>
                  </div>
                ) : (
                  // Show team lead selection UI
                  <>
                    <div className="card-body border-bottom">
                      <div className="alert alert-warning">
                        <strong>Changing Team Lead</strong>
                        <p className="mb-0 small">Select a new team lead from the list below. This will make the current team lead a regular team member.</p>
                      </div>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Search for a new team lead by name or email..."
                        value={leadSearchTerm}
                        onChange={(e) => setLeadSearchTerm(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary mt-2"
                        onClick={() => setSelectedLeadId('')}
                      >
                        Cancel Change
                      </button>
                    </div>
                    <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <div className="list-group">
                        {participants
                          // Include current team members as potential team leads
                          .filter(p => {
                            // Only show participants who are already on this team
                            return p.teamId === team.id && p.id !== team.leaderId;
                          })
                          // Filter by search term if there is one
                          .filter(p => {
                            if (!leadSearchTerm) return true;
                            const search = leadSearchTerm.toLowerCase();
                            return (
                              (p.name?.toLowerCase() || '').includes(search) || 
                              (p.email?.toLowerCase() || '').includes(search) ||
                              (p.college?.toLowerCase() || '').includes(search)
                            );
                          })
                          .map(participant => (
                            <button
                              type="button"
                              key={`lead-${participant.id}`}
                              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                              onClick={() => setSelectedLeadId(participant.id)}
                            >
                              <div>
                                <strong>{participant.name}</strong>
                                <div className="small text-muted">
                                  {participant.email && <div>{participant.email}</div>}
                                  <div>
                                    {participant.college && <span>{participant.college}</span>}
                                    {participant.experienceLevel && (
                                      <span className="badge bg-secondary ms-2">{participant.experienceLevel}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="badge bg-warning">Select as New Lead</span>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // When creating: Allow selecting a team lead with search
              <div className="card">
                <div className="card-header bg-warning bg-opacity-25">
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>Select Team Lead</strong>
                    {selectedLeadId && (
                      <span className="badge bg-success">Selected</span>
                    )}
                  </div>
                </div>
                
                {/* Display selected team lead at the top if one is selected */}
                {selectedLeadId && (
                  <div className="card-body bg-light">
                    <div className="selected-lead mb-3">
                      <div className="card border-warning">
                        <div className="card-body p-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{participants.find(p => p.id === selectedLeadId)?.name || 'Selected Lead'}</strong>
                              <div className="small text-muted">
                                {participants.find(p => p.id === selectedLeadId)?.email || ''}
                              </div>
                              <div className="small text-muted">
                                {participants.find(p => p.id === selectedLeadId)?.college || ''}
                              </div>
                              <input type="hidden" name="leaderId" value={selectedLeadId} />
                            </div>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setSelectedLeadId('')}
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Only show the search and selection if no lead is selected yet */}
                {!selectedLeadId && (
                  <>
                    <div className="card-body border-bottom">
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Search for a team lead by name or email..."
                        value={leadSearchTerm}
                        onChange={(e) => setLeadSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <div className="list-group">
                        {participants
                          // Show all participants who aren't already on a team or a team lead
                          .filter(p => {
                            // Only filter out participants who are ACTUALLY on a team or a team lead
                            // Don't rely on the seekingTeam flag as it might be incorrect
                            const isUnavailable = p.teamId || p.isTeamLead;
                            const isAvailable = !isUnavailable;
                            
                            console.log(`Participant for lead ${p.name}: teamId=${p.teamId}, isTeamLead=${p.isTeamLead}, isAvailable=${isAvailable}`);
                            return isAvailable;
                          })
                          // Filter by search term if there is one
                          .filter(p => {
                            if (!leadSearchTerm) return true;
                            const search = leadSearchTerm.toLowerCase();
                            return (
                              (p.name?.toLowerCase() || '').includes(search) || 
                              (p.email?.toLowerCase() || '').includes(search) ||
                              (p.college?.toLowerCase() || '').includes(search)
                            );
                          })
                          .map(participant => (
                            <button
                              type="button"
                              key={`lead-${participant.id}`}
                              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                              onClick={() => setSelectedLeadId(participant.id)}
                            >
                              <div>
                                <strong>{participant.name}</strong>
                                <div className="small text-muted">
                                  {participant.email && <div>{participant.email}</div>}
                                  <div>
                                    {participant.college && <span>{participant.college}</span>}
                                    {participant.experienceLevel && (
                                      <span className="badge bg-secondary ms-2">{participant.experienceLevel}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="badge bg-warning">Select as Lead</span>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <small className="text-muted">
              {team 
                ? "Team lead can't be changed after team creation" 
                : "This person will be designated as the team lead and automatically added as a team member"
              }
            </small>
            {!team && !selectedLeadId && (
              <div className="text-danger mt-1">
                <small>* Please select a team lead to continue</small>
              </div>
            )}
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
          
          {team ? (
            // When editing: Display theme and experience as non-editable information
            <>
              <div className="mb-3">
                <label className="form-label">Theme Preference</label>
                <div className="form-control bg-light">
                  {formData.themePreference ? (
                    <span className="badge bg-primary">{
                      formData.themePreference.includes('AI-Powered') ? 
                        formData.themePreference.replace('AI-Powered ', '') : 
                        formData.themePreference
                    }</span>
                  ) : (
                    <em className="text-muted">No theme preference specified</em>
                  )}
                  {/* Hidden input to preserve the value */}
                  <input type="hidden" name="themePreference" value={formData.themePreference || ''} />
                </div>
                <small className="text-muted">Original theme selection cannot be changed</small>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Team Experience Level</label>
                <div className="form-control bg-light">
                  {formData.experienceLevel ? (
                    <span className="badge bg-secondary">{formData.experienceLevel}</span>
                  ) : (
                    <em className="text-muted">No experience level specified</em>
                  )}
                  {/* Hidden input to preserve the value */}
                  <input type="hidden" name="experienceLevel" value={formData.experienceLevel || ''} />
                </div>
                <small className="text-muted">Original experience level cannot be changed</small>
              </div>
            </>
          ) : (
            // When creating new team: Allow setting these fields
            <>
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
                  <option value="Still deciding">Still deciding</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label htmlFor="experienceLevel" className="form-label">Team Experience Level</label>
                <select 
                  className="form-select" 
                  id="experienceLevel" 
                  name="experienceLevel"
                  defaultValue={formData.experienceLevel}
                >
                  <option value="">Select experience level</option>
                  <option value="Using AI tools">Using AI tools (Beginner)</option>
                  <option value="Implementing AI solutions">Implementing AI solutions (Intermediate)</option>
                  <option value="Building/modifying AI models">Building/modifying AI models (Advanced)</option>
                  <option value="No prior AI experience">No prior AI experience</option>
                </select>
              </div>
            </>
          )}
          
          <div className="mb-3 form-check">
            <input 
              type="checkbox" 
              className="form-check-input" 
              id="seekingMembers" 
              name="seekingMembers"
              defaultChecked={formData.seekingMembers}
            />
            <label className="form-check-label" htmlFor="seekingMembers">Looking for more members</label>
          </div>
          
          <div className="mb-3">
            <label htmlFor="slotsNeeded" className="form-label">Number of slots needed</label>
            <input 
              type="number" 
              className="form-control" 
              id="slotsNeeded" 
              name="slotsNeeded"
              min="0"
              max="4"
              defaultValue={formData.slotsNeeded}
            />
          </div>
          
          {/* If editing a team, show existing team members first */}
          {team && (
            <div className="mb-4">
              <label className="form-label">Current Team Members</label>
              <div className="alert alert-warning">
                <small>
                  <strong>Note:</strong> Team members listed below are already on the team. You can remove them using the "Remove" button if needed. The team lead cannot be removed.
                </small>
              </div>
              <div className="card">
                <div className="card-body">
                  {team.members && team.members.length > 0 ? (
                    <div className="list-group">
                      {/* Team Lead always shown first */}
                      {team.leaderId && (
                        <div className="list-group-item list-group-item-warning">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>
                                {participants.find(p => p.id === team.leaderId)?.name || 'Unknown Team Lead'}
                              </strong>
                              <span className="badge bg-warning text-dark ms-2">Team Lead</span>
                              <input type="hidden" name="members" value={team.leaderId} />
                            </div>
                            <div>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline-secondary" 
                                disabled={true}
                                title="Team lead cannot be removed"
                              >
                                <small>Cannot Remove Lead</small>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Other team members */}
                      {team.members
                        .filter(memberId => memberId !== team.leaderId)
                        .map(memberId => {
                          const member = participants.find(p => p.id === memberId);
                          if (!member) return null;
                          
                          return (
                            <div className="list-group-item" key={memberId}>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <strong>{member.name}</strong>
                                  <span className="badge bg-secondary ms-2">Team Member</span>
                                  <input type="hidden" name="currentMembers" value={memberId} />
                                  <div className="small text-muted">
                                    {member.email && <span>{member.email} • </span>}
                                    {member.college}
                                  </div>
                                </div>
                                <div>
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-outline-danger" 
                                    onClick={(e) => {
                                      // Mark as to be removed by adding a data attribute
                                      const listItem = e.target.closest('.list-group-item');
                                      if (listItem) {
                                        // Hide the item visually
                                        listItem.style.display = 'none';
                                        
                                        // Find and remove the hidden input for this member
                                        const inputs = listItem.querySelectorAll('input[name="currentMembers"]');
                                        inputs.forEach(input => input.remove());
                                        
                                        // Add a new hidden input to mark this as removed
                                        const hiddenInput = document.createElement('input');
                                        hiddenInput.type = 'hidden';
                                        hiddenInput.name = 'removedMembers';
                                        hiddenInput.value = memberId;
                                        listItem.appendChild(hiddenInput);
                                      }
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted">No team members yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Section for adding new members */}
          <div className="mb-3">
            <label className="form-label">
              {team ? "Add New Team Members" : "Select Team Members"}
            </label>
            <div className="alert alert-info">
              <small>
                {team
                  ? "Select participants below to add them to the team."
                  : "Select participants to add to the team. The team lead will be automatically added."}
              </small>
            </div>
            
            {/* Display selected members at the top */}
            {selectedNewMembers.length > 0 && (
              <div className="card mb-3">
                <div className="card-header bg-success bg-opacity-25">
                  <strong>Selected New Members ({selectedNewMembers.length})</strong>
                </div>
                <div className="card-body">
                  <div className="row row-cols-1 row-cols-md-2 g-2">
                    {selectedNewMembers.map(memberId => {
                      const participant = participants.find(p => p.id === memberId);
                      if (!participant) return null;
                      
                      return (
                        <div className="col" key={`selected-${memberId}`}>
                          <div className="card h-100 border-success">
                            <div className="card-body p-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <strong>{participant.name}</strong>
                                  <div className="small text-muted">
                                    {participant.email && <div>{participant.email}</div>}
                                    {participant.college && <div>{participant.college}</div>}
                                  </div>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleMemberSelection(memberId, false)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            <div className="card">
              <div className="card-header bg-light">
                <div className="row g-2">
                  <div className="col-md-12 mb-2">
                    <input 
                      type="text" 
                      className="form-control form-control-sm" 
                      placeholder="Search by name or email..."
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <select 
                      className="form-select form-select-sm" 
                      onChange={(e) => setMemberThemeFilter(e.target.value)}
                    >
                      <option value="">All Themes</option>
                      <option value="AI-Powered Smart Living">Smart Living</option>
                      <option value="AI-Powered Biomedical">Biomedical</option>
                      <option value="Entrepreneurial AI">Entrepreneurial</option>
                      <option value="Open to any">Open to any theme</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <select 
                      className="form-select form-select-sm" 
                      onChange={(e) => setMemberExperienceFilter(e.target.value)}
                    >
                      <option value="">All Experience Levels</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div className="col-md-12 mt-2">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showOnlyAvailable"
                        checked={showOnlyAvailable}
                        onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="showOnlyAvailable">
                        <strong>Show only available participants</strong> <small className="text-muted">(hide those already on teams)</small>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {filteredParticipants
                  // When editing, only show participants not already on the team
                  .filter(participant => !team || !team.members.includes(participant.id))
                  .length > 0 ? (
                  filteredParticipants
                    // When editing, only show participants not already on the team
                    .filter(participant => !team || !team.members.includes(participant.id))
                    .map(participant => {
                      // Determine participant status
                      console.log(`Rendering ${participant.name}: teamId=${participant.teamId}, isTeamLead=${participant.isTeamLead}`);
                      const isOnAnotherTeam = participant.teamId || participant.isTeamLead;
                      const isOtherTeamLead = participant.isTeamLead;
                      // Consider everyone not on a team as available, regardless of seekingTeam flag
                      const isAvailable = !isOnAnotherTeam;
                      
                      // Set background color based on status
                      let bgClass = "bg-white";
                      if (isOnAnotherTeam) bgClass = "bg-danger bg-opacity-10";
                      else if (isAvailable) bgClass = "bg-success bg-opacity-10";
                      
                      return (
                        <div className={`form-check mb-2 p-2 border-bottom ${bgClass}`} key={participant.id}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            name="newMembers"
                            id={`member-${participant.id}`}
                            value={participant.id}
                            checked={selectedNewMembers.includes(participant.id)}
                            onChange={(e) => handleMemberSelection(participant.id, e.target.checked)}
                            disabled={isOnAnotherTeam} // Disable if on another team
                          />
                          <label className="form-check-label d-block" htmlFor={`member-${participant.id}`}>
                            <div className="d-flex justify-content-between">
                              <strong>{participant.name}</strong>
                              <div>
                                {isOnAnotherTeam && 
                                  <span className="badge bg-danger me-1">Already on Team</span>}
                                {isOtherTeamLead && 
                                  <span className="badge bg-warning text-dark me-1">Team Lead</span>}
                                {isAvailable && 
                                  <span className="badge bg-success me-1">Available</span>}
                              </div>
                            </div>
                            
                            <div className="small text-muted mt-1">
                              {participant.email && <div>{participant.email}</div>}
                              <div>
                                {participant.college ? <span>{participant.college} • </span> : ''}
                                {participant.experienceLevel ? 
                                  <span className="badge bg-secondary me-1">{participant.experienceLevel}</span> : ''}
                                {participant.themePreference ? 
                                  <span className="badge bg-primary me-1">{
                                    participant.themePreference.includes('AI-Powered') ? 
                                      participant.themePreference.replace('AI-Powered ', '') : 
                                      participant.themePreference
                                  }</span> : 'No theme preference'}
                              </div>
                            </div>
                          </label>
                        </div>
                      );
                  })
                ) : (
                  <p className="text-muted">No available participants found. Try different search criteria.</p>
                )}
              </div>
              <div className="card-footer bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Showing {filteredParticipants.filter(p => !team || !team.members.includes(p.id)).length} available participants
                  </small>
                  <div>
                    <span className="badge bg-success me-1">Available</span>
                    <span className="badge bg-danger">Already on Team</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {team ? 'Update' : 'Add'} Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}