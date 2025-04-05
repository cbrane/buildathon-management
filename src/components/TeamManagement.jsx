import React, { useState, useEffect } from 'react';
import localforage from 'localforage';
import TeamForm from './TeamForm';
import { 
  getAllTeams, 
  addTeam, 
  updateTeam, 
  deleteTeam,
  getAllParticipants,
  addMemberToTeam,
  removeMemberFromTeam,
  changeTeamLead,
  getCheckins
} from '../utils/storage';

// Storage keys (duplicate from storage.js)
const KEYS = {
  PARTICIPANTS: 'buildathon_participants',
  TEAMS: 'buildathon_teams',
  CHECKINS: 'buildathon_checkins',
};

export default function TeamManagement({ onTeamsChange, onParticipantsChange, initialCheckins = {} }) {
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [checkins, setCheckins] = useState(initialCheckins);
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Function to migrate existing teams to use sequential numbering and fix missing team lead names
  async function migrateTeamNames(teamsData, participantsData) {
    let hasChanges = false;
    
    // First, check if any teams need migration (have names with "'s Team" pattern or missing leaderName)
    const needsMigration = teamsData.some(team => 
      team.name.includes("'s Team") || 
      (!team.leaderName && team.leaderId)
    );
    
    if (needsMigration) {
      console.log("Migrating team data to new format...");
      
      // Create new array with renamed teams and fixed leader names
      const updatedTeams = teamsData.map((team, index) => {
        let updatedTeam = { ...team };
        
        // Extract leader name if it's in the old format
        if (team.name.includes("'s Team")) {
          const leaderName = team.name.replace("'s Team", "");
          
          updatedTeam = {
            ...updatedTeam,
            name: `Team ${index + 1}`,
            leaderName: leaderName
          };
        }
        
        // Fix missing leaderName by finding the leader in participants
        if (!updatedTeam.leaderName && updatedTeam.leaderId) {
          const leader = participantsData.find(p => p.id === updatedTeam.leaderId);
          if (leader) {
            updatedTeam.leaderName = leader.name;
          }
        }
        
        return updatedTeam;
      });
      
      // Save the updated teams back to storage
      for (const team of updatedTeams) {
        await updateTeam(team.id, team);
        hasChanges = true;
      }
      
      if (hasChanges) {
        console.log("Team migration complete. Teams now have sequential numbers and proper leader names.");
      }
      
      return updatedTeams;
    }
    
    return teamsData;
  }

  // Function to ensure teams are numbered sequentially (1, 2, 3, ...) with no gaps
  async function renumberTeams(teamsData) {
    // Always renumber teams to ensure consistent ordering
    console.log("Renumbering teams to ensure sequential order...");
    
    // Sort teams by their current number and creation date
    const sortedTeams = [...teamsData].sort((a, b) => {
      // First sort by team number
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // If the numbers are the same or not valid, sort by creation date
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
    
    // Always renumber all teams to ensure proper sequence
    for (let i = 0; i < sortedTeams.length; i++) {
      const newTeamNum = i + 1;
      const currentTeamNum = parseInt(sortedTeams[i].name.replace(/\D/g, '')) || 0;
      
      if (currentTeamNum !== newTeamNum) {
        // Update the team name to use the sequential number
        sortedTeams[i].name = `Team ${newTeamNum}`;
        await updateTeam(sortedTeams[i].id, sortedTeams[i]);
        console.log(`Renumbered ${currentTeamNum !== 0 ? `Team ${currentTeamNum}` : 'Unnamed team'} to Team ${newTeamNum}`);
      }
    }
    
    console.log("Team renumbering complete");
    return sortedTeams;
  }
  
  async function loadData() {
    setIsLoading(true);
    try {
      const teamsData = await getAllTeams();
      const participantsData = await getAllParticipants();
      
      // Only fetch checkins if we don't have initial data
      if (Object.keys(checkins).length === 0) {
        const checkinsData = await getCheckins();
        setCheckins(checkinsData || {});
      }
      
      // Migrate team names if needed (passing participants to fix leader references)
      const migratedTeams = await migrateTeamNames(teamsData || [], participantsData || []);
      
      // Ensure teams are numbered sequentially
      const renumberedTeams = await renumberTeams(migratedTeams);
      
      setTeams(renumberedTeams);
      setParticipants(participantsData || []);
      
      // Notify parent component if callback exists
      if (onTeamsChange) onTeamsChange(renumberedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      alert('Failed to load teams. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddTeam(formData) {
    try {
      // Validate team lead selection
      if (!formData.leaderId) {
        alert('Please select a team lead');
        return;
      }
      
      // Create new team data (we'll number it in the renumbering step)
      const { members, leaderId, ...teamData } = formData;
      const newTeamData = {
        ...teamData,
        leaderId,
        name: `Team Temp` // Temporary name that will be fixed by renumbering
      };
      
      // Create the team
      const newTeam = await addTeam(newTeamData);
      
      // Add the team lead first (this will set the proper status)
      await addMemberToTeam(newTeam.id, leaderId);
      
      // Add other members to team
      if (members && members.length > 0) {
        for (const memberId of members) {
          // Don't re-add the leader as a member
          if (memberId !== leaderId) {
            await addMemberToTeam(newTeam.id, memberId);
          }
        }
      }
      
      // Fetch updated data
      const updatedParticipantsData = await getAllParticipants();
      const teamsData = await getAllTeams();
      
      // Renumber teams to maintain sequential order
      const renumberedTeams = await renumberTeams(teamsData || []);
      
      // Update state
      setTeams(renumberedTeams);
      setParticipants(updatedParticipantsData);
      
      // Notify parent component with both updated datasets
      if (onTeamsChange) {
        onTeamsChange(renumberedTeams);
        
        // If parent provided a participants change handler, use it
        if (onParticipantsChange) {
          onParticipantsChange(updatedParticipantsData);
        }
      }
      
      setShowForm(false);
    } catch (error) {
      console.error('Error adding team:', error);
      alert(`Failed to add team: ${error.message}`);
    }
  }

  async function handleUpdateTeam(formData) {
    try {
      const { members, ...teamData } = formData;
      
      // Check if team lead has changed
      const currentTeam = teams.find(t => t.id === editingTeam.id);
      const currentLeaderId = currentTeam.leaderId;
      const newLeaderId = teamData.leaderId;
      
      // If the team lead has changed, use changeTeamLead function
      if (newLeaderId && newLeaderId !== currentLeaderId) {
        console.log(`Changing team lead from ${currentLeaderId} to ${newLeaderId}`);
        await changeTeamLead(editingTeam.id, newLeaderId);
      } else {
        // If team lead hasn't changed, just update the team data
        await updateTeam(editingTeam.id, teamData);
      }
      
      // Get current team data after potential lead change
      const updatedCurrentTeam = (await getAllTeams()).find(t => t.id === editingTeam.id) || currentTeam;
      const currentMembers = updatedCurrentTeam.members || [];
      const teamLeadId = updatedCurrentTeam.leaderId;
      
      console.log("Updating team with members:", members);
      console.log("Current members:", currentMembers);
      
      // The members array from formData already includes:
      // 1. Team lead (always included)
      // 2. Current members who were not removed
      // 3. New members that were checked
      
      // Calculate members to remove (in current members but not in new members)
      const membersToRemove = currentMembers.filter(id => 
        id !== teamLeadId && // Never remove team lead
        !members.includes(id) // Not in the new members list
      );
      
      // Calculate members to add (in new members but not in current members)
      const membersToAdd = members.filter(id => 
        !currentMembers.includes(id) // Not already in the team
      );
      
      console.log("Members to remove:", membersToRemove);
      console.log("Members to add:", membersToAdd);
      
      // First remove members
      for (const memberId of membersToRemove) {
        try {
          console.log(`Removing member ${memberId} from team ${editingTeam.id}`);
          await removeMemberFromTeam(editingTeam.id, memberId);
        } catch (error) {
          console.error(`Error removing member ${memberId}:`, error);
          throw new Error(`Failed to remove member: ${error.message}`);
        }
      }
      
      // Then add new members
      for (const memberId of membersToAdd) {
        try {
          console.log(`Adding member ${memberId} to team ${editingTeam.id}`);
          await addMemberToTeam(editingTeam.id, memberId);
        } catch (error) {
          console.error(`Error adding member ${memberId}:`, error);
          throw new Error(`Failed to add member: ${error.message}`);
        }
      }
      
      setShowForm(false);
      setEditingTeam(null);
      
      // Reload both teams and participants to reflect updated seeking status
      const updatedTeamsData = await getAllTeams();
      const updatedParticipantsData = await getAllParticipants();
      
      setTeams(updatedTeamsData || []);
      setParticipants(updatedParticipantsData || []);
      
      // Notify parent component about both data updates
      if (onTeamsChange) onTeamsChange(updatedTeamsData || []);
      if (onParticipantsChange) onParticipantsChange(updatedParticipantsData || []);
    } catch (error) {
      console.error('Error updating team:', error);
      alert(`Failed to update team: ${error.message || 'Please try again.'}`);
    }
  }

  async function handleDeleteTeam(id) {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete team and update participant status
      await deleteTeam(id);
      
      // Reload participants first (since their status changed)
      const participantsData = await getAllParticipants();
      setParticipants(participantsData || []);
      
      // After deleting, reload and renumber teams to maintain sequential order
      const teamsData = await getAllTeams();
      const renumberedTeams = await renumberTeams(teamsData || []);
      
      setTeams(renumberedTeams);
      
      // Notify parent components about both data updates
      if (onTeamsChange) onTeamsChange(renumberedTeams);
      if (onParticipantsChange) onParticipantsChange(participantsData || []);
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team. Please try again.');
    }
  }

  // Helper function to scroll to the form
  function scrollToForm() {
    setTimeout(() => {
      const formElement = document.querySelector('.team-form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
  
  function handleEdit(team) {
    setEditingTeam(team);
    setShowForm(true);
    scrollToForm();
  }

  function handleCancel() {
    setShowForm(false);
    setEditingTeam(null);
  }

  // Get participant details by ID
  function getParticipantById(id) {
    return participants.find(p => p.id === id) || { name: 'Unknown' };
  }

  // Filter teams based on search term and filter status
  const filteredTeams = teams.filter(team => {
    const matchesSearch = searchTerm === '' || 
      (team.name && team.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (team.college && team.college.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (team.leaderName && team.leaderName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    // Filter by status
    if (filterStatus === 'seeking-members') {
      return team.seekingMembers;
    } else if (filterStatus === 'complete') {
      return !team.seekingMembers;
    }
    
    return true; // 'all' filter
  }).sort((a, b) => {
    // Extract team numbers from names and sort numerically
    // This ensures "Team 2" comes after "Team 1" and before "Team 3"
    const numA = parseInt((a.name || '').replace(/\D/g, '')) || 0;
    const numB = parseInt((b.name || '').replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Teams Management</h3>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setEditingTeam(null);
            const willShowForm = !showForm;
            setShowForm(willShowForm);
            
            // If opening the form, scroll to it
            if (willShowForm) {
              scrollToForm();
            }
          }}
        >
          {showForm ? 'Cancel' : 'Add New Team'}
        </button>
      </div>
      
      {showForm && (
        <div className="mb-4 team-form-container" id="team-form-section">
          <TeamForm 
            team={editingTeam}
            participants={participants}
            onSubmit={editingTeam ? handleUpdateTeam : handleAddTeam}
            onCancel={handleCancel}
            title={editingTeam ? 'Edit Team' : 'Add New Team'}
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
                  placeholder="Search teams..."
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
                <option value="all">All Teams</option>
                <option value="seeking-members">Seeking Members</option>
                <option value="complete">Complete Teams</option>
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
          <p className="mt-2">Loading teams...</p>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 g-4">
          {filteredTeams.length > 0 ? (
            filteredTeams.map(team => {
              // Get team members and sort alphabetically by name
              const teamMembers = (team.members || [])
                .map(id => getParticipantById(id))
                .sort((a, b) => {
                  // Keep team lead at the top
                  if (a.id === team.leaderId) return -1;
                  if (b.id === team.leaderId) return 1;
                  
                  // Sort other members alphabetically
                  return (a.name || '').localeCompare(b.name || '');
                });
              
              return (
                <div className="col" key={team.id}>
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">{team.name}</h5>
                      <div className="d-flex gap-2">
                        {/* Calculate team check-in status */}
                        {(() => {
                          const checkedInCount = teamMembers.filter(member => checkins[member.id]).length;
                          const totalMembers = teamMembers.length;
                          const checkInPercentage = totalMembers ? Math.round((checkedInCount / totalMembers) * 100) : 0;
                          
                          return (
                            <span className={`badge ${checkInPercentage === 100 ? 'bg-success' : checkedInCount > 0 ? 'bg-warning' : 'bg-danger'}`}>
                              {checkedInCount}/{totalMembers} Checked In
                            </span>
                          );
                        })()}
                        
                        {team.seekingMembers ? (
                          <span className="badge bg-warning">
                            Seeking {team.slotsNeeded} Members
                          </span>
                        ) : (
                          <span className="badge bg-success">Complete</span>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <strong>Team Lead:</strong> {team.leaderName || 'Unknown'}
                        {team.leaderId && (
                          <span className="badge bg-success ms-2">Lead</span>
                        )}
                      </div>
                      <div className="mb-3">
                        <strong>College:</strong> {team.college || 'Not specified'}
                      </div>
                      <div className="mb-3">
                        <strong>Theme:</strong> {team.themePreference || 'Not specified'}
                      </div>
                      <div className="mb-3">
                        <strong>Experience:</strong> {team.experienceLevel || 'Not specified'}
                      </div>
                      <div className="mb-3">
                        <strong>Team Members ({teamMembers.length}):</strong>
                        <ul className="list-group list-group-flush mt-2">
                          {teamMembers.length > 0 ? (
                            teamMembers.map(member => (
                              <li className="list-group-item d-flex justify-content-between align-items-center" key={member.id}>
                                <div>
                                  {member.name}
                                  {(member.isTeamLead || member.id === team.leaderId) && 
                                    <span className="badge bg-success ms-2">Lead</span>}
                                  {member.isTeamMember && 
                                    <span className="badge bg-info ms-2">Member</span>}
                                </div>
                                <div>
                                  {checkins[member.id] ? (
                                    <span className="badge bg-success">Checked In</span>
                                  ) : (
                                    <span className="badge bg-danger">Not Checked In</span>
                                  )}
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="list-group-item text-muted">No members in this team</li>
                          )}
                        </ul>
                      </div>
                    </div>
                    <div className="card-footer">
                      <div className="d-flex justify-content-end gap-2">
                        <button 
                          className="btn btn-primary"
                          onClick={() => handleEdit(team)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleDeleteTeam(team.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-12">
              <div className="alert alert-info">
                {searchTerm || filterStatus !== 'all' ? 
                  'No teams match your search criteria.' : 
                  'No teams found. Add a new team or import from CSV.'}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-3">
        <p className="text-muted mb-0">Total: {filteredTeams.length} teams shown</p>
      </div>
    </div>
  );
}