"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.setupVite = setupVite;
exports.serveStatic = serveStatic;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const vite = __importStar(require("vite"));
const nanoid_1 = require("nanoid");
// Create a logger using the Vite logger if available
let viteLogger;
try {
    // @ts-ignore - We're handling potential import issues
    viteLogger = vite.createLogger ? vite.createLogger() : console;
}
catch (e) {
    viteLogger = {
        info: console.info,
        warn: console.warn,
        error: console.error,
        clearScreen: () => { }
    };
}
function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app, server) {
    // Dynamically import the vite config
    let config = {};
    try {
        // Dynamic import of vite.config.ts
        const viteConfigModule = await Promise.resolve().then(() => __importStar(require('../vite.config.js')));
        config = viteConfigModule.default || {};
        log("Successfully loaded Vite config");
    }
    catch (error) {
        console.error("Error loading Vite config:", error);
        // Continue with empty config if import fails
    }
    // @ts-ignore - Handle potential compatibility issues with createServer
    const viteServer = await vite.createServer({
        ...config,
        configFile: false,
        customLogger: {
            ...viteLogger,
            error: (msg, options) => {
                // Don't exit process on error - just log it
                if (viteLogger.error) {
                    viteLogger.error(msg, options);
                }
                console.error("[Vite] Error:", msg);
            },
        },
        server: {
            middlewareMode: true,
            hmr: { server },
        },
        appType: "custom",
    });
    app.use(viteServer.middlewares);
    // Serve static assets from public directory if they exist
    const publicDir = path_1.default.resolve("../client/public");
    if (fs_1.default.existsSync(publicDir)) {
        app.use(express_1.default.static(publicDir));
        log("Serving static assets from: " + publicDir);
    }
    // Only handle non-API routes with the catch-all handler
    app.use("*", async (req, res, next) => {
        const url = req.originalUrl;
        // Skip API routes and let them be handled by the actual API handlers
        if (url.startsWith('/api') || url.startsWith('/ws') || url.startsWith('/api-docs')) {
            return next();
        }
        log(`Handling client-side route: ${url}`);
        try {
            const clientTemplate = path_1.default.resolve("../client/index.html");
            if (!fs_1.default.existsSync(clientTemplate)) {
                log(`ERROR: Client template not found at ${clientTemplate}`, "error");
                return next(new Error(`Client template not found at ${clientTemplate}`));
            }
            // Always reload the index.html file from disk in case it changes
            let template = await fs_1.default.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${(0, nanoid_1.nanoid)()}"`);
            // Transform the template with Vite
            const page = await viteServer.transformIndexHtml(url, template);
            // Log successful rendering
            log(`Successfully served client route: ${url}`);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        }
        catch (e) {
            viteServer.ssrFixStacktrace(e);
            console.error(`Error serving client route ${req.originalUrl}:`, e);
            next(e);
        }
    });
}
function serveStatic(app) {
    const distPath = path_1.default.resolve("public");
    if (!fs_1.default.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express_1.default.static(distPath));
    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
        res.sendFile(path_1.default.resolve(distPath, "index.html"));
    });
}
