// preload.js

const { contextBridge, ipcRenderer } = require("electron");

// Add error handling wrapper
const safeIpcCall = async (channel, ...args) => {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`IPC call failed for channel ${channel}:`, error);
    return null;
  }
};

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    // Expose a specific method to call the main process for active app info
    getActiveAppInfo() {
      return ipcRenderer.invoke("get-active-app-info");
    },
    getActivityData: async () => {
      return await safeIpcCall("get-activity-data");
    },
    onActivityDataUpdate: (callback) => {
      try {
        ipcRenderer.on("activity-data-update", (event, data) => callback(data));
      } catch (error) {
        console.error("Failed to set up activity data listener:", error);
      }
    },
    removeActivityDataListener: () => {
      try {
        ipcRenderer.removeAllListeners("activity-data-update");
      } catch (error) {
        console.error("Failed to remove activity data listener:", error);
      }
    },
    clearActivityData() {
      return ipcRenderer.invoke("clear-activity-data");
    },
    exportActivityData() {
      return ipcRenderer.invoke("export-activity-data");
    },
  },
});
