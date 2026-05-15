const { app, BrowserWindow, dialog, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

let mainWindow;
let backendProcess;
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3000;
const isDev = !app.isPackaged;

function getBackendPath() {
  if (isDev) {
    return path.join(__dirname, "..", "..", "backend");
  }
  return path.join(process.resourcesPath, "backend");
}

function getPythonPath() {
  if (isDev) {
    const backendDir = getBackendPath();
    const venvPython = path.join(backendDir, ".venv", "bin", "python3");
    return venvPython;
  }
  return path.join(process.resourcesPath, "backend-dist", "uarm-backend");
}

function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function tryConnect() {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
      socket.on("timeout", () => {
        socket.destroy();
        setTimeout(tryConnect, 500);
      });
      socket.connect(port, "127.0.0.1");
    }
    tryConnect();
  });
}

function startBackend() {
  const pythonPath = getPythonPath();
  const backendDir = getBackendPath();

  if (isDev) {
    const projectRoot = path.join(backendDir, "..");
    backendProcess = spawn(pythonPath, [
      "-m", "uvicorn", "backend.main:app",
      "--host", "127.0.0.1",
      "--port", String(BACKEND_PORT),
    ], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
  } else {
    backendProcess = spawn(pythonPath, [
      "--host", "127.0.0.1",
      "--port", String(BACKEND_PORT),
    ], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
  }

  backendProcess.stdout?.on("data", (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr?.on("data", (data) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.on("exit", (code) => {
    console.log(`Backend exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "uARM Swift Pro Control",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const menu = Menu.buildFromTemplate([
    {
      label: "uARM Control",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Navigate",
      submenu: [
        { label: "Dashboard", click: () => mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}/`) },
        { label: "Calibrate", click: () => mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}/calibrate`) },
        { label: "Control", click: () => mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}/control`) },
        { label: "Teach & Replay", click: () => mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}/teach`) },
        { label: "Scripts", click: () => mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}/scripts`) },
        { label: "Safety", click: () => mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}/safety`) },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  startBackend();

  try {
    await waitForPort(BACKEND_PORT, 30000);
    console.log("Backend is ready");
  } catch (error) {
    dialog.showErrorBox("Backend Error", "Failed to start the Python backend. Make sure Python dependencies are installed.");
  }

  if (isDev) {
    try {
      await waitForPort(FRONTEND_PORT, 5000);
    } catch {
      console.log("Next.js dev server not detected, waiting...");
      await waitForPort(FRONTEND_PORT, 30000);
    }
  }

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill("SIGTERM");
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill("SIGKILL");
      }
    }, 3000);
  }
});
