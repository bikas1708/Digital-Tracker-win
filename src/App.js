import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

// Main App Component
const App = () => {
  const [screenTime, setScreenTime] = useState({}); // { appName: totalSeconds }
  const [activeApps, setActiveApps] = useState({}); // { appName: { isActive, windowTitle } }
  const [appLimits, setAppLimits] = useState([]); // [{ id, appName, limitSeconds }]
  const [timers, setTimers] = useState([]); // [{ id, name, duration, remaining, isRunning }]
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard', 'limits', 'timers', 'settings'
  const [message, setMessage] = useState(""); // For user messages/alerts
  const [isIdle, setIsIdle] = useState(false); // Track user idle state
  const messageTimeoutRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const screenTimeRef = useRef(screenTime);
  const inactivityThreshold = 300000; // 5 minutes in milliseconds

  // Update screenTimeRef when screenTime changes
  useEffect(() => {
    screenTimeRef.current = screenTime;
  }, [screenTime]);

  // Load activity data from the background process
  useEffect(() => {
    const loadData = async () => {
      if (window.electron?.ipcRenderer?.getActivityData) {
        try {
          const data = await window.electron.ipcRenderer.getActivityData();
          if (
            JSON.stringify(screenTimeRef.current) !==
            JSON.stringify(data.screenTime)
          ) {
            setScreenTime(data.screenTime || {});
          }
          lastUpdateRef.current = Date.now();
        } catch (error) {
          console.error("Error loading activity data:", error);
        }
      }
    };

    // Initial load
    loadData();

    // Set up real-time updates from main process
    if (window.electron?.ipcRenderer?.onActivityDataUpdate) {
      window.electron.ipcRenderer.onActivityDataUpdate((data) => {
        // Only update if data has actually changed
        if (
          JSON.stringify(screenTimeRef.current) !==
          JSON.stringify(data.screenTime)
        ) {
          setScreenTime(data.screenTime || {});
        }
        setActiveApps(data.activeApps || {});
        setIsIdle(data.isIdle || false);
        lastUpdateRef.current = Date.now();
      });
    }

    // Check for inactivity every minute
    const inactivityInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
      if (timeSinceLastUpdate > inactivityThreshold) {
        setIsIdle(true);
      }
    }, 60000);

    // Cleanup
    return () => {
      clearInterval(inactivityInterval);
      if (window.electron?.ipcRenderer?.removeActivityDataListener) {
        window.electron.ipcRenderer.removeActivityDataListener();
      }
    };
  }, []);

  // Save state changes to localStorage
  useEffect(() => {
    localStorage.setItem(
      "digitalWellbeing",
      JSON.stringify({
        screenTime,
        appLimits,
        timers,
      })
    );
  }, [screenTime, appLimits, timers]);

  // Timer logic
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          if (timer.isRunning && timer.remaining > 0) {
            return { ...timer, remaining: timer.remaining - 1 };
          } else if (timer.isRunning && timer.remaining <= 0) {
            // Timer finished, trigger alert
            showMessage(
              `Timer "${timer.name}" for ${formatSeconds(
                timer.duration
              )} has finished!`
            );
            return { ...timer, isRunning: false, remaining: 0 };
          }
          return timer;
        })
      );
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // Function to show a temporary message
  const showMessage = (msg) => {
    setMessage(msg);
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  // Helper to format seconds into HH:MM:SS
  const formatSeconds = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Dashboard Component
  const Dashboard = React.memo(() => {
    const totalScreenTime = useMemo(
      () => Object.values(screenTime).reduce((acc, val) => acc + val, 0),
      [screenTime]
    );

    // Calculate time differences for display
    const getTimeDifference = useCallback((seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      }
      return `${secs}s`;
    }, []);

    return (
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Digital Wellbeing Dashboard
          </h2>
          <p className="text-gray-600 mt-2">
            Track your application usage in real-time
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg mb-8 overflow-hidden">
          <div className="p-6">
            <p className="text-white/90 text-lg font-medium mb-2">
              Total Screen Time Today
            </p>
            <p className="text-white text-4xl font-bold">
              {getTimeDifference(totalScreenTime)}
            </p>
          </div>
          <div className="bg-white/10 px-6 py-3">
            <p className="text-white/80 text-sm">
              Updates automatically every 5 seconds
            </p>
          </div>
        </div>

        {Object.keys(screenTime).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(screenTime)
              .sort(([, a], [, b]) => b - a)
              .map(([app, time]) => {
                const appInfo = activeApps[app] || { isActive: false };
                return (
                  <div
                    key={app}
                    className="bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border border-gray-100"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800 text-lg">
                          {app}
                        </h4>
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                            appInfo.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {appInfo.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Time spent:</span>
                          <span className="text-gray-900 font-semibold">
                            {getTimeDifference(time)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                (time / totalScreenTime) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 text-lg font-medium">
              No application activity recorded yet
            </p>
            <p className="text-gray-500 mt-1">
              Start using your applications to track screen time
            </p>
          </div>
        )}
      </div>
    );
  });

  // App Limits Component
  const AppLimits = React.memo(() => {
    const [newAppName, setNewAppName] = useState("");
    const [newLimitHours, setNewLimitHours] = useState("");
    const [newLimitMinutes, setNewLimitMinutes] = useState("");

    const addAppLimit = () => {
      const totalSeconds =
        parseInt(newLimitHours || 0) * 3600 +
        parseInt(newLimitMinutes || 0) * 60;
      if (totalSeconds <= 0) {
        showMessage("Limit must be greater than zero.");
        return;
      }

      const newLimit = {
        id: Date.now(),
        appName: newAppName,
        limitSeconds: totalSeconds,
      };
      setAppLimits((prevLimits) => [...prevLimits, newLimit]);
      setNewAppName("");
      setNewLimitHours("");
      setNewLimitMinutes("");
      showMessage("App limit added successfully!");
    };

    const removeAppLimit = (id) => {
      setAppLimits((prevLimits) =>
        prevLimits.filter((limit) => limit.id !== id)
      );
      showMessage("App limit removed.");
    };

    // Check for alerts (this would ideally run in background/main process)
    useEffect(() => {
      appLimits.forEach((limit) => {
        const currentUsage = screenTime[limit.appName] || 0;
        // Only alert if usage is over limit AND it hasn't been alerted yet
        if (currentUsage >= limit.limitSeconds && !limit.alerted) {
          showMessage(`Alert: You've reached your limit for ${limit.appName}!`);
          // Mark as alerted in local state to prevent repeated alerts for the same limit
          setAppLimits((prevLimits) =>
            prevLimits.map((l) =>
              l.id === limit.id ? { ...l, alerted: true } : l
            )
          );
        } else if (currentUsage < limit.limitSeconds && limit.alerted) {
          // Reset alerted status if usage goes below limit (e.g., new day or limit increased)
          setAppLimits((prevLimits) =>
            prevLimits.map((l) =>
              l.id === limit.id ? { ...l, alerted: false } : l
            )
          );
        }
      });
    }, [screenTime, appLimits]);

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Set App Usage Limits
        </h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            Add New Limit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Application Name (e.g., Chrome, VS Code)"
              className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Hours (e.g., 1)"
              className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={newLimitHours}
              onChange={(e) => setNewLimitHours(e.target.value)}
              min="0"
            />
            <input
              type="number"
              placeholder="Minutes (e.g., 30)"
              className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={newLimitMinutes}
              onChange={(e) => setNewLimitMinutes(e.target.value)}
              min="0"
              max="59"
            />
          </div>
          <button
            onClick={addAppLimit}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-lg"
          >
            Add Limit
          </button>
        </div>

        <h3 className="text-xl font-semibold mb-3 text-gray-700">
          Current App Limits
        </h3>
        {appLimits.length > 0 ? (
          <ul className="space-y-3">
            {appLimits.map((limit) => (
              <li
                key={limit.id}
                className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center border border-gray-200"
              >
                <div>
                  <p className="font-medium text-gray-900">{limit.appName}</p>
                  <p className="text-gray-600">
                    Limit: {formatSeconds(limit.limitSeconds)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Current Usage:{" "}
                    {formatSeconds(screenTime[limit.appName] || 0)}
                  </p>
                </div>
                <button
                  onClick={() => removeAppLimit(limit.id)}
                  className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors duration-200 shadow-md"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No app limits set yet.</p>
        )}
      </div>
    );
  });

  // Timers Component
  const Timers = React.memo(() => {
    const [newTimerName, setNewTimerName] = useState("");
    const [newTimerDuration, setNewTimerDuration] = useState(""); // in minutes

    const addTimer = () => {
      if (
        !newTimerName ||
        !newTimerDuration ||
        parseInt(newTimerDuration) <= 0
      ) {
        showMessage(
          "Please enter a valid timer name and duration (in minutes)."
        );
        return;
      }
      const durationSeconds = parseInt(newTimerDuration) * 60;
      const newTimer = {
        id: Date.now(),
        name: newTimerName,
        duration: durationSeconds,
        remaining: durationSeconds,
        isRunning: false,
      };
      setTimers((prevTimers) => [...prevTimers, newTimer]);
      setNewTimerName("");
      setNewTimerDuration("");
      showMessage("Timer added successfully!");
    };

    const toggleTimer = (timerId, currentIsRunning, currentRemaining) => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          if (timer.id === timerId) {
            return {
              ...timer,
              isRunning: !currentIsRunning,
              remaining: currentIsRunning ? currentRemaining : timer.duration, // Reset if stopping
            };
          }
          return timer;
        })
      );
    };

    const removeTimer = (timerId) => {
      setTimers((prevTimers) =>
        prevTimers.filter((timer) => timer.id !== timerId)
      );
      showMessage("Timer removed.");
    };

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Custom Timers</h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            Add New Timer
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Timer Name (e.g., Pomodoro, Break)"
              className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={newTimerName}
              onChange={(e) => setNewTimerName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={newTimerDuration}
              onChange={(e) => setNewTimerDuration(e.target.value)}
              min="1"
            />
          </div>
          <button
            onClick={addTimer}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-lg"
          >
            Add Timer
          </button>
        </div>

        <h3 className="text-xl font-semibold mb-3 text-gray-700">
          Your Timers
        </h3>
        {timers.length > 0 ? (
          <ul className="space-y-3">
            {timers.map((timer) => (
              <li
                key={timer.id}
                className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center border border-gray-200"
              >
                <div>
                  <p className="font-medium text-gray-900">{timer.name}</p>
                  <p className="text-gray-600">
                    {timer.isRunning ? "Running: " : "Remaining: "}
                    <span className="font-bold">
                      {formatSeconds(timer.remaining)}
                    </span>{" "}
                    / {formatSeconds(timer.duration)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      toggleTimer(timer.id, timer.isRunning, timer.remaining)
                    }
                    className={`py-2 px-4 rounded-md shadow-md transition-colors duration-200 ${
                      timer.isRunning
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {timer.isRunning ? "Pause" : "Start"}
                  </button>
                  <button
                    onClick={() => removeTimer(timer.id)}
                    className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors duration-200 shadow-md"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No timers set yet.</p>
        )}
      </div>
    );
  });

  // Settings Component (Placeholder for future expansion)
  const Settings = React.memo(() => {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Settings</h2>
        <p className="text-gray-600">
          This section could include options for:
          <ul className="list-disc list-inside mt-2">
            <li>Notification preferences</li>
            <li>Data export/import</li>
            <li>Theme settings (light/dark mode)</li>
            <li>Advanced tracking options</li>
          </ul>
        </p>
      </div>
    );
  });

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 antialiased">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Inter', sans-serif; }
        `,
        }}
      />

      {/* Message Box */}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-5 py-3 rounded-lg shadow-xl z-50 animate-fade-in-down">
          {message}
        </div>
      )}

      <nav className="bg-white shadow-md p-4 flex justify-center space-x-6">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
            activeTab === "dashboard"
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("limits")}
          className={`py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
            activeTab === "limits"
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          App Limits
        </button>
        <button
          onClick={() => setActiveTab("timers")}
          className={`py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
            activeTab === "timers"
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Timers
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
            activeTab === "settings"
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Settings
        </button>
      </nav>

      <main className="container mx-auto mt-8 p-4">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "limits" && <AppLimits />}
        {activeTab === "timers" && <Timers />}
        {activeTab === "settings" && <Settings />}
      </main>
    </div>
  );
};

export default App;
