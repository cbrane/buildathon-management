import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

// Storage keys
const KEYS = {
  PARTICIPANTS: 'buildathon_participants',
  TEAMS: 'buildathon_teams',
  CHECKINS: 'buildathon_checkins',
};

// Initialize data stores
localforage.config({
  name: 'buildathon_dashboard',
  version: 1.0,
  storeName: 'buildathon_store',
  description: 'Storage for buildathon participant management'
});

// Ensure default data structure exists
async function initializeStorage() {
  const participants = await localforage.getItem(KEYS.PARTICIPANTS);
  const teams = await localforage.getItem(KEYS.TEAMS);
  const checkins = await localforage.getItem(KEYS.CHECKINS);

  if (!participants) await localforage.setItem(KEYS.PARTICIPANTS, []);
  if (!teams) await localforage.setItem(KEYS.TEAMS, []);
  if (!checkins) await localforage.setItem(KEYS.CHECKINS, {});
}

// Participant operations
async function getAllParticipants() {
  await initializeStorage();
  return localforage.getItem(KEYS.PARTICIPANTS);
}

async function addParticipant(participant) {
  const participants = await getAllParticipants();
  
  // Ensure new participants have proper status flags set
  const newParticipant = {
    ...participant,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    // Set proper defaults if not provided (all new participants are seeking by default)
    seekingTeam: participant.seekingTeam !== undefined ? participant.seekingTeam : true,
    isTeamLead: participant.isTeamLead === true ? true : false,
    isTeamMember: participant.isTeamMember === true ? true : false
  };
  
  participants.push(newParticipant);
  await localforage.setItem(KEYS.PARTICIPANTS, participants);
  return newParticipant;
}

async function updateParticipant(id, updatedData) {
  const participants = await getAllParticipants();
  const index = participants.findIndex(p => p.id === id);
  
  if (index === -1) throw new Error(`Participant with ID ${id} not found`);
  
  // Handle status flags based on updated data
  let finalData = { ...updatedData };
  
  // Ensure status flags are consistent
  if (finalData.isTeamLead === true) {
    // Team leads can't be seeking and can't be regular team members
    finalData.seekingTeam = false;
    finalData.isTeamMember = false;
  } else if (finalData.isTeamMember === true) {
    // Team members can't be seeking and can't be team leads
    finalData.seekingTeam = false;
    finalData.isTeamLead = false;
  } else if (finalData.seekingTeam === true) {
    // Seekers can't be team leads or team members
    finalData.isTeamLead = false;
    finalData.isTeamMember = false;
  }
  
  participants[index] = {
    ...participants[index],
    ...finalData,
    updatedAt: new Date().toISOString(),
  };
  
  await localforage.setItem(KEYS.PARTICIPANTS, participants);
  return participants[index];
}

async function deleteParticipant(id) {
  const participants = await getAllParticipants();
  const filtered = participants.filter(p => p.id !== id);
  
  if (filtered.length === participants.length) {
    throw new Error(`Participant with ID ${id} not found`);
  }
  
  await localforage.setItem(KEYS.PARTICIPANTS, filtered);
}

// Team operations
async function getAllTeams() {
  await initializeStorage();
  return localforage.getItem(KEYS.TEAMS);
}

async function addTeam(team) {
  const teams = await getAllTeams();
  const newTeam = {
    ...team,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    members: team.members || []
  };
  
  teams.push(newTeam);
  await localforage.setItem(KEYS.TEAMS, teams);
  return newTeam;
}

async function updateTeam(id, updatedData) {
  const teams = await getAllTeams();
  const index = teams.findIndex(t => t.id === id);
  
  if (index === -1) throw new Error(`Team with ID ${id} not found`);
  
  teams[index] = {
    ...teams[index],
    ...updatedData,
    updatedAt: new Date().toISOString(),
  };
  
  await localforage.setItem(KEYS.TEAMS, teams);
  return teams[index];
}

async function deleteTeam(id) {
  const teams = await getAllTeams();
  const participants = await getAllParticipants();
  
  // Find the team to delete
  const teamToDelete = teams.find(t => t.id === id);
  if (!teamToDelete) {
    throw new Error(`Team with ID ${id} not found`);
  }
  
  // Reset all team members to seeking status
  if (teamToDelete.members && teamToDelete.members.length > 0) {
    for (const memberId of teamToDelete.members) {
      const participantIndex = participants.findIndex(p => p.id === memberId);
      if (participantIndex !== -1) {
        // Reset participant status
        participants[participantIndex].seekingTeam = true;
        participants[participantIndex].teamId = null;
        
        // If this was the team lead, reset that status too
        if (teamToDelete.leaderId === participants[participantIndex].id) {
          participants[participantIndex].isTeamLead = false;
        }
        
        // Reset team member status
        participants[participantIndex].isTeamMember = false;
        participants[participantIndex].updatedAt = new Date().toISOString();
      }
    }
    
    // Save updated participants
    await localforage.setItem(KEYS.PARTICIPANTS, participants);
  }
  
  // Remove the team
  const filtered = teams.filter(t => t.id !== id);
  await localforage.setItem(KEYS.TEAMS, filtered);
  
  return {
    deletedTeam: teamToDelete,
    updatedParticipants: participants
  };
}

// Member operations
async function addMemberToTeam(teamId, participantId) {
  const teams = await getAllTeams();
  const participants = await getAllParticipants();
  
  // Find the team
  const teamIndex = teams.findIndex(t => t.id === teamId);
  if (teamIndex === -1) throw new Error(`Team with ID ${teamId} not found`);
  
  // Find the participant
  const participantIndex = participants.findIndex(p => p.id === participantId);
  if (participantIndex === -1) throw new Error(`Participant with ID ${participantId} not found`);
  
  // Initialize members array if it doesn't exist
  if (!teams[teamIndex].members) {
    teams[teamIndex].members = [];
  }
  
  // Check if participant is already in team
  if (teams[teamIndex].members.includes(participantId)) {
    // Just return success if they're already in the team - silently succeed
    return {
      team: teams[teamIndex],
      participant: participants[participantIndex],
      status: 'already_in_team'
    };
  }
  
  // Check if participant is already on another team - only if they have a different teamId
  if (participants[participantIndex].teamId && 
      participants[participantIndex].teamId !== teamId &&
      participants[participantIndex].teamId !== null) {
    
    // Get the team name for better error message
    const currentTeam = teams.find(t => t.id === participants[participantIndex].teamId);
    const teamName = currentTeam ? currentTeam.name : "another team";
    
    throw new Error(`Participant ${participants[participantIndex].name} is already on ${teamName}. Please remove them from that team first.`);
  }
  
  // Determine if this participant is being added as the team lead
  const isTeamLead = participantId === teams[teamIndex].leaderId;
  
  // Add participant to team
  teams[teamIndex].members.push(participantId);
  teams[teamIndex].updatedAt = new Date().toISOString();
  
  // Update participant status
  participants[participantIndex].seekingTeam = false;
  participants[participantIndex].teamId = teamId;
  
  // Set the appropriate role flag
  if (isTeamLead) {
    participants[participantIndex].isTeamLead = true;
    participants[participantIndex].isTeamMember = false;
  } else {
    participants[participantIndex].isTeamMember = true;
    participants[participantIndex].isTeamLead = false;
  }
  
  participants[participantIndex].updatedAt = new Date().toISOString();
  
  // Save changes to both collections
  await localforage.setItem(KEYS.TEAMS, teams);
  await localforage.setItem(KEYS.PARTICIPANTS, participants);
  
  return {
    team: teams[teamIndex],
    participant: participants[participantIndex]
  };
}

async function removeMemberFromTeam(teamId, participantId) {
  const teams = await getAllTeams();
  const participants = await getAllParticipants();
  
  // Find the team
  const teamIndex = teams.findIndex(t => t.id === teamId);
  if (teamIndex === -1) throw new Error(`Team with ID ${teamId} not found`);
  if (!teams[teamIndex].members) return; // No members to remove
  
  // Check if participant is actually in the team
  const memberIndex = teams[teamIndex].members.indexOf(participantId);
  if (memberIndex === -1) throw new Error(`Participant not in team`);
  
  // Find the participant
  const participantIndex = participants.findIndex(p => p.id === participantId);
  
  // Adjust this to still log a special message but let team lead be removed if requested directly
  // This makes the UI consistent but allows us to remove team leads when explicitly needed
  if (teams[teamIndex].leaderId === participantId) {
    // Provide a more helpful error message
    const participant = participants[participantIndex];
    const participantName = participant ? participant.name : 'Team lead';
    console.warn(`Removing ${participantName} as team lead. Team should assign a new leader.`);
  }
  
  // Remove participant from team
  teams[teamIndex].members.splice(memberIndex, 1);
  teams[teamIndex].updatedAt = new Date().toISOString();
  
  // Update participant status - mark as seeking team again and clear teamId
  if (participantIndex !== -1) {
    participants[participantIndex].seekingTeam = true;        // Set back to seeking a team
    participants[participantIndex].isTeamMember = false;      // No longer a team member
    participants[participantIndex].teamId = null;             // Clear team association
    participants[participantIndex].updatedAt = new Date().toISOString();
  }
  
  // Save changes to both collections
  await localforage.setItem(KEYS.TEAMS, teams);
  await localforage.setItem(KEYS.PARTICIPANTS, participants);
  
  return {
    team: teams[teamIndex],
    participant: participantIndex !== -1 ? participants[participantIndex] : null
  };
}

// Check-in operations
async function getCheckins() {
  await initializeStorage();
  return localforage.getItem(KEYS.CHECKINS);
}

async function checkInParticipant(participantId) {
  const checkins = await getCheckins();
  const participants = await getAllParticipants();
  
  const participantExists = participants.some(p => p.id === participantId);
  if (!participantExists) throw new Error(`Participant with ID ${participantId} not found`);
  
  checkins[participantId] = new Date().toISOString();
  await localforage.setItem(KEYS.CHECKINS, checkins);
  
  return { participantId, timestamp: checkins[participantId] };
}

async function removeCheckin(participantId) {
  const checkins = await getCheckins();
  
  if (!checkins[participantId]) {
    throw new Error(`Checkin for participant with ID ${participantId} not found`);
  }
  
  delete checkins[participantId];
  await localforage.setItem(KEYS.CHECKINS, checkins);
}

// CSV data import to storage
async function importCSVDataToStorage(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid CSV data');
  }
  
  // Debug counters
  let debugStats = {
    totalRowsProcessed: 0,
    individuals: 0,
    teamLeads: 0,
    declaredAdditionalMembers: 0,
    actualMembersCreated: 0,
    missingMemberNames: 0,
    participants: 0,
  };
  
  // Extract participants and form teams from CSV data
  const participants = [];
  const teams = [];
  const teamMembersMap = new Map(); // To track team members
  
  console.log("Starting CSV import with", data.length, "rows...");
  
  // Debug: Print all column names from first row to find the correct field names
  if (data.length > 0) {
    console.log("CSV FIELD NAMES:");
    Object.keys(data[0]).forEach(key => {
      if (key.toLowerCase().includes('member') || key.toLowerCase().includes('team')) {
        console.log(`- "${key}"`);
      }
    });
  }
  
  data.forEach(row => {
    if (!row['Full Name'] || row['Full Name'].trim() === '') return;
    debugStats.totalRowsProcessed++;
    
    // Check if it's a team or individual
    const isTeam = row[' Are you registering as an individual or as a team? '] && 
                   row[' Are you registering as an individual or as a team? '].includes('team');
    
    if (isTeam) {
      debugStats.teamLeads++;
      
      // Create team leader as participant
      const teamLeader = {
        id: uuidv4(),
        name: row['Full Name'],
        email: row['Email Address (please use your college\'s .edu email)'] || '',
        college: row['College'] || '',
        experienceLevel: row['What is your team\'s collective experience with AI? (Select all that apply)'] || '',
        themePreference: row['Which theme(s) is your team interested in?'] || '',
        isTeamLead: true,
        createdAt: new Date().toISOString()
      };
      
      participants.push(teamLeader);
      debugStats.participants++;
      
      // Get current team count to assign sequential team number
      const teamCount = teams.length + 1;
      
      // Create the team with sequential numbering
      const teamId = uuidv4();
      const team = {
        id: teamId,
        name: `Team ${teamCount}`,
        leaderId: teamLeader.id,
        leaderName: row['Full Name'], // Store leader name separately for reference
        college: row['College'] || '',
        themePreference: row['Which theme(s) is your team interested in?'] || '',
        experienceLevel: row['What is your team\'s collective experience with AI? (Select all that apply)'] || '',
        seekingMembers: row[' Does your team need any additional members?'] && 
                       row[' Does your team need any additional members?'].includes('Yes'),
        slotsNeeded: parseInt(row['How many more team members do you want to be matched with?']) || 0,
        members: [teamLeader.id],
        createdAt: new Date().toISOString()
      };
      
      teams.push(team);
      teamMembersMap.set(teamId, [teamLeader.id]);
      
      // Count declared additional members
      const additionalMembersKey = Object.keys(row).find(key => 
        key.includes("How many additional team members") && 
        key.includes("not including yourself")
      ) || ' How many additional team members do you have? (not including yourself) - *Reminder, teams are restricted to 5 members maximum. Make sure you enter the additional members information in the following questions. If you do not, they will not be placed on your team.';
      
      const declaredCount = parseInt(row[additionalMembersKey]) || 0;
      debugStats.declaredAdditionalMembers += declaredCount;
      
      // Debug log for this team
      console.log(`Team lead: ${row['Full Name']}, Declared members: ${declaredCount}`);
      console.log("ROW KEYS:");
      Object.keys(row).forEach(key => console.log(`- ${key}: ${row[key]}`));
      
      // Track actual members created
      let actualMembersForTeam = 0;
      
      // Create a function to find member keys
      function findMemberKey(index, type) {
        // Possible variations of member field names
        const possiblePatterns = [
          `Full Name - Additional Team Member ${index}`,
          `Additional Team Member ${index} - Full Name`,
          `Full Name Additional Team Member ${index}`,
          `Team Member ${index} Name`,
          `Member ${index} Name`,
          `Additional Member ${index} Name`,
          `Team Member ${index}`
        ];
        
        if (type === 'email') {
          possiblePatterns.forEach((pattern, i) => {
            possiblePatterns[i] = pattern.replace('Name', 'Email').replace('Full Name', 'Email');
          });
          
          possiblePatterns.push(
            `Email - Additional Team Member ${index}`,
            `Additional Team Member ${index} - Email`,
            `Email Additional Team Member ${index}`,
            `Team Member ${index} Email`
          );
        }
        
        // Find a key that matches any of the patterns
        return Object.keys(row).find(key => {
          return possiblePatterns.some(pattern => 
            key.toLowerCase().includes(pattern.toLowerCase()) ||
            key.toLowerCase().includes(`member ${index}`) && 
            (type === 'name' ? key.toLowerCase().includes('name') : key.toLowerCase().includes('email'))
          );
        });
      }
      
      // Add team members by finding the correct field names
      for (let i = 1; i <= Math.max(4, declaredCount); i++) {
        const nameKey = findMemberKey(i, 'name');
        const emailKey = findMemberKey(i, 'email');
        
        const memberName = nameKey ? row[nameKey] : null;
        const memberEmail = emailKey ? row[emailKey] : null;
        
        if (nameKey) {
          console.log(`Found member ${i} name key: "${nameKey}" with value: "${memberName}"`);
        } else {
          console.log(`Couldn't find name key for member ${i}`);
        }
        
        // Check if this slot should have data based on declared count
        if (i <= declaredCount) {
          if (!memberName || memberName.trim() === '') {
            debugStats.missingMemberNames++;
            console.log(`  WARNING: Team ${row['Full Name']} declared ${declaredCount} members but member ${i} has no name`);
          }
        }
        
        if (memberName && memberName.trim() !== '') {
          const memberId = uuidv4();
          const member = {
            id: memberId,
            name: memberName,
            email: memberEmail || '',
            college: row['College'] || '',
            experienceLevel: row['What is your team\'s collective experience with AI? (Select all that apply)'] || '',
            themePreference: row['Which theme(s) is your team interested in?'] || '',
            isTeamMember: true,
            teamId: teamId,
            createdAt: new Date().toISOString()
          };
          
          participants.push(member);
          teamMembersMap.get(teamId).push(memberId);
          actualMembersForTeam++;
          debugStats.participants++;
        }
      }
      
      debugStats.actualMembersCreated += actualMembersForTeam;
      
      if (actualMembersForTeam !== declaredCount) {
        console.log(`  DISCREPANCY: Team ${row['Full Name']} declared ${declaredCount} members but created ${actualMembersForTeam}`);
      }
      
    } else {
      // Individual participant
      debugStats.individuals++;
      
      const participant = {
        id: uuidv4(),
        name: row['Full Name'],
        email: row['Email Address (please use your college\'s .edu email)'] || '',
        college: row['College'] || '',
        experienceLevel: row[' AI Experience Level '] || '',
        themePreference: row[' Which theme(s) are you most interested in? (We\'ll use this for team matching)  '] || '',
        seekingTeam: true,
        createdAt: new Date().toISOString()
      };
      
      participants.push(participant);
      debugStats.participants++;
    }
  });
  
  // Update teams with all member IDs
  teams.forEach(team => {
    team.members = teamMembersMap.get(team.id) || [];
  });
  
  // Log final stats
  console.log("=== IMPORT DEBUG STATS ===");
  console.log("Total rows processed:", debugStats.totalRowsProcessed);
  console.log("Individual registrants:", debugStats.individuals);
  console.log("Team leads:", debugStats.teamLeads);
  console.log("Declared additional members:", debugStats.declaredAdditionalMembers);
  console.log("Actual members created:", debugStats.actualMembersCreated);
  console.log("Missing member names:", debugStats.missingMemberNames);
  console.log("Total participants created:", debugStats.participants);
  console.log("Expected stats dashboard count:", debugStats.individuals + debugStats.teamLeads + debugStats.declaredAdditionalMembers);
  console.log("Management dashboard count:", debugStats.participants);
  console.log("=========================");
  
  // Store the data
  await localforage.setItem(KEYS.PARTICIPANTS, participants);
  await localforage.setItem(KEYS.TEAMS, teams);
  await localforage.setItem(KEYS.CHECKINS, {});
  
  return {
    participants,
    teams,
    debugStats // Return debug stats for analysis
  };
}

// Function to change team lead
async function changeTeamLead(teamId, newLeaderId) {
  const teams = await getAllTeams();
  const participants = await getAllParticipants();
  
  // Find the team
  const teamIndex = teams.findIndex(t => t.id === teamId);
  if (teamIndex === -1) throw new Error(`Team with ID ${teamId} not found`);
  
  // Find the new leader
  const newLeaderIndex = participants.findIndex(p => p.id === newLeaderId);
  if (newLeaderIndex === -1) throw new Error(`Participant with ID ${newLeaderId} not found`);
  
  // Check if the new leader is already on another team
  if (participants[newLeaderIndex].teamId && 
      participants[newLeaderIndex].teamId !== teamId) {
    // Get the team name for better error message
    const currentTeam = teams.find(t => t.id === participants[newLeaderIndex].teamId);
    const teamName = currentTeam ? currentTeam.name : "another team";
    
    throw new Error(`Participant ${participants[newLeaderIndex].name} is already on ${teamName}. Please remove them from that team first.`);
  }
  
  // Get the current leader
  const currentLeaderId = teams[teamIndex].leaderId;
  const currentLeaderIndex = participants.findIndex(p => p.id === currentLeaderId);
  
  // Make sure the new leader is on the team or being added to it
  if (!teams[teamIndex].members.includes(newLeaderId)) {
    teams[teamIndex].members.push(newLeaderId);
  }
  
  // Update previous team lead status (demote to team member)
  if (currentLeaderIndex !== -1) {
    participants[currentLeaderIndex].isTeamLead = false;
    participants[currentLeaderIndex].isTeamMember = true;
    participants[currentLeaderIndex].updatedAt = new Date().toISOString();
  }
  
  // Update new team lead status
  participants[newLeaderIndex].seekingTeam = false;
  participants[newLeaderIndex].isTeamLead = true;
  participants[newLeaderIndex].isTeamMember = false;
  participants[newLeaderIndex].teamId = teamId;
  participants[newLeaderIndex].updatedAt = new Date().toISOString();
  
  // Update team
  teams[teamIndex].leaderId = newLeaderId;
  teams[teamIndex].leaderName = participants[newLeaderIndex].name;
  teams[teamIndex].updatedAt = new Date().toISOString();
  
  // Save changes
  await localforage.setItem(KEYS.TEAMS, teams);
  await localforage.setItem(KEYS.PARTICIPANTS, participants);
  
  return {
    team: teams[teamIndex],
    previousTeamLead: currentLeaderIndex !== -1 ? participants[currentLeaderIndex] : null,
    newTeamLead: participants[newLeaderIndex]
  };
}

// Backup and restore functions
async function exportAllData() {
  await initializeStorage();
  
  const participants = await localforage.getItem(KEYS.PARTICIPANTS) || [];
  const teams = await localforage.getItem(KEYS.TEAMS) || [];
  const checkins = await localforage.getItem(KEYS.CHECKINS) || {};
  
  const exportData = {
    timestamp: new Date().toISOString(),
    participants,
    teams,
    checkins
  };
  
  // Return JSON data that can be downloaded
  return JSON.stringify(exportData, null, 2);
}

async function importAllData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.participants || !data.teams) {
      throw new Error("Invalid backup data: missing required collections");
    }
    
    // Store imported data
    await localforage.setItem(KEYS.PARTICIPANTS, data.participants || []);
    await localforage.setItem(KEYS.TEAMS, data.teams || []);
    await localforage.setItem(KEYS.CHECKINS, data.checkins || {});
    
    return {
      success: true,
      participants: data.participants.length,
      teams: data.teams.length,
      checkins: Object.keys(data.checkins).length
    };
  } catch (error) {
    console.error("Error importing data:", error);
    throw new Error(`Failed to import data: ${error.message}`);
  }
}

// Function to get checked-in participants for accounting/attendance reporting
async function exportCheckedInParticipantsCSV() {
  await initializeStorage();
  
  // Get participants and checkins
  const participants = await localforage.getItem(KEYS.PARTICIPANTS) || [];
  const checkins = await localforage.getItem(KEYS.CHECKINS) || {};
  
  // Filter participants who are checked in
  const checkedInParticipants = participants.filter(p => checkins[p.id]);
  
  // Build CSV header and rows
  const headers = ['First Name', 'Last Name', 'School', 'Email'];
  
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  // Process each checked-in participant
  checkedInParticipants.forEach(participant => {
    // Extract first and last name
    const nameParts = (participant.name || '').split(' ');
    const firstName = nameParts.length > 0 ? nameParts[0] : '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Format fields for CSV and escape values that need it
    const formatCSVField = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // If the value contains a comma, quote, or newline, wrap it in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    const row = [
      formatCSVField(firstName),
      formatCSVField(lastName),
      formatCSVField(participant.college || ''),
      formatCSVField(participant.email || '')
    ];
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

// Export functions
export {
  getAllParticipants,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  getAllTeams,
  addTeam,
  updateTeam,
  deleteTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  changeTeamLead,
  getCheckins,
  checkInParticipant,
  removeCheckin,
  importCSVDataToStorage,
  exportAllData,
  importAllData,
  exportCheckedInParticipantsCSV
};