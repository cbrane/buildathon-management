import React, { useState, useEffect, useRef } from 'react';
import ParticipantManagement from './ParticipantManagement';
import TeamManagement from './TeamManagement';
import { 
  importCSVDataToStorage, 
  getAllParticipants, 
  getAllTeams, 
  getCheckins,
  exportAllData,
  importAllData,
  exportCheckedInParticipantsCSV
} from '../utils/storage';
import Papa from 'papaparse';

export default function ManagementDashboard() {
  // Default to 'participants' tab instead of stats
  const [activeTab, setActiveTab] = useState('participants');
  // Add a state to track if stats are expanded or collapsed
  const [showStats, setShowStats] = useState(false);
  
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [checkins, setCheckins] = useState({});
  const [showDataMenu, setShowDataMenu] = useState(false);
  
  // Refs for file input elements
  const csvImportRef = useRef(null);
  const backupImportRef = useRef(null);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalTeams: 0,
    participantsWithoutTeam: 0,
    teamsSeekingMembers: 0,
    checkedInCount: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const participantsData = await getAllParticipants();
      const teamsData = await getAllTeams();
      const checkinsData = await getCheckins();
      
      setParticipants(participantsData || []);
      setTeams(teamsData || []);
      setCheckins(checkinsData || {});
      
      // Calculate stats
      updateStats(participantsData || [], teamsData || [], checkinsData || {});
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  function updateStats(participantsData, teamsData, checkinsData) {
    // Count seekers - participants who are not on any team and not a team lead
    const participantsWithoutTeam = participantsData.filter(p => 
      !p.teamId && !p.isTeamLead && !p.isTeamMember
    ).length;
    
    // Count teams that are seeking additional members
    const teamsSeekingMembers = teamsData.filter(t => t.seekingMembers).length;
    
    // Count checked-in participants
    const checkedInCount = Object.keys(checkinsData).length;
    
    // Log the count for debugging
    console.log(`Seekers: ${participantsWithoutTeam} out of ${participantsData.length} total participants`);
    console.log(`Team members: ${participantsData.filter(p => p.isTeamMember).length}`);
    console.log(`Team leads: ${participantsData.filter(p => p.isTeamLead).length}`);
    
    setStats({
      totalParticipants: participantsData.length,
      totalTeams: teamsData.length,
      participantsWithoutTeam,
      teamsSeekingMembers,
      checkedInCount
    });
  }

  async function handleImportCSV(file) {
    try {
      // Parse CSV
      const results = await new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          complete: resolve,
          error: reject
        });
      });
      
      // Filter out empty rows
      const data = results.data.filter(row => row['Full Name'] && row['Full Name'].trim() !== '');
      
      // Import data to storage
      await importCSVDataToStorage(data);
      
      // Reload data
      await loadData();
      
      alert(`Import successful! ${data.length} records processed.`);
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Failed to import CSV. Please check the format and try again.');
    }
  }
  
  // Handle exporting all data to a JSON file
  async function handleExportData() {
    try {
      // Get all data as JSON
      const jsonData = await exportAllData();
      
      // Create a download link
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger click
      const link = document.createElement('a');
      link.href = url;
      
      // Format date for filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      link.download = `buildathon-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Backup exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  }
  
  // Handle exporting checked-in participants to CSV for accounting
  async function handleExportCheckedInCSV() {
    try {
      // Get checked-in participants CSV data
      const csvData = await exportCheckedInParticipantsCSV();
      
      // Create a download link
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger click
      const link = document.createElement('a');
      link.href = url;
      
      // Format date for filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      link.download = `buildathon-attendance-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Attendance data exported successfully!');
    } catch (error) {
      console.error('Error exporting attendance data:', error);
      alert('Failed to export attendance data. Please try again.');
    }
  }
  
  // Handle importing data from a JSON backup file
  async function handleImportBackup(file) {
    try {
      // Read file contents
      const jsonData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      
      // Confirm before proceeding
      if (!window.confirm('This will replace ALL current data with the backup. Are you sure you want to continue?')) {
        return;
      }
      
      // Import the data
      const result = await importAllData(jsonData);
      
      // Reload data
      await loadData();
      
      alert(`Backup restored successfully!\n${result.participants} participants\n${result.teams} teams\n${result.checkins} check-ins`);
    } catch (error) {
      console.error('Error importing backup:', error);
      alert(`Failed to import backup: ${error.message}`);
    }
  }

  function handleParticipantsChange(newParticipants, newCheckins) {
    setParticipants(newParticipants);
    
    // If newCheckins is provided, update the checkins state
    if (newCheckins) {
      setCheckins(newCheckins);
      // Update stats with the new checkins data
      updateStats(newParticipants, teams, newCheckins);
    } else {
      // Otherwise just update stats with existing checkins
      updateStats(newParticipants, teams, checkins);
    }
  }

  function handleTeamsChange(newTeams) {
    setTeams(newTeams);
    updateStats(participants, newTeams, checkins);
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2>Buildathon Management Dashboard</h2>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
          
          {/* Data Import/Export Dropdown */}
          <div className="dropdown">
            <button 
              className="btn btn-primary dropdown-toggle" 
              type="button" 
              onClick={() => setShowDataMenu(!showDataMenu)}
              aria-expanded={showDataMenu}
            >
              Backup & Data Tools
            </button>
            <ul className={`dropdown-menu dropdown-menu-end ${showDataMenu ? 'show' : ''}`} style={{ minWidth: '200px' }}>
              <li>
                <div className="dropdown-header">Import Data</div>
              </li>
              <li>
                <button 
                  className="dropdown-item" 
                  type="button"
                  onClick={() => csvImportRef.current.click()}
                >
                  <i className="bi bi-file-earmark-spreadsheet me-2"></i>
                  Import from CSV
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item" 
                  type="button"
                  onClick={() => backupImportRef.current.click()}
                >
                  <i className="bi bi-file-earmark-arrow-up me-2"></i>
                  Restore from Backup
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <div className="dropdown-header">Export Data</div>
              </li>
              <li>
                <button 
                  className="dropdown-item" 
                  type="button"
                  onClick={handleExportData}
                >
                  <i className="bi bi-file-earmark-arrow-down me-2"></i>
                  Create Full Backup
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item" 
                  type="button"
                  onClick={handleExportCheckedInCSV}
                >
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Export Check-ins for Accounting
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button 
                  className="dropdown-item text-danger" 
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you 100% sure you want to close this menu? Any unsaved data will be lost.')) {
                      setShowDataMenu(false);
                    }
                  }}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Close Menu
                </button>
              </li>
            </ul>
          </div>
          
          {/* Hidden file inputs */}
          <input
            type="file"
            ref={csvImportRef}
            className="d-none"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleImportCSV(e.target.files[0]);
                e.target.value = null; // Reset for future imports
              }
            }}
          />
          
          <input
            type="file"
            ref={backupImportRef}
            className="d-none"
            accept=".json"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleImportBackup(e.target.files[0]);
                e.target.value = null; // Reset for future imports
              }
            }}
          />
        </div>
      </div>
      
      {/* Collapsible stats dashboard */}
      {showStats && (
        <div className="row mb-4 mt-3">
          <div className="col-md-3">
            <div className="card text-center h-100">
              <div className="card-body">
                <h5 className="card-title">Total Participants</h5>
                <p className="display-4">{stats.totalParticipants}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center h-100">
              <div className="card-body">
                <h5 className="card-title">Total Teams</h5>
                <p className="display-4">{stats.totalTeams}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center h-100">
              <div className="card-body">
                <h5 className="card-title">Seekers</h5>
                <p className="display-4">{stats.participantsWithoutTeam}</p>
                <p className="text-muted">Participants seeking a team</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center h-100">
              <div className="card-body">
                <h5 className="card-title">Checked In</h5>
                <p className="display-4">{stats.checkedInCount}</p>
                <p className="text-muted">of {stats.totalParticipants} participants</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Compact stats always visible */}
      {!showStats && (
        <div className="alert alert-light mb-3">
          <div className="d-flex justify-content-between">
            <div><strong>Participants:</strong> {stats.totalParticipants}</div>
            <div><strong>Teams:</strong> {stats.totalTeams}</div>
            <div><strong>Seekers:</strong> {stats.participantsWithoutTeam}</div>
            <div><strong>Checked In:</strong> {stats.checkedInCount} / {stats.totalParticipants}</div>
          </div>
        </div>
      )}
      
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            Participants
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            Teams
          </button>
        </li>
      </ul>
      
      {activeTab === 'participants' && (
        <ParticipantManagement 
          onParticipantsChange={handleParticipantsChange}
          initialCheckins={checkins}
        />
      )}
      
      {activeTab === 'teams' && (
        <TeamManagement 
          onTeamsChange={handleTeamsChange} 
          onParticipantsChange={handleParticipantsChange}
          initialCheckins={checkins}
        />
      )}
    </div>
  );
}