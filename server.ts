import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;
  const upload = multer({ storage: multer.memoryStorage() });

  app.post('/api/rodin', upload.any(), async (req, res) => {
    const formData = new FormData();
    
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(file => {
        formData.append('images', file.buffer, file.originalname);
      });
    }
    
    for (const key in req.body) {
      formData.append(key, req.body[key]);
    }
    
    try {
      const response = await axios.post('https://api.hyper3d.com/api/v2/rodin', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.RODIN_API_KEY}`
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { message: 'Failed to generate 3D model' });
    }
  });

  app.get('/api/rodin/status/:uuid', async (req, res) => {
    try {
      const response = await axios.get(`https://api.hyper3d.com/api/v2/rodin/status/${req.params.uuid}`, {
        headers: {
          'Authorization': `Bearer ${process.env.RODIN_API_KEY}`
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { message: 'Failed to check status' });
    }
  });

  // In-memory state for nodes and connections
  // Persisted to state.json
  const STATE_FILE = path.join(process.cwd(), "state.json");
  const DEFAULT_STATE = {
    nodes: [
      { id: 'core-1', type: 'core', title: 'Core Project', x: 500, y: 400 },
      { id: 'img-1', type: 'image', title: 'Visual Concepts v1.2', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAj2x5Ews4pBgG7h4nHiLThrYuob8miVR94xy2vgESH2XCntQQCrGub_UyKWJ-5L3ZlADii_51tDN6JWIMY58dk4r8gik80rqutMYLUnvpHmP41Zdu3d8xP4CcoQBl2Tzd4NTxWk6EnGLw2gzZK7KgjZrM4t_uIp1dU6eA974tZO6GgMKjTZSVy1FqFf1T_feq7aCWkhqFXImpIvKqY_-RPA4UvlihapqTuKcE4BUV-0QqkRNUCfrr60_pn9SCN2vXIGxCPwjmkO-Hu', x: 200, y: 300 },
      { id: 'vid-1', type: 'video', title: '3D Animation Techniques', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNNzNeS9UAgaMu3lzrNn2hBmuzm_XOsw17V34-Z3uC8NiwfJ3AEeI9ngWcD8m4Di7__Oqg2-lILYUN7U6yBalBZZQBX8-1Vmxc9GAJnapDkAdsi6RjnsOFi8osV8vd_ZWy0h4jXYieYRRVeq1_CtIWWebR6bRYcAU5_-t9WV0Dqo6AwazkM-Bjh4Fv-WvQY5q6-2SuywzcJ2L8wsj0gpw2I6-e7YEUVWVjYmEPk6PFCtjKpTfmeDcXeL2OHCwMM-ZSkiR8JtE5Nxfm', x: 800, y: 400 },
      { id: 'code-1', type: 'code', title: 'Code Snippet', content: "const universe = {\n  nodes: 42,\n  links: 128,\n  status: 'active'\n};", x: 150, y: 600 },
      { id: 'gif-1', type: 'gif', title: 'Dynamic Texture Reference', x: 450, y: 750 },
      { id: 'zim-1', type: 'zim', title: 'ZIM 3D Interactive', content: "const rect = new Rectangle(200, 200, 'orange', 'white', 4).center().drag();\nrect.animate({props:{rotation:360, rotY:360}, time:4, loop:true, ease:'linear'});\nnew Label('Drag me!', 20, 'Arial', 'white').center(rect).mov(0, 120);", x: 850, y: 700 },
    ],
    connections: [
      { id: 'conn-1', source: 'core-1', target: 'img-1' },
      { id: 'conn-2', source: 'core-1', target: 'vid-1' },
      { id: 'conn-3', source: 'core-1', target: 'code-1' },
      { id: 'conn-4', source: 'core-1', target: 'gif-1' },
    ]
  };

  let appState = JSON.parse(JSON.stringify(DEFAULT_STATE));

  // Load state from file if it exists
  try {
    const fs = await import("fs/promises");
    const data = await fs.readFile(STATE_FILE, "utf-8");
    const savedState = JSON.parse(data);
    if (savedState && savedState.nodes && savedState.nodes.length > 0) {
      appState = savedState;
      console.log("State loaded from file");
    } else {
      console.log("Saved state is empty, using defaults");
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      await fs.writeFile(STATE_FILE, JSON.stringify(appState, null, 2));
    }
  } catch (e) {
    console.log("No saved state found or error reading state, using defaults");
    appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    try {
      const fs = await import("fs/promises");
      await fs.writeFile(STATE_FILE, JSON.stringify(appState, null, 2));
    } catch (writeErr) {
      console.error("Failed to write initial state:", writeErr);
    }
  }

  const saveState = async () => {
    try {
      const fs = await import("fs/promises");
      await fs.writeFile(STATE_FILE, JSON.stringify(appState, null, 2));
    } catch (e) {
      console.error("Failed to save state:", e);
    }
  };

  const io = new Server(httpServer, {
    maxHttpBufferSize: 1e8, // 100MB limit for large payloads (GIFs)
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Send initial state to the new client
    socket.emit("init-state", appState);

    // Handle node updates
    socket.on("update-node", (data) => {
      try {
        const index = appState.nodes.findIndex((n: any) => n.id === data.id);
        if (index !== -1) {
          appState.nodes[index] = { ...appState.nodes[index], ...data.updates };
          saveState();
        }
        socket.broadcast.emit("node-updated", data);
      } catch (e) {
        console.error("Error updating node:", e);
      }
    });

    // Handle new node creation
    socket.on("create-node", (node: any) => {
      try {
        if (!appState.nodes.some((n: any) => n.id === node.id)) {
          appState.nodes.push(node as never);
          saveState();
          socket.broadcast.emit("node-created", node);
        }
      } catch (e) {
        console.error("Error creating node:", e);
      }
    });

    // Handle node deletion
    socket.on("delete-node", (id) => {
      try {
        appState.nodes = appState.nodes.filter((n: any) => n.id !== id);
        appState.connections = appState.connections.filter((c: any) => c.source !== id && c.target !== id);
        saveState();
        socket.broadcast.emit("node-deleted", id);
      } catch (e) {
        console.error("Error deleting node:", e);
      }
    });

    // Handle connection creation
    socket.on("create-connection", (conn: any) => {
      try {
        if (!appState.connections.some((c: any) => c.id === conn.id)) {
          appState.connections.push(conn as never);
          saveState();
          socket.broadcast.emit("connection-created", conn);
        }
      } catch (e) {
        console.error("Error creating connection:", e);
      }
    });

    // Handle full state sync (optional, for robustness)
    socket.on("sync-state", (state) => {
      try {
        if (state && state.nodes) {
          appState = state;
          saveState();
          socket.broadcast.emit("state-synced", state);
        }
      } catch (e) {
        console.error("Error syncing state:", e);
      }
    });

    socket.on("reset-universe", () => {
      try {
        appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        saveState();
        io.emit("universe-reset", appState);
      } catch (e) {
        console.error("Error resetting universe:", e);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
