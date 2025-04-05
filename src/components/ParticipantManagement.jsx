import React, { useState, useEffect } from 'react';
import { 
  getAllParticipants, 
  addParticipant, 
  updateParticipant, 
  deleteParticipant,
  checkInParticipant,
  removeCheckin,
  getCheckins,
  getAllTeams
} from '../utils/storage';
import ParticipantForm from './ParticipantForm';

export default function ParticipantManagement({ onParticipantsChange, initialCheckins = {} }) {
  const [participants, setParticipants] = useState([]);
  const [checkins, setCheckins] = useState(initialCheckins);
  const [teams, setTeams] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadParticipants();
  }, []);

  async function loadParticipants() {
    setIsLoading(true);
    try {
      // Load participants and teams in parallel for better performance
      const [data, teamsData] = await Promise.all([
        getAllParticipants(),
        getAllTeams()
      ]);
      
      // Only fetch checkins if we don't have initial data
      if (Object.keys(checkins).length === 0) {
        const checkinsData = await getCheckins();
        setCheckins(checkinsData || {});
      }
      
      setParticipants(data || []);
      setTeams(teamsData || []);
      
      // Debug log for team leader-team mappings
      if (teamsData && teamsData.length > 0 && data && data.length > 0) {
        console.log("Team Leads and their teams:");
        const teamLeads = data.filter(p => p.isTeamLead);
        teamLeads.forEach(lead => {
          const leadTeam = teamsData.find(t => t.leaderId === lead.id);
          console.log(`Team Lead: ${lead.name} (${lead.id}), Team ID: ${lead.teamId || 'Not set'}, Found Team: ${leadTeam ? leadTeam.name : 'None'}`);
        });
      }
      
      // Notify parent component if callback exists
      if (onParticipantsChange) onParticipantsChange(data || []);
    } catch (error) {
      console.error('Error loading participants:', error);
      alert('Failed to load participants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddParticipant(formData) {
    try {
      await addParticipant(formData);
      setShowForm(false);
      loadParticipants();
    } catch (error) {
      console.error('Error adding participant:', error);
      alert('Failed to add participant. Please try again.');
    }
  }

  async function handleUpdateParticipant(formData) {
    try {
      await updateParticipant(editingParticipant.id, formData);
      setShowForm(false);
      setEditingParticipant(null);
      loadParticipants();
    } catch (error) {
      console.error('Error updating participant:', error);
      alert('Failed to update participant. Please try again.');
    }
  }

  async function handleDeleteParticipant(id) {
    if (!window.confirm('Are you sure you want to delete this participant? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteParticipant(id);
      loadParticipants();
    } catch (error) {
      console.error('Error deleting participant:', error);
      alert('Failed to delete participant. Please try again.');
    }
  }

  async function handleCheckIn(id) {
    try {
      // Check in the participant
      const result = await checkInParticipant(id);
      
      // Update local checkins state immediately for UI responsiveness
      const updatedCheckins = { ...checkins, [id]: result.timestamp };
      setCheckins(updatedCheckins);
      
      // Notify the parent component of the change
      if (onParticipantsChange) {
        // Re-fetch all participants to be safe
        const updatedParticipants = await getAllParticipants();
        setParticipants(updatedParticipants);
        onParticipantsChange(updatedParticipants, updatedCheckins);
      }
    } catch (error) {
      console.error('Error checking in participant:', error);
      alert('Failed to check in participant. Please try again.');
    }
  }

  async function handleRemoveCheckin(id) {
    try {
      // Remove the check-in
      await removeCheckin(id);
      
      // Update local checkins state immediately for UI responsiveness
      const updatedCheckins = { ...checkins };
      delete updatedCheckins[id];
      setCheckins(updatedCheckins);
      
      // Notify the parent component of the change
      if (onParticipantsChange) {
        // Re-fetch all participants to be safe
        const updatedParticipants = await getAllParticipants();
        setParticipants(updatedParticipants);
        onParticipantsChange(updatedParticipants, updatedCheckins);
      }
    } catch (error) {
      console.error('Error removing check-in:', error);
      alert('Failed to remove check-in. Please try again.');
    }
  }

  function handleEdit(participant) {
    setEditingParticipant(participant);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingParticipant(null);
  }
  
  // Helper function to get team info for a participant
  function getTeamInfo(participant) {
    // If we received a teamId directly (for backward compatibility)
    if (typeof participant === 'string') {
      const teamId = participant;
      const team = teams.find(team => team.id === teamId);
      if (!team) return { name: 'Unknown Team', number: '?' };
      
      // Extract the team number from the name
      const teamNumber = team.name.replace(/\D/g, '');
      return { 
        name: team.name,
        number: teamNumber || '?'
      };
    }
    
    // If we have a participant object
    if (participant) {
      // If participant has a teamId, use it to find the team
      if (participant.teamId) {
        const team = teams.find(team => team.id === participant.teamId);
        if (team) {
          const teamNumber = team.name.replace(/\D/g, '');
          return { 
            name: team.name,
            number: teamNumber || '?'
          };
        }
      }
      
      // If participant is a team lead, find their team by leaderId
      if (participant.isTeamLead) {
        const team = teams.find(team => team.leaderId === participant.id);
        if (team) {
          const teamNumber = team.name.replace(/\D/g, '');
          return { 
            name: team.name,
            number: teamNumber || '?'
          };
        }
      }
    }
    
    // Default case - no team found
    return { name: '-', number: '-' };
  }

  // Filter participants based on search term and filter status
  const filteredParticipants = participants
    .filter(participant => {
      const matchesSearch = searchTerm === '' || 
        (participant.name && participant.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (participant.college && participant.college.toLowerCase().includes(searchTerm.toLowerCase())) ||
        // Allow searching by team number - pass the entire participant
        getTeamInfo(participant).number.includes(searchTerm);
      
      if (!matchesSearch) return false;
      
      // Filter by status
      if (filterStatus === 'seeking-team') {
        return participant.seekingTeam && !participant.teamId && !participant.isTeamLead;
      } else if (filterStatus === 'in-team') {
        return participant.teamId || participant.isTeamLead || participant.isTeamMember;
      } else if (filterStatus === 'checked-in') {
        return !!checkins[participant.id];
      } else if (filterStatus === 'not-checked-in') {
        return !checkins[participant.id];
      }
      
      return true; // 'all' filter
    })
    // Sort participants alphabetically by name
    .sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Participants Management</h3>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setEditingParticipant(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : 'Add New Participant'}
        </button>
      </div>
      
      {showForm && (
        <div className="mb-4">
          <ParticipantForm 
            participant={editingParticipant}
            onSubmit={editingParticipant ? handleUpdateParticipant : handleAddParticipant}
            onCancel={handleCancel}
            title={editingParticipant ? 'Edit Participant' : 'Add New Participant'}
          />
        </div>
      )}
      
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, college, or team number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6">
              <select 
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Participants</option>
                <option value="seeking-team">Seeking Team</option>
                <option value="in-team">In Team</option>
                <option value="checked-in">Checked In</option>
                <option value="not-checked-in">Not Checked In</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center my-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading participants...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>Name</th>
                <th>College</th>
                <th>Status</th>
                <th title="The team number assigned to this participant">Team Number</th>
                <th>Theme</th>
                <th>Experience</th>
                <th>Check-in</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map(participant => (
                  <tr key={participant.id}>
                    <td>{participant.name}</td>
                    <td>{participant.college || '-'}</td>
                    <td>
                      {participant.isTeamLead && <span className="badge bg-success me-1">Team Lead</span>}
                      {participant.isTeamMember && <span className="badge bg-info me-1">Team Member</span>}
                      {participant.seekingTeam && !participant.teamId && !participant.isTeamLead && 
                        <span className="badge bg-warning">Seeking Team</span>}
                      {!participant.seekingTeam && !participant.isTeamLead && !participant.isTeamMember && 
                        <span className="badge bg-secondary">Not Seeking</span>}
                      {(participant.teamId || participant.isTeamLead) && 
                        <span className="badge bg-primary ms-1">Team Assigned</span>}
                    </td>
                    <td>
                      {(participant.teamId || participant.isTeamLead) ? (
                        <strong className={participant.isTeamLead ? "text-success" : "text-primary"}>
                          {getTeamInfo(participant).number}
                          {participant.isTeamLead && 
                            <span className="ms-1" title="Team Lead">👑</span>}
                        </strong>
                      ) : '-'}
                    </td>
                    <td>{participant.themePreference ? participant.themePreference.replace('AI-Powered ', '') : '-'}</td>
                    <td>{participant.experienceLevel || '-'}</td>
                    <td>
                      <div className="d-flex gap-1" style={{ minWidth: '120px' }}>
                        {checkins[participant.id] ? (
                          <>
                            <span className="badge bg-success d-flex align-items-center px-2">Checked In</span>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveCheckin(participant.id)}
                              title="Remove check-in"
                              style={{ width: '30px', height: '30px', padding: '0px' }}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </>
                        ) : (
                          <button 
                            className="btn btn-sm btn-success"
                            onClick={() => handleCheckIn(participant.id)}
                            style={{ width: '100px' }}
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(participant)}
                          style={{ width: '70px' }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteParticipant(participant.id)}
                          style={{ width: '70px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">
                    {searchTerm || filterStatus !== 'all' ? 
                      'No participants match your search criteria.' : 
                      'No participants found. Add a new participant or import from CSV.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="d-flex justify-content-between mt-3">
        <p className="text-muted mb-0">Total: {filteredParticipants.length} participants shown</p>
        <p className="text-muted mb-0">
          Checked in: {Object.keys(checkins).length} / {participants.length}
        </p>
      </div>
    </div>
  );
}