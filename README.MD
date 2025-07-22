Digital Wellbeing Desktop App
A cross-platform desktop application built with Electron and React, designed to help you monitor and manage your digital habits, similar to Android's Digital Wellbeing features. This application tracks your active application usage, allows you to set time limits for specific apps, provides custom timers, and offers AI-powered insights into your screen time.

Note: The current version of the application has full OS-level tracking implemented only for Windows. macOS and Linux tracking would require additional OS-specific implementations in the main.js file.

Features
App Usage Tracking: Monitors and records the time spent on various applications on your desktop.

Screen Time Visualization: A dashboard to view your total screen time and a breakdown of usage per application.

App Usage Limits: Set daily time limits for specific applications. Receive alerts when you approach or exceed your set limits.

Custom Timers: Create and manage custom timers (e.g., Pomodoro timers, break reminders).

AI-Powered Insights (Gemini API): Get personalized feedback and suggestions on your digital habits from an LLM acting as a digital wellbeing coach.

Data Persistence: Utilizes Google Firestore to securely store your usage data, app limits, and timers, allowing for data persistence across sessions.

Cross-Platform (Electron): Built with Electron, providing a path to run on Windows, macOS, and Linux (though OS-specific tracking needs further implementation for Mac/Linux).

Modern UI: Developed with React and styled using Tailwind CSS for a clean and responsive user interface.

Technologies Used
Electron: For building the cross-platform desktop application.

React: For the user interface.

Node.js: For the Electron main process and OS-level interactions.

Tailwind CSS: For styling and responsive design.

Firebase (Firestore & Auth): For backend data storage and user authentication.

Google Gemini API: For generating AI-powered usage insights.

PowerShell (Windows): Used in the Electron main process for active window tracking on Windows.

Setup Instructions
Prerequisites
Before you begin, ensure you have the following installed on your system:

Node.js & npm: Download and install from nodejs.org.

Firebase Project: You'll need a Firebase project set up with Firestore enabled. Obtain your Firebase configuration object (API Key, Project ID, etc.).

Installation
Clone the repository:

git clone https://github.com/your-username/digital-wellbeing-desktop.git
cd digital-wellbeing-desktop

Install dependencies:

npm install

Configuration
Firebase Configuration:
The application expects Firebase configuration and an initial authentication token to be provided at runtime (e.g., by an embedding environment like Canvas). For local development, you can temporarily hardcode these values in src/App.js for testing purposes, but be extremely careful not to commit sensitive API keys to public repositories.

Locate the useEffect hook where Firebase is initialized in src/App.js:

// ... inside useEffect where Firebase is initialized
const appId = typeof **app_id !== 'undefined' ? **app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof **firebase_config !== 'undefined' ? **firebase_config : '{}');

// For local testing, you might temporarily do:
// const firebaseConfig = {
// apiKey: "YOUR_FIREBASE_API_KEY",
// authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
// projectId: "YOUR_PROJECT_ID",
// storageBucket: "YOUR_PROJECT_ID.appspot.com",
// messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
// appId: "YOUR_APP_ID"
// };
// const initialAuthToken = "YOUR_FIREBASE_CUSTOM_AUTH_TOKEN_IF_ANY"; // Or remove if using anonymous auth
// ... then use these variables instead of **firebase_config and **initial_auth_token

Remember to revert these changes before pushing to a public GitHub repository.

Gemini API Key:
The Gemini API call in src/App.js also expects the API key to be provided at runtime. For local testing, you can temporarily add your Gemini API key:

// ... inside generateUsageInsights function in src/App.js
const apiKey = ""; // Canvas will automatically provide the API key at runtime
// For local testing, you might temporarily do:
// const apiKey = "YOUR_GEMINI_API_KEY";

Again, revert this change before public commits.

Running the Application
Build the React frontend:
This compiles your React code into static files that Electron can load.

npm run react-build

Start the Electron application:

npm run electron-start

This will launch the Electron window with your Digital Wellbeing app.

Building for Distribution
To create distributable packages (e.g., .exe for Windows, .dmg for macOS, .AppImage for Linux), use electron-builder:

npm run build

The output will be in the dist/ directory.

Important Notes
Windows Administrator Privileges: The PowerShell command used in main.js to get active window information might require the Electron application to be run with administrator privileges for full and reliable functionality, especially when tracking system processes or applications run by other user accounts.

OS-Specific Tracking: The current main.js provides the implementation for Windows only. To make the app truly cross-platform for active application tracking, you would need to implement getMacActiveApplicationInfo() and getLinuxActiveApplicationInfo() functions in main.js (or separate files imported into main.js) that use macOS-specific (e.g., AppleScript, Objective-C FFI) and Linux-specific (e.g., xdotool, wmctrl) methods respectively.

Security: Always be mindful of security when building desktop applications that interact with the operating system. Electron's contextIsolation and nodeIntegration: false in webPreferences are crucial for security.

Antivirus/Firewall: Your antivirus software or firewall might flag the application due to its system interaction. You may need to add exceptions.

Future Enhancements
Cross-Platform Tracking: Implement active application tracking for macOS and Linux.

Blocking Features: Add robust app and website blocking capabilities.

Native Notifications: Implement native system notifications for alerts and timers.

Data Visualization: Enhance the dashboard with charts and graphs for usage trends.

User Profiles: Allow multiple user profiles within the app.

Settings: Add more customizable settings (e.g., theme, notification preferences).

System Tray Integration: Allow the app to run in the system tray.

Dark Mode: Implement a dark mode option.
