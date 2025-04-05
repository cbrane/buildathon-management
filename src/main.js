import './style.css';
import { Chart } from 'chart.js/auto';
import Papa from 'papaparse';
import { importCSVDataToStorage } from './utils/storage';
import ManagementDashboard from './components/ManagementDashboard';

// Create HTML structure for the dashboard
document.querySelector('#app').innerHTML = `
  <div class="container">
    <h1 class="my-4 text-center">Generator Buildathon Dashboard</h1>
    
    <ul class="nav nav-tabs mb-4" id="dashboardTabs">
      <li class="nav-item">
        <button class="nav-link" id="stats-tab" data-bs-toggle="tab" data-bs-target="#stats-content">
          Stats Dashboard
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link active" id="management-tab" data-bs-toggle="tab" data-bs-target="#management-content">
          Participant Management
        </button>
      </li>
    </ul>
    
    <div class="tab-content">
      <div class="tab-pane fade" id="stats-content">
        <div class="row mb-4">
          <div class="col-md-12">
            <div class="card">
              <div class="card-body">
                <h5 class="card-title">Upload Registration CSV</h5>
                <input type="file" id="csv-file" class="form-control" accept=".csv">
                <small class="text-muted">Upload the latest "The Generator Buildathon Registration - Spring 2025 - Form responses.csv" file</small>
              </div>
            </div>
          </div>
        </div>

        <div id="dashboard" class="d-none">
          <div class="row mb-4">
            <div class="col-md-3">
              <div class="card dashboard-card stat-card bg-light">
                <div class="stat-label">Total Registrants</div>
                <div id="total-registrants" class="stat-number">0</div>
                <div class="stat-description">All participants</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card dashboard-card stat-card bg-light">
                <div class="stat-label">Individual Signups</div>
                <div id="individual-signups" class="stat-number">0</div>
                <div class="stat-description">Need team matching</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card dashboard-card stat-card bg-light">
                <div class="stat-label">Total Teams</div>
                <div id="total-teams" class="stat-number">0</div>
                <div class="stat-description">Pre-formed teams</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card dashboard-card stat-card bg-light">
                <div class="stat-label">Teams Seeking Members</div>
                <div id="teams-seeking" class="stat-number">0</div>
                <div class="stat-description">Open team slots</div>
                <div id="open-slots" class="stat-highlight mt-2"></div>
              </div>
            </div>
          </div>

          <div class="row mb-4">
            <div class="col-md-6">
              <div class="card dashboard-card">
                <div class="card-body">
                  <h5 class="card-title">Registrants by School</h5>
                  <canvas id="schools-chart"></canvas>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card dashboard-card">
                <div class="card-body">
                  <h5 class="card-title">Theme Preferences</h5>
                  <canvas id="themes-chart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <div class="row mb-4">
            <div class="col-md-6">
              <div class="card dashboard-card">
                <div class="card-body">
                  <h5 class="card-title">AI Experience Levels</h5>
                  <canvas id="experience-chart"></canvas>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card dashboard-card">
                <div class="card-body">
                  <h5 class="card-title">Team Status</h5>
                  <canvas id="team-status-chart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-12">
              <div class="card dashboard-card">
                <div class="card-body">
                  <h5 class="card-title">Registrants List</h5>
                  
                  <div class="row mb-3">
                    <div class="col-md-3">
                      <label for="filter-status" class="form-label">Filter by Status:</label>
                      <select id="filter-status" class="form-select filter-control">
                        <option value="all">All Registrants</option>
                        <option value="individual">Individuals Seeking Teams</option>
                        <option value="seeking">Teams Seeking Members</option>
                        <option value="complete">Complete Teams</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="filter-theme" class="form-label">Filter by Theme:</label>
                      <select id="filter-theme" class="form-select filter-control">
                        <option value="all">All Themes</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="filter-school" class="form-label">Filter by School:</label>
                      <select id="filter-school" class="form-select filter-control">
                        <option value="all">All Schools</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label for="filter-experience" class="form-label">Filter by Experience:</label>
                      <select id="filter-experience" class="form-select filter-control">
                        <option value="all">All Experience Levels</option>
                      </select>
                    </div>
                  </div>
                  
                  <div class="table-responsive">
                    <table class="table table-striped">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>School</th>
                          <th>Type</th>
                          <th>Team Status</th>
                          <th>Theme</th>
                          <th>AI Experience</th>
                        </tr>
                      </thead>
                      <tbody id="registrants-table"></tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="row mb-4">
            <div class="col-md-12">
              <div class="card dashboard-card">
                <div class="card-body">
                  <h5 class="card-title">Team Matching Opportunities</h5>
                  <div class="row">
                    <div class="col-md-6">
                      <h6>Teams Looking for Members</h6>
                      <ul id="teams-seeking-list" class="list-group list-group-flush"></ul>
                    </div>
                    <div class="col-md-6">
                      <h6>Individuals Looking for Teams</h6>
                      <ul id="individuals-seeking-list" class="list-group list-group-flush"></ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="tab-pane fade show active" id="management-content">
        <div id="management-container"></div>
      </div>
    </div>
  </div>
`;

// Initialize management dashboard when tab is shown or on page load
document.getElementById('management-tab').addEventListener('click', initManagementDashboard);

// Initialize the management dashboard immediately on page load
document.addEventListener('DOMContentLoaded', initManagementDashboard);

// Initialize tab functionality
document.querySelectorAll('#dashboardTabs .nav-link').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('#dashboardTabs .nav-link').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.remove('show', 'active');
    });
    
    this.classList.add('active');
    const target = this.getAttribute('data-bs-target');
    document.querySelector(target).classList.add('show', 'active');
  });
});

// Management dashboard initialization
let managementInitialized = false;
function initManagementDashboard() {
  if (managementInitialized) return;
  
  const managementContainer = document.getElementById('management-container');
  
  // Create a new div for the management dashboard
  const dashboard = document.createElement('div');
  dashboard.id = 'management-dashboard';
  managementContainer.appendChild(dashboard);
  
  // Import React and ReactDOM for rendering the component
  import('react').then(React => {
    import('react-dom/client').then(ReactDOM => {
      // Create a root and render the management dashboard component
      const root = ReactDOM.createRoot(dashboard);
      root.render(React.createElement(ManagementDashboard));
      
      managementInitialized = true;
    });
  });
}

// Charts
let schoolsChart, themesChart, experienceChart, teamStatusChart;

// Store parsed data
let parsedData = [];
let stats = null;

// Get filter elements
const fileInput = document.getElementById('csv-file');
const dashboard = document.getElementById('dashboard');
const filterStatus = document.getElementById('filter-status');
const filterTheme = document.getElementById('filter-theme');
const filterSchool = document.getElementById('filter-school');
const filterExperience = document.getElementById('filter-experience');

// Add filter event listeners
filterStatus?.addEventListener('change', applyFilters);
filterTheme?.addEventListener('change', applyFilters);
filterSchool?.addEventListener('change', applyFilters);
filterExperience?.addEventListener('change', applyFilters);

fileInput?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Parse CSV
  Papa.parse(file, {
    header: true,
    complete: async function(results) {
      parsedData = results.data.filter(row => row['Full Name'] && row['Full Name'].trim() !== '');
      
      // Also import data to storage for management features
      try {
        const result = await importCSVDataToStorage(parsedData);
        console.log("CSV import completed with storage result:", result.debugStats);
        
        // Analyze management data after import
        console.log("Management dashboard will show", result.participants.length, "participants");
      } catch (error) {
        console.error('Error importing to storage:', error);
      }
      
      // Analyze data for stats dashboard
      const statsResult = analyzeData(parsedData);
      console.log("Stats dashboard will show", statsResult.totalRegistrants, "registrants");
      dashboard.classList.remove('d-none');
    },
    error: function(error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format and try again.');
    }
  });
});

function analyzeData(data) {
  // Debug: Print info about columns and team status
  console.log("First 3 teams:");
  data.filter(row => row[' Are you registering as an individual or as a team? '] && 
                    row[' Are you registering as an individual or as a team? '].includes('team'))
    .slice(0, 3)
    .forEach(team => {
      console.log("Team Lead:", team['Full Name']);
      console.log("Need members?:", team[' Does your team need any additional members?']);
      console.log("How many?:", team['How many more team members do you want to be matched with?']);
      console.log("Additional Members:", team[' How many additional team members do you have? (not including yourself) - *Reminder, teams are restricted to 5 members maximum. Make sure you enter the additional members information in the following questions. If you do not, they will not be placed on your team.']);
      
      // Check if all declared members have names
      const declaredCount = parseInt(team[' How many additional team members do you have? (not including yourself) - *Reminder, teams are restricted to 5 members maximum. Make sure you enter the additional members information in the following questions. If you do not, they will not be placed on your team.']) || 0;
      for (let i = 1; i <= declaredCount; i++) {
        const memberName = team[`Full Name - Additional Team Member ${i}`];
        console.log(`  Member ${i} name: ${memberName || 'MISSING'}`);
      }
      console.log("----------------");
    });
  
  // Process data
  stats = calculateStats(data);
  
  // Display statistics
  document.getElementById('total-registrants').textContent = stats.totalRegistrants;
  document.getElementById('individual-signups').textContent = stats.individualSignups;
  document.getElementById('total-teams').textContent = stats.totalTeams;
  document.getElementById('teams-seeking').textContent = stats.teamsSeeking;
  
  // Show open slots info
  const totalOpenSlots = stats.totalOpenSlots;
  document.getElementById('open-slots').textContent = 
      `${totalOpenSlots} total open ${totalOpenSlots === 1 ? 'slot' : 'slots'} available`;
  
  // Populate filter dropdowns
  populateFilterOptions(stats);
  
  // Render charts
  renderSchoolsChart(stats.schoolsData);
  renderThemesChart(stats.themesData);
  renderExperienceChart(stats.experienceData);
  renderTeamStatusChart(stats.teamStatusData);
  
  // Render table with all data initially
  renderRegistrantsTable(data);
  
  // Render team matching opportunities
  renderTeamMatching(data, stats);
  
  return stats;
}

function populateFilterOptions(stats) {
  // Theme filter options
  filterTheme.innerHTML = '<option value="all">All Themes</option>';
  for (const [theme, count] of stats.themesData) {
    const option = document.createElement('option');
    option.value = theme;
    option.textContent = `${theme} (${count})`;
    filterTheme.appendChild(option);
  }
  
  // School filter options
  filterSchool.innerHTML = '<option value="all">All Schools</option>';
  for (const [school, count] of stats.schoolsData) {
    const option = document.createElement('option');
    option.value = school;
    option.textContent = `${school} (${count})`;
    filterSchool.appendChild(option);
  }
  
  // Experience filter options
  filterExperience.innerHTML = '<option value="all">All Experience Levels</option>';
  stats.experienceData.labels.forEach((exp, i) => {
    const option = document.createElement('option');
    option.value = exp;
    option.textContent = `${exp} (${stats.experienceData.values[i]})`;
    filterExperience.appendChild(option);
  });
}

function applyFilters() {
  const statusFilter = filterStatus.value;
  const themeFilter = filterTheme.value;
  const schoolFilter = filterSchool.value;
  const experienceFilter = filterExperience.value;
  
  // Apply filters to data
  const filteredData = parsedData.filter(row => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'individual' && 
          !(row[' Are you registering as an individual or as a team? '] && 
            row[' Are you registering as an individual or as a team? '].includes('individual'))) {
          return false;
      }
      if (statusFilter === 'seeking' && 
          !(row[' Are you registering as an individual or as a team? '] && 
            row[' Are you registering as an individual or as a team? '].includes('team') &&
            row[' Does your team need any additional members?'] && 
            row[' Does your team need any additional members?'].includes('Yes'))) {
          return false;
      }
      if (statusFilter === 'complete' && 
          !(row[' Are you registering as an individual or as a team? '] && 
            row[' Are you registering as an individual or as a team? '].includes('team') &&
            (!row[' Does your team need any additional members?'] || 
             row[' Does your team need any additional members?'].includes('No')))) {
          return false;
      }
    }
    
    // Theme filter
    if (themeFilter !== 'all') {
      let theme = row[" Which theme(s) are you most interested in? (We'll use this for team matching)  "] || 
                 row['Which theme(s) is your team interested in?'] || '';
      
      if (!theme.includes(themeFilter)) {
          return false;
      }
    }
    
    // School filter
    if (schoolFilter !== 'all') {
      if (row['College'] !== schoolFilter) {
          return false;
      }
    }
    
    // Experience filter (this one is approximate)
    if (experienceFilter !== 'all') {
      if (row[' Are you registering as an individual or as a team? '] && 
          row[' Are you registering as an individual or as a team? '].includes('individual')) {
          let exp = row[' AI Experience Level '] || '';
          if (experienceFilter === 'Beginner' && !exp.includes('Beginner')) {
              return false;
          }
          if (experienceFilter === 'Intermediate' && !exp.includes('Intermediate')) {
              return false;
          }
          if (experienceFilter === 'Advanced' && !exp.includes('Advanced')) {
              return false;
          }
          if (experienceFilter === 'Expert' && !exp.includes('Expert')) {
              return false;
          }
      } else {
          let teamExp = row["What is your team's collective experience with AI? (Select all that apply)"] || '';
          if (experienceFilter === 'Beginner' && !teamExp.includes('Using AI tools')) {
              return false;
          }
          if (experienceFilter === 'Intermediate' && !teamExp.includes('Implementing AI solutions')) {
              return false;
          }
          if (experienceFilter === 'Advanced' && !teamExp.includes('Building/modifying AI models')) {
              return false;
          }
      }
    }
    
    return true;
  });
  
  // Render filtered data
  renderRegistrantsTable(filteredData);
}

function calculateStats(data) {
  // Initialize counts
  let totalRegistrants = 0;
  let individualSignups = 0;
  let totalTeams = 0;
  let teamsSeeking = 0;
  let totalOpenSlots = 0; // Track the total number of available slots in teams
  
  // Maps for chart data
  const schools = new Map();
  const themes = new Map();
  const experience = new Map();
  const teamStatus = new Map([
    ['Complete Teams', 0],
    ['Teams Seeking Members', 0],
    ['Individuals Seeking Teams', 0]
  ]);
  
  // Process each row
  data.forEach(row => {
    // Skip empty rows
    if (!row['Full Name'] || row['Full Name'].trim() === '') return;
    
    // Count by registration type
    if (row[' Are you registering as an individual or as a team? '] && 
        row[' Are you registering as an individual or as a team? '].includes('individual')) {
      // Count individuals
      totalRegistrants++;
      individualSignups++;
      teamStatus.set('Individuals Seeking Teams', teamStatus.get('Individuals Seeking Teams') + 1);
      
      // Add school count for individual
      const school = row['College'] || 'Unknown';
      schools.set(school, (schools.get(school) || 0) + 1);
    } else if (row[' Are you registering as an individual or as a team? '] && 
              row[' Are you registering as an individual or as a team? '].includes('team')) {
      totalTeams++;
      
      // Count the team leader
      totalRegistrants++;
      
      // Find the key for additional team members count
      const additionalMembersKey = Object.keys(row).find(key => 
        key.includes("How many additional team members") && 
        key.includes("not including yourself")
      ) || ' How many additional team members do you have? (not including yourself) - *Reminder, teams are restricted to 5 members maximum. Make sure you enter the additional members information in the following questions. If you do not, they will not be placed on your team.';
      
      // Count additional team members
      const additionalMembers = parseInt(row[additionalMembersKey]) || 0;
      totalRegistrants += additionalMembers;
      
      // Add school count for team members
      const school = row['College'] || 'Unknown';
      schools.set(school, (schools.get(school) || 0) + (additionalMembers + 1));
      
      // Count teams seeking members - note the space before "Does"
      if (row[' Does your team need any additional members?'] && 
          row[' Does your team need any additional members?'].includes('Yes')) {
        teamsSeeking++;
        teamStatus.set('Teams Seeking Members', teamStatus.get('Teams Seeking Members') + 1);
        
        // Track how many slots are available in this team
        const seatsNeeded = parseInt(row['How many more team members do you want to be matched with?']) || 0;
        totalOpenSlots += seatsNeeded;
      } else {
        teamStatus.set('Complete Teams', teamStatus.get('Complete Teams') + 1);
      }
    }
    
    // Count by theme (already handled for individuals above)
    if (row[' Are you registering as an individual or as a team? '] && 
        row[' Are you registering as an individual or as a team? '].includes('individual')) {
      
      // For individuals
      let theme = row[" Which theme(s) are you most interested in? (We'll use this for team matching)  "] || 'Unknown';
      
      // Clean up theme text
      if (theme.includes('AI-Powered Smart Living')) {
        theme = 'AI-Powered Smart Living';
      } else if (theme.includes('AI-Powered Biomedical')) {
        theme = 'AI-Powered Biomedical';
      } else if (theme.includes('Entrepreneurial AI')) {
        theme = 'Entrepreneurial AI';
      } else if (theme.includes('Open to any')) {
        theme = 'Open to any theme';
      } else if (theme.includes('still deciding')) {
        theme = 'Still deciding';
      }
      
      themes.set(theme, (themes.get(theme) || 0) + 1);
      
      // Count by experience level (for individuals)
      let exp = row[' AI Experience Level '] || 'Unknown';
      if (exp.includes('Beginner')) {
        exp = 'Beginner';
      } else if (exp.includes('Intermediate')) {
        exp = 'Intermediate';
      } else if (exp.includes('Advanced')) {
        exp = 'Advanced';
      } else if (exp.includes('Expert')) {
        exp = 'Expert';
      }
      
      experience.set(exp, (experience.get(exp) || 0) + 1);
    } else if (row[' Are you registering as an individual or as a team? '] && 
               row[' Are you registering as an individual or as a team? '].includes('team')) {
      
      // For teams
      let theme = row['Which theme(s) is your team interested in?'] || 'Unknown';
      const additionalMembers = parseInt(row[' How many additional team members do you have? (not including yourself) - *Reminder, teams are restricted to 5 members maximum. Make sure you enter the additional members information in the following questions. If you do not, they will not be placed on your team.']) || 0;
      
      // Clean up theme text
      if (theme.includes('AI-Powered Smart Living')) {
        theme = 'AI-Powered Smart Living';
      } else if (theme.includes('AI-Powered Biomedical')) {
        theme = 'AI-Powered Biomedical';
      } else if (theme.includes('Entrepreneurial AI')) {
        theme = 'Entrepreneurial AI';
      } else if (theme.includes('Open to any')) {
        theme = 'Open to any theme';
      } else if (theme.includes('still deciding') || theme.includes("We're still deciding")) {
        theme = 'Still deciding';
      }
      
      // Count theme for all team members (including the leader)
      themes.set(theme, (themes.get(theme) || 0) + additionalMembers + 1);
      
      // Team experience is collective
      const teamExperience = [];
      if (row["What is your team's collective experience with AI? (Select all that apply)"]) {
        const expText = row["What is your team's collective experience with AI? (Select all that apply)"];
        
        if (expText.includes('Using AI tools')) {
            teamExperience.push('Beginner');
        }
        if (expText.includes('Implementing AI solutions')) {
            teamExperience.push('Intermediate');
        }
        if (expText.includes('Building/modifying AI models')) {
            teamExperience.push('Advanced');
        }
        if (expText.includes('No prior AI experience')) {
            teamExperience.push('No Experience');
        }
        if (teamExperience.length === 0) {
            teamExperience.push('Unknown');
        }
      } else {
        teamExperience.push('Unknown');
      }
      
      // Count each team member with the team's experience
      for (const exp of teamExperience) {
        experience.set(exp, (experience.get(exp) || 0) + additionalMembers + 1);
      }
    }
  });
  
  // Sort maps by value for charts
  const schoolsData = sortMapByValue(schools);
  const themesData = sortMapByValue(themes);
  const experienceData = mapToChartData(experience);
  const teamStatusData = mapToChartData(teamStatus);
  
  return {
    totalRegistrants,
    individualSignups,
    totalTeams,
    teamsSeeking,
    totalOpenSlots,
    schoolsData,
    themesData,
    experienceData,
    teamStatusData
  };
}

function sortMapByValue(map) {
  return Array.from(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10
}

function mapToChartData(map) {
  return {
    labels: Array.from(map.keys()),
    values: Array.from(map.values())
  };
}

function renderSchoolsChart(data) {
  const chartContainer = document.getElementById('schools-chart');
  if (!chartContainer) return;
  
  const ctx = chartContainer.getContext('2d');
  
  // Destroy existing chart if it exists
  if (schoolsChart) schoolsChart.destroy();
  
  schoolsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(item => item[0]),
      datasets: [{
        label: 'Registrants by School',
        data: data.map(item => item[1]),
        backgroundColor: 'rgba(54, 162, 235, 0.7)'
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function renderThemesChart(data) {
  const chartContainer = document.getElementById('themes-chart');
  if (!chartContainer) return;
  
  const ctx = chartContainer.getContext('2d');
  
  // Destroy existing chart if it exists
  if (themesChart) themesChart.destroy();
  
  themesChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: data.map(item => item[0]),
      datasets: [{
        data: data.map(item => item[1]),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)',
          'rgba(40, 159, 64, 0.7)',
          'rgba(210, 199, 199, 0.7)'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
        }
      }
    }
  });
}

function renderExperienceChart(data) {
  const chartContainer = document.getElementById('experience-chart');
  if (!chartContainer) return;
  
  const ctx = chartContainer.getContext('2d');
  
  // Destroy existing chart if it exists
  if (experienceChart) experienceChart.destroy();
  
  experienceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
        }
      }
    }
  });
}

function renderTeamStatusChart(data) {
  const chartContainer = document.getElementById('team-status-chart');
  if (!chartContainer) return;
  
  const ctx = chartContainer.getContext('2d');
  
  // Destroy existing chart if it exists
  if (teamStatusChart) teamStatusChart.destroy();
  
  teamStatusChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(54, 162, 235, 0.7)',
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
        }
      }
    }
  });
}

function renderRegistrantsTable(data) {
  const tableBody = document.getElementById('registrants-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  data.forEach(row => {
    if (!row['Full Name'] || row['Full Name'].trim() === '') return;
    
    const tr = document.createElement('tr');
    
    // Name column
    const nameCell = document.createElement('td');
    if (row[' Are you registering as an individual or as a team? '] && 
        row[' Are you registering as an individual or as a team? '].includes('team')) {
      // Show team name + members
      let teamMembers = row['Full Name'] + ' (Team Lead)';
      
      // Add additional members
      for (let i = 1; i <= 4; i++) {
        const memberName = row[`Full Name - Additional Team Member ${i}`];
        const memberEmail = row[`Email - Additional Team Member ${i} (please use their college .edu email)`];
        if (memberName && memberName.trim() !== '') {
            teamMembers += `<br>${memberName}`;
        }
      }
      
      nameCell.innerHTML = teamMembers;
    } else {
      nameCell.textContent = row['Full Name'];
    }
    tr.appendChild(nameCell);
    
    // School column
    const schoolCell = document.createElement('td');
    schoolCell.textContent = row['College'] || '';
    tr.appendChild(schoolCell);
    
    // Type column
    const typeCell = document.createElement('td');
    if (row[' Are you registering as an individual or as a team? '] && 
        row[' Are you registering as an individual or as a team? '].includes('team')) {
      
      const additionalMembers = parseInt(row[' How many additional team members do you have? (not including yourself) - *Reminder, teams are restricted to 5 members maximum. Make sure you enter the additional members information in the following questions. If you do not, they will not be placed on your team.']) || 0;
      typeCell.textContent = `Team (${additionalMembers + 1} members)`;
    } else {
      typeCell.textContent = 'Individual';
    }
    tr.appendChild(typeCell);
    
    // Team Status column
    const statusCell = document.createElement('td');
    if (row[' Are you registering as an individual or as a team? '] && 
        row[' Are you registering as an individual or as a team? '].includes('team')) {
      // Additional debug info
      console.log("Table row - Team:", row['Full Name'], 
                "Need members?:", row[' Does your team need any additional members?']);
      
      if (row[' Does your team need any additional members?'] && 
          row[' Does your team need any additional members?'].includes('Yes')) {
        
        const seatsNeeded = parseInt(row['How many more team members do you want to be matched with?']) || 0;
        statusCell.innerHTML = `<span class="text-warning">Seeking ${seatsNeeded} More Members</span>`;
      } else {
        statusCell.innerHTML = '<span class="text-success">Complete Team</span>';
      }
    } else {
      statusCell.innerHTML = '<span class="text-primary">Seeking Team</span>';
    }
    tr.appendChild(statusCell);
    
    // Theme column
    const themeCell = document.createElement('td');
    let theme = row[" Which theme(s) are you most interested in? (We'll use this for team matching)  "] || 
               row['Which theme(s) is your team interested in?'] || '';
    
    // Clean up theme text for display
    if (theme.includes('AI-Powered Smart Living')) {
      theme = 'Smart Living';
    } else if (theme.includes('AI-Powered Biomedical')) {
      theme = 'Biomedical';
    } else if (theme.includes('Entrepreneurial AI')) {
      theme = 'Entrepreneurial';
    } else if (theme.includes('Open to any')) {
      theme = 'Open to any';
    } else if (theme.includes('still deciding') || theme.includes("We're still deciding")) {
      theme = 'Still deciding';
    }
    
    themeCell.textContent = theme;
    tr.appendChild(themeCell);
    
    // Experience column
    const expCell = document.createElement('td');
    if (row[' Are you registering as an individual or as a team? '] && 
        row[' Are you registering as an individual or as a team? '].includes('team')) {
      // Show team experience
      expCell.textContent = row["What is your team's collective experience with AI? (Select all that apply)"] || '';
    } else {
      expCell.textContent = row[' AI Experience Level '] || '';
    }
    
    tr.appendChild(expCell);
    
    tableBody.appendChild(tr);
  });
}

function renderTeamMatching(data, stats) {
  const teamsList = document.getElementById('teams-seeking-list');
  const individualsList = document.getElementById('individuals-seeking-list');
  
  if (!teamsList || !individualsList) return;
  
  teamsList.innerHTML = '';
  individualsList.innerHTML = '';
  
  // Process teams seeking members
  const teamsSeekingMembers = data.filter(row => {
    const isTeam = row[' Are you registering as an individual or as a team? '] && 
                   row[' Are you registering as an individual or as a team? '].includes('team');
    const needsMembers = row[' Does your team need any additional members?'] && 
                       row[' Does your team need any additional members?'].includes('Yes');
    
    // For debugging
    if (isTeam) {
      console.log("Team:", row['Full Name'], 
                "Needs members:", needsMembers,
                "Value:", row[' Does your team need any additional members?'],
                "Slots needed:", row['How many more team members do you want to be matched with?']);
    }
    
    return isTeam && needsMembers;
  });
  
  teamsSeekingMembers.forEach(team => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    
    const seatsNeeded = parseInt(team['How many more team members do you want to be matched with?']) || 0;
    const additionalMembers = parseInt(team[' How many additional team members do you have? (not including yourself) - *Reminder, teams are restricted to 5 members maximum. Make sure you enter the additional members information in the following questions. If you do not, they will not be placed on your team.']) || 0;
    const currentTeamSize = additionalMembers + 1;
    
    // Format theme
    let theme = team['Which theme(s) is your team interested in?'] || 'Unknown';
    if (theme.includes('AI-Powered Smart Living')) {
      theme = 'Smart Living';
    } else if (theme.includes('AI-Powered Biomedical')) {
      theme = 'Biomedical';
    } else if (theme.includes('Entrepreneurial AI')) {
      theme = 'Entrepreneurial';
    } else if (theme.includes('Open to any')) {
      theme = 'Open to any';
    } else if (theme.includes('still deciding') || theme.includes("We're still deciding")) {
      theme = 'Still deciding';
    }
    
    li.innerHTML = `
      <strong>${team['Full Name']}'s Team</strong> (${currentTeamSize} current members)
      <br>
      <span class="badge bg-warning text-dark">Seeking ${seatsNeeded} more members</span>
      <span class="badge bg-info text-dark">${team['College']}</span>
      <span class="badge bg-secondary">${theme}</span>
      <div class="mt-1 small text-muted">Current team members:</div>
      <div class="small">
          - ${team['Full Name']} (Team Lead)
          ${[1, 2, 3, 4].map(i => {
              const memberName = team[`Full Name - Additional Team Member ${i}`];
              if (memberName && memberName.trim() !== '') {
                  return `<br>- ${memberName}`;
              }
              return '';
          }).join('')}
      </div>
    `;
    
    teamsList.appendChild(li);
  });
  
  // Process individuals seeking teams
  const individualsSeekingTeams = data.filter(row => 
    row[' Are you registering as an individual or as a team? '] && 
    row[' Are you registering as an individual or as a team? '].includes('individual')
  );
  
  individualsSeekingTeams.forEach(individual => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    
    // Format theme
    let theme = individual[" Which theme(s) are you most interested in? (We'll use this for team matching)  "] || 'Unknown';
    if (theme.includes('AI-Powered Smart Living')) {
      theme = 'Smart Living';
    } else if (theme.includes('AI-Powered Biomedical')) {
      theme = 'Biomedical';
    } else if (theme.includes('Entrepreneurial AI')) {
      theme = 'Entrepreneurial';
    } else if (theme.includes('Open to any')) {
      theme = 'Open to any';
    }
    
    // Format experience
    let experience = individual[' AI Experience Level '] || 'Unknown';
    
    li.innerHTML = `
      <strong>${individual['Full Name']}</strong>
      <br>
      <span class="badge bg-primary">Seeking Team</span>
      <span class="badge bg-info text-dark">${individual['College']}</span>
      <span class="badge bg-secondary">${theme}</span>
      <div class="mt-1 small text-muted">Experience: ${experience}</div>
    `;
    
    individualsList.appendChild(li);
  });
  
  // Add counts to the headers
  if (teamsSeekingMembers.length === 0) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-center';
    li.textContent = 'No teams are currently seeking members';
    teamsList.appendChild(li);
  }
  
  if (individualsSeekingTeams.length === 0) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-center';
    li.textContent = 'No individuals are currently seeking teams';
    individualsList.appendChild(li);
  }
}