// main.js (Electron Main Process)
const { app, BrowserWindow, ipcMain } = require("electron");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

let mainWindow;
let isTracking = true;
const dataPath = path.join(app.getPath("userData"), "activityData.json");

// Debug logging wrapper
function log(type, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}]`, ...args);
}

// Common application name mappings
const appMappings = {
  chrome: "Google Chrome",
  msedge: "Microsoft Edge",
  firefox: "Mozilla Firefox",
  brave: "Brave Browser",
  opera: "Opera Browser",
  vlc: "VLC Media Player",
  wmplayer: "Windows Media Player",
  code: "Visual Studio Code",
  devenv: "Visual Studio",
  notepad: "Notepad",
  notepadplusplus: "Notepad++",
  spotify: "Spotify",
  steam: "Steam",
  discord: "Discord",
  slack: "Slack",
  "mpc-hc64": "Media Player Classic",
  photoshop: "Adobe Photoshop",
  illustrator: "Adobe Illustrator",
  winword: "Microsoft Word",
  excel: "Microsoft Excel",
  powerpnt: "Microsoft PowerPoint",
  outlook: "Microsoft Outlook",
  vscode: "Visual Studio Code",
  explorer: "File Explorer",
};

// System process names to filter out
const systemProcesses = [
  "svchost", // Service Host
  "RuntimeBroker", // Runtime Broker
  "SearchHost", // Windows Search
  "ShellExperienceHost", // Windows Shell Experience
  "ApplicationFrameHost", // Windows App Host
  "SystemSettings", // Windows Settings
  "TextInputHost", // Text Input
  "WmiPrvSE", // WMI Provider
  "ctfmon", // CTF Monitor
  "dwm", // Desktop Window Manager
  "sihost", // Shell Infrastructure
  "Memory Compression", // Memory Management
  "System", // Windows System
  "Registry", // Registry
  "fontdrvhost", // Font Driver Host
  "csrss", // Client Server Runtime
  "secure system", // Security System
  "dllhost", // DLL Host
  "conhost", // Console Host
  "CompPkgSrv", // Component Package Service
  "spoolsv", // Print Spooler
  "SearchIndexer", // Windows Search Indexer
  "winlogon", // Windows Logon
  "lsass", // Windows Security
  "services", // Windows Services
  "smss", // Windows Session Manager
];

function isSystemProcess(processName) {
  if (!processName) return true;
  const normalized = processName.toLowerCase();
  return systemProcesses.some((proc) =>
    normalized.includes(proc.toLowerCase())
  );
}

// Load activity data from disk
function loadActivityData() {
  try {
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, "utf8");
      if (!fileContent) {
        log("DATA_LOAD", "Empty data file, returning default data");
        return { screenTime: {} };
      }

      const data = JSON.parse(fileContent);
      if (
        !data ||
        typeof data !== "object" ||
        !data.screenTime ||
        typeof data.screenTime !== "object"
      ) {
        log("DATA_LOAD", "Invalid data structure, returning default data");
        return { screenTime: {} };
      }

      const cleanData = {
        screenTime: Object.entries(data.screenTime).reduce(
          (acc, [key, value]) => {
            if (
              key &&
              typeof key === "string" &&
              typeof value === "number" &&
              !isSystemProcess(key)
            ) {
              acc[key] = value;
            }
            return acc;
          },
          {}
        ),
      };

      log("DATA_LOAD", "Loaded and validated data:", cleanData);
      return cleanData;
    }
  } catch (error) {
    log("ERROR", "Error loading activity data:", error);
  }
  return { screenTime: {} };
}

// Save activity data to disk
function saveActivityData(data) {
  try {
    if (
      !data ||
      typeof data !== "object" ||
      !data.screenTime ||
      typeof data.screenTime !== "object"
    ) {
      log("ERROR", "Invalid data structure, not saving");
      return;
    }

    if (fs.existsSync(dataPath)) {
      const backupPath = `${dataPath}.backup`;
      fs.copyFileSync(dataPath, backupPath);
    }

    const cleanData = {
      screenTime: Object.entries(data.screenTime).reduce(
        (acc, [key, value]) => {
          if (
            key &&
            typeof key === "string" &&
            typeof value === "number" &&
            !isSystemProcess(key)
          ) {
            acc[key] = value;
          }
          return acc;
        },
        {}
      ),
    };

    fs.writeFileSync(dataPath, JSON.stringify(cleanData, null, 2));
    log("DATA_SAVE", "Saved data successfully");
  } catch (error) {
    log("ERROR", "Error saving activity data:", error);
    const backupPath = `${dataPath}.backup`;
    if (fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, dataPath);
        log("DATA_SAVE", "Restored from backup after save error");
      } catch (backupError) {
        log("ERROR", "Failed to restore from backup:", backupError);
      }
    }
  }
}

// Get active application data from Task Manager
async function getTaskManagerHistory() {
  return new Promise((resolve) => {
    // Create a temporary script file
    const scriptPath = path.join(app.getPath("userData"), "get-windows.ps1");
    const script = `
            # Get active window info
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
                    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hwnd, out int processId);
                }
"@

            $hwnd = [Win32]::GetForegroundWindow()
            $activePid = 0
            [void][Win32]::GetWindowThreadProcessId($hwnd, [ref]$activePid)

            # Get processes with windows
            Get-Process | Where-Object { $_.MainWindowTitle } | ForEach-Object {
                @{
                    ProcessName = $_.ProcessName
                    MainWindowTitle = $_.MainWindowTitle
                    IsActive = ($_.Id -eq $activePid)
                    ProcessId = $_.Id
                    CPU = if ($_.CPU) { [math]::Round($_.CPU, 2) } else { 0 }
                    Memory = [math]::Round($_.WorkingSet64 / 1MB, 2)
                }
            } | ConvertTo-Json
        `;

    // Write the script to a file
    fs.writeFileSync(scriptPath, script);

    // Run the script with elevated permissions
    const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;

    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      try {
        // Clean up the temporary script
        fs.unlinkSync(scriptPath);

        if (error) {
          log("ERROR", "PowerShell error:", error);
          return resolve({});
        }

        const output = stdout.trim();
        log("DEBUG", "PowerShell output:", output);

        if (
          !output ||
          output === "[]" ||
          output === "null" ||
          output === "{}"
        ) {
          return resolve({});
        }

        let apps;
        try {
          apps = JSON.parse(output);
          if (!Array.isArray(apps)) {
            apps = [apps];
          }
        } catch (e) {
          log("ERROR", "Failed to parse JSON:", e);
          return resolve({});
        }

        const userApps = {};

        apps.forEach((app) => {
          if (!app.ProcessName || !app.MainWindowTitle) return;

          // Get friendly name from mapping or process name
          const lowerProcessName = app.ProcessName.toLowerCase();
          const friendlyName = appMappings[lowerProcessName] || app.ProcessName;

          // Skip system processes
          if (!isSystemProcess(friendlyName)) {
            userApps[friendlyName] = {
              ...app,
              displayName: friendlyName,
              windowTitle: app.MainWindowTitle,
            };
          }
        });

        log("DEBUG", "Found applications:", userApps);
        return resolve(userApps);
      } catch (error) {
        log("ERROR", "Parse error:", error);
        return resolve({});
      }
    });
  });
}

// Update activity data with current app usage
async function updateActivityData() {
  if (!isTracking) return;

  try {
    const apps = await getTaskManagerHistory();
    log("TRACKING", "Active applications:", apps);

    if (Object.keys(apps).length > 0) {
      const data = loadActivityData();
      const timestamp = Date.now();

      if (!data.screenTime) {
        data.screenTime = {};
      }

      // Track if we found any active window
      let foundActiveWindow = false;
      let activeApps = {};

      // Update screen time for applications
      Object.entries(apps).forEach(([appName, appInfo]) => {
        // Initialize app in activeApps with current status
        activeApps[appName] = {
          isActive: appInfo.IsActive,
          windowTitle: appInfo.MainWindowTitle,
        };

        // Track if this app is active
        if (appInfo.IsActive) {
          foundActiveWindow = true;
          if (!data.screenTime[appName]) {
            data.screenTime[appName] = 0;
          }
          // Add time increment (2 seconds for more accuracy)
          data.screenTime[appName] += 2;
          log(
            "TRACKING",
            `Updated time for ${appName}: ${data.screenTime[appName]} seconds`
          );
        }
      });

      // Save the updated data
      saveActivityData(data);
      log("TRACKING", "Updated data:", data);

      // Send update to renderer with active state information
      if (mainWindow?.webContents) {
        mainWindow.webContents.send("activity-data-update", {
          screenTime: data.screenTime,
          timestamp: timestamp,
          activeApps: activeApps,
          isIdle: !foundActiveWindow,
        });
        log("IPC", "Sent update to renderer");
      }
    }
  } catch (error) {
    log("ERROR", "Update error:", error);
  }
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "build", "index.html"));
  log("WINDOW", "Main window created");
}

// Set up IPC handlers
ipcMain.handle("get-activity-data", () => {
  log("IPC", "Handling get-activity-data request");
  return loadActivityData();
});

// Initialize the application
app.whenReady().then(() => {
  log("APP", "Application ready");
  createWindow();
  setInterval(updateActivityData, 2000); // Changed from 5000 to 2000 ms
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
