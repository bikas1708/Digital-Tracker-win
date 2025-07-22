// main.js (Electron Main Process)

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      // Use preload script to expose IPC securely
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false, // Keep false for security
      contextIsolation: true, // Keep true for security
    },
  });

  // Load your React app (assuming it's built into a 'build' folder)
  // In development, you'd load from a local server: mainWindow.loadURL('http://localhost:3000');
  mainWindow.loadFile(path.join(__dirname, "build", "index.html"));
}

// IPC handler for the renderer process to request active app info
ipcMain.handle("get-active-app-info", async () => {
  const appInfo = await getWindowsActiveApplicationInfo();
  return appInfo;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
