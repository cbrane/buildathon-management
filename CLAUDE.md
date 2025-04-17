# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Buildathon Dashboard for the Generator Buildathon 2025, a web application that helps organizers manage participant registration, team formation, and event check-in processes.

## Commands
- Run development server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`

## Code Style Guidelines
- **Formatting**: Use 2-space indentation, consistent line endings
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Imports**: Group imports (React, components, utilities) with a blank line between groups
- **State Management**: Use React hooks (useState, useEffect) for component state
- **Error Handling**: Use try/catch blocks with specific error messages and console.error logging
- **Data Processing**: Validate user input and CSV data before processing
- **Async Operations**: Use async/await pattern for asynchronous code

## Notes for Assistants
- Follow existing UI patterns and Bootstrap 5 styling
- Maintain current data model for participants and teams
- Preserve CSV import/export functionality
- Use localforage for persistent storage
- Handle team management with consistent status tracking
- Respect participant data privacy