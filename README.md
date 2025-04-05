# Buildathon Dashboard

A comprehensive management system for the Generator Buildathon 2025, designed to streamline participant registration, team formation, and event check-in processes.

## Project Overview

The Buildathon Dashboard is a web application that helps organizers manage the Generator Buildathon event by providing tools for:

1. Importing and visualizing registration data
2. Managing individual participants and teams
3. Tracking team formation progress
4. Handling participant check-ins during the event
5. Generating statistics on registrants, teams, and themes

The application consists of two main components:
- **Stats Dashboard**: Visualizes registration data through charts and tables
- **Management Dashboard**: Provides CRUD operations for participants and teams

## Features

### Participant Management
- Comprehensive participant management:
  - Add, edit, and delete participants
  - Track participant status (seeking team, team member, team lead)
  - Check-in participants during the event
  - Filter and search participants by name, college or team number
  - Sorted alphabetically for easier management
  - View team assignments at a glance

### Team Management
- Team management:
  - Create and edit teams
  - Add/remove team members
  - Sequential team numbering (Team 1, Team 2, etc.)
  - Change team leads when needed
  - Track team completion status
  - Filter teams by status and search by name/college

### Data Backup and Import
- Import participant data from CSV registration forms
- Export complete backup as JSON file
- Restore from backup files
- Data persistence via browser local storage

## Technology Stack

- **Frontend**: React, HTML, CSS, JavaScript
- **UI Framework**: Bootstrap 5
- **Charts**: Chart.js
- **Data Storage**: LocalForage (browser-based persistent storage)
- **CSV Parsing**: PapaParser
- **Build Tool**: Vite

## Installation

1. Clone the repository
```
git clone https://github.com/yourusername/buildathon-dashboard.git
cd buildathon-dashboard
```

2. Install dependencies
```
npm install
```

3. Run the development server
```
npm run dev
```

4. Build for production
```
npm run build
```

## Usage

### Initial Setup
1. Start the development server with `npm run dev`
2. Navigate to the local server URL (typically http://localhost:5173)
3. Import registration data via CSV file using the "Backup & Data Tools" dropdown

### Participant Management
- **View Participants**: The default view shows all participants sorted alphabetically
- **Filter**: Use the search box to find participants by name, college, or team number
- **Status Filters**: Filter by seeking team, in team, checked-in, or not checked-in
- **Check-in**: Use the "Check In" button to mark participants as present at the event
- **Add New**: Click "Add New Participant" to manually add participants
- **Edit/Delete**: Each participant has edit and delete options

### Team Management
- **Create Teams**: Click "Add New Team" to create a team with a lead
- **Assign Members**: Select participants to add to teams
- **Edit Teams**: Change team details, members, or team lead
- **Filter Teams**: Search by team name, college, or leader name
- **Team Cards**: View comprehensive team information including members list

### Data Backup
- Click "Backup & Data Tools" in the top right
- Select "Create Backup" to download a JSON file of all data
- Use "Restore from Backup" to load a previously saved backup
- Create regular backups, especially before and during the event

## Data Persistence

The application uses browser-based storage (IndexedDB via LocalForage) which persists:
- Between page refreshes
- When closing and reopening the browser
- Until browser cache/data is explicitly cleared

For added security, use the backup feature to create downloadable snapshots of all data.

## Project Structure
- `src/`: Source code
  - `components/`: React components
    - `ManagementDashboard.jsx`: Main management interface
    - `ParticipantManagement.jsx`: Participant management interface
    - `TeamManagement.jsx`: Team management interface
    - `ParticipantForm.jsx`: Form for adding/editing participants
    - `TeamForm.jsx`: Form for adding/editing teams
  - `utils/`: Utility functions
    - `storage.js`: Data storage and retrieval functions
  - `main.js`: Application entry point

## Data Model

### Participants
- ID (UUID)
- Name
- Email
- College
- Experience Level
- Theme Preference
- Status (seeking team, team member, team lead)
- Team ID (if applicable)

### Teams
- ID (UUID)
- Name (automatically numbered: "Team 1", "Team 2", etc.)
- Leader ID (reference to participant)
- Leader Name
- College
- Theme Preference
- Experience Level
- Seeking Members status
- Slots Needed
- Members list (array of participant IDs)

## Important Notes

1. **Data Security**: All data is stored locally in your browser. Create regular backups.
2. **Team Numbers**: Teams are automatically numbered sequentially.
3. **Team Management**: The system enforces consistent participant status (team lead, team member, or seeking).
4. **Check-in Process**: The system updates check-in counts in real-time for monitoring attendance.

## Contributors

- The Generator Buildathon Organizing Team
- Connor Raney - Project Lead