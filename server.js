#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Praxis Systems — Unified Server Entry Point
//
// Runs ALL three services in a single process for cloud deployment:
//   1. bot.js    — Discord verification, tickets, anti-spam
//   2. ai.js     — AI chat, slash commands, economic calendar, onboarding
//   3. webhooks.js — TradingView → Discord signal proxy (Express HTTP)
//
// Usage:  node server.js
// Deploy: Push to GitHub → Render auto-deploys
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

const { fork } = require("child_process");
const path = require("path");

console.log("\n🚀  Praxis Systems — Starting all services...\n");

// ── Fork bot.js as a child process ───────────────────────────────────────────
const bot = fork(path.join(__dirname, "bot.js"), [], {
    stdio: ["pipe", "inherit", "inherit", "ipc"],
});
bot.on("exit", (code) => {
    console.error(`⚠ bot.js exited with code ${code} — restarting in 5s...`);
    setTimeout(() => {
        fork(path.join(__dirname, "bot.js"), [], {
            stdio: ["pipe", "inherit", "inherit", "ipc"],
        });
    }, 5000);
});

// ── Fork ai.js as a child process ────────────────────────────────────────────
const ai = fork(path.join(__dirname, "ai.js"), [], {
    stdio: ["pipe", "inherit", "inherit", "ipc"],
});
ai.on("exit", (code) => {
    console.error(`⚠ ai.js exited with code ${code} — restarting in 5s...`);
    setTimeout(() => {
        fork(path.join(__dirname, "ai.js"), [], {
            stdio: ["pipe", "inherit", "inherit", "ipc"],
        });
    }, 5000);
});

// ── Run webhooks.js in this process (provides HTTP server for Render) ────────
require("./webhooks.js");

// ── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown() {
    console.log("\n🛑  Shutting down all services...");
    bot.kill("SIGTERM");
    ai.kill("SIGTERM");
    setTimeout(() => process.exit(0), 3000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
