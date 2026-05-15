const { app, BrowserWindow, dialog, Menu, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const http = require("http");
const fs = require("fs");

let mainWindow;
let backendProcess;
let frontendServer;
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3456;
const isDev = !app.isPackaged;

function getBackendPath() {
  if (isDev) {
    return path.join(__dirname, "..", "..", "backend");
  }
  return path.join(process.resourcesPath, "backend");
}

function getPythonCommand() {
  if (isDev) {
    const backendDir = getBackendPath();
    if (process.platform === "win32") {
      return path.join(backendDir, ".venv", "Scripts", "python.exe");
    }
    return path.join(backendDir, ".venv", "bin", "python3");
  }
  if (process.platform === "win32") {
    return "python";
  }
  return "python3";
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
  const pythonCmd = getPythonCommand();
  const backendDir = getBackendPath();
  const projectRoot = isDev ? path.join(backendDir, "..") : backendDir;

  if (isDev) {
    backendProcess = spawn(pythonCmd, [
      "-m", "uvicorn", "backend.main:app",
      "--host", "127.0.0.1",
      "--port", String(BACKEND_PORT),
    ], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
  } else {
    backendProcess = spawn(pythonCmd, [
      "-m", "uvicorn", "main:app",
      "--host", "127.0.0.1",
      "--port", String(BACKEND_PORT),
    ], {
      cwd: backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
  }

  backendProcess.stdout?.on("data", (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr?.on("data", (data) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.on("error", (err) => {
    console.error(`[backend] Failed to start: ${err.message}`);
    dialog.showErrorBox(
      "Backend Error",
      `Could not start Python backend.\n\nMake sure Python 3 is installed and accessible.\n\nError: ${err.message}`
    );
  });

  backendProcess.on("exit", (code) => {
    console.log(`Backend exited with code ${code}`);
  });
}

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain",
};

function startFrontendServer(staticDir) {
  return new Promise((resolve) => {
    frontendServer = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);

      if (urlPath === "/") urlPath = "/index.html";

      let filePath = path.join(staticDir, urlPath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const htmlPath = path.join(staticDir, urlPath + ".html");
        const indexPath = path.join(staticDir, urlPath, "index.html");
        if (fs.existsSync(htmlPath)) {
          filePath = htmlPath;
        } else if (fs.existsSync(indexPath)) {
          filePath = indexPath;
        } else {
          filePath = path.join(staticDir, "404.html");
          if (!fs.existsSync(filePath)) {
            filePath = path.join(staticDir, "index.html");
          }
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    frontendServer.listen(FRONTEND_PORT, "127.0.0.1", () => {
      console.log(`Frontend serving from ${staticDir} on port ${FRONTEND_PORT}`);
      resolve();
    });
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

  const baseUrl = isDev ? "http://localhost:3001" : `http://127.0.0.1:${FRONTEND_PORT}`;

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
        { label: "Dashboard", click: () => mainWindow.loadURL(`${baseUrl}/`) },
        { label: "Calibrate", click: () => mainWindow.loadURL(`${baseUrl}/calibrate`) },
        { label: "Control", click: () => mainWindow.loadURL(`${baseUrl}/control`) },
        { label: "Teach & Replay", click: () => mainWindow.loadURL(`${baseUrl}/teach`) },
        { label: "Scripts", click: () => mainWindow.loadURL(`${baseUrl}/scripts`) },
        { label: "Safety", click: () => mainWindow.loadURL(`${baseUrl}/safety`) },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL(baseUrl);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  startBackend();

  if (!isDev) {
    const staticDir = path.join(app.getAppPath(), "out");
    await startFrontendServer(staticDir);
  }

  try {
    await waitForPort(BACKEND_PORT, 30000);
    console.log("Backend is ready");
  } catch {
    dialog.showErrorBox(
      "Backend Error",
      "Failed to start the Python backend.\n\nMake sure Python 3 is installed and the backend dependencies are set up:\n\npip install -r requirements.txt"
    );
  }

  if (isDev) {
    try {
      await waitForPort(3001, 30000);
    } catch {
      console.log("Waiting for Next.js dev server...");
    }
  }

  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("before-quit", () => {
  if (frontendServer) {
    frontendServer.close();
  }
  if (backendProcess && !backendProcess.killed) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"]);
    } else {
      backendProcess.kill("SIGTERM");
      setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill("SIGKILL");
        }
      }, 3000);
    }
  }
});
