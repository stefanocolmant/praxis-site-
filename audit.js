// Quick one-off channel audit — run with: node audit.js
"use strict";
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const GUILD_ID = process.env.GUILD_ID || "1477826968681447476";

const CHANNELS_TO_CHECK = [
    "welcome", "server-guide", "announcements", "general-chat",
    "wins-and-pnl", "faq", "create-ticket", "platform-help",
    "ask-praxis", "scalp-pro-signals", "scalp-pro-performance",
    "scalp-pro-daily-plan", "wick-hunter-signals", "wick-hunter-daily-plan",
];

client.once("ready", async () => {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channels = await guild.channels.fetch();

    for (const chName of CHANNELS_TO_CHECK) {
        const ch = channels.find(c => c.name === chName);
        if (!ch || !ch.isTextBased()) { console.log(`\n[SKIP] #${chName}`); continue; }

        console.log(`\n${"=".repeat(60)}`);
        console.log(`  #${chName}`);
        console.log("=".repeat(60));

        try {
            const msgs = await ch.messages.fetch({ limit: 6 });
            if (msgs.size === 0) { console.log("  [EMPTY]"); continue; }

            for (const [, m] of [...msgs.entries()].reverse()) {
                const who = m.author.bot ? "🤖" : "👤";
                const content = (m.content || "").slice(0, 80).replace(/\n/g, " ");
                const embedTitles = m.embeds.map(e => e.title || "(no title)");
                const btns = m.components.flatMap(r => r.components.map(c => c.customId || c.label || "?"));
                console.log(`  ${who} ${m.author.username}: ${JSON.stringify(content)}`);
                if (embedTitles.length) console.log(`       embeds: ${JSON.stringify(embedTitles)}`);
                if (btns.length) console.log(`       buttons: ${JSON.stringify(btns)}`);
            }
        } catch (e) {
            console.log(`  ERROR: ${e.message}`);
        }
    }

    console.log("\n\n=== AUDIT COMPLETE ===");
    process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(e => {
    console.error("Login failed:", e.message);
    process.exit(1);
});
