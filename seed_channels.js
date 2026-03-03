#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Praxis Systems — Channel Seeder / Cleanup
// Run once: node seed_channels.js
// - Fixes PassPro → Praxis branding in #server-guide
// - Removes duplicate role-selector embeds in #general-chat
// - Seeds all empty channels with professional Praxis content
// - Posts FAQ, platform-help, wins-and-pnl, signal channel intros
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

require("dotenv").config();
const {
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, ChannelType,
} = require("discord.js");

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const COLORS = {
    orange: 0xf5a623, green: 0x2ecc71, red: 0xe74c3c,
    blue: 0x3498db, purple: 0x9b59b6, gray: 0x95a5a6, gold: 0xf1c40f,
};

// ── Helper: delete all bot messages in a channel ─────────────────────────────
async function clearBotMessages(ch, keepButtonId = null) {
    const msgs = await ch.messages.fetch({ limit: 20 });
    for (const [, m] of msgs) {
        if (!m.author.bot) continue;
        if (keepButtonId && m.components?.some(r => r.components?.some(c => c.customId === keepButtonId))) continue;
        await m.delete().catch(() => { });
        await new Promise(r => setTimeout(r, 300));
    }
}

// ── Helper: check if channel already has our content ─────────────────────────
async function hasContent(ch, titleKeyword) {
    const msgs = await ch.messages.fetch({ limit: 10 });
    return msgs.some(m => m.author.bot && m.embeds?.some(e => e.title?.includes(titleKeyword)));
}

client.once("ready", async () => {
    console.log(`\n🌱 Praxis Seeder online as ${client.user.tag}`);

    const guild = await client.guilds.fetch(GUILD_ID);
    const channels = await guild.channels.fetch();
    const ch = name => channels.find(c => c?.name === name);

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. #server-guide — fix PassPro branding, rewrite to Praxis
    // ═══════════════════════════════════════════════════════════════════════════
    const sgCh = ch("server-guide");
    if (sgCh) {
        console.log("\n📝 Rewriting #server-guide...");
        await clearBotMessages(sgCh);

        const embed = new EmbedBuilder()
            .setTitle("📖 Server Guide — Praxis Systems")
            .setDescription(
                "Welcome to **Praxis Systems** — your professional algorithmic trading community.\n\n" +
                "Here's everything you need to know to get the most out of your membership.\n\u200b"
            )
            .setColor(COLORS.orange)
            .addFields(
                {
                    name: "📋 Getting Started",
                    value:
                        "1. Read the rules in `#welcome` and click **Verify** to get access\n" +
                        "2. Browse the channels based on your membership tier\n" +
                        "3. Introduce yourself in `#general-chat`\n" +
                        "4. Register your TradingView username: `/tradingview set username:YourName`\n\u200b",
                    inline: false,
                },
                {
                    name: "📊 Signal Channels",
                    value:
                        "**🔵 Scalp Pro** — `#scalp-pro-signals` · `#scalp-pro-daily-plan` · `#scalp-pro-discussion`\n" +
                        "**🟢 Wick Hunter** — `#wick-hunter-signals` · `#wick-hunter-daily-plan` · `#wick-hunter-discussion`\n\n" +
                        "Each signal includes: **Entry · Stop Loss · TP1 · TP2 · TP3**\n\u200b",
                    inline: false,
                },
                {
                    name: "🔔 Signal Alert Pings",
                    value:
                        "Go to `#general-chat` and click the alert role buttons to opt-in to pings when a signal fires.\n\u200b",
                    inline: false,
                },
                {
                    name: "🤖 AI Assistant",
                    value:
                        "Use `#ask-praxis` to chat privately with **Praxis AI** — answer questions about signals, TradingView setup, billing, or anything else.\n\u200b",
                    inline: false,
                },
                {
                    name: "🎫 Support",
                    value:
                        "For any account or billing issues, open a ticket in `#create-ticket`. Response time is typically within a few hours.",
                    inline: false,
                },
            )
            .setFooter({ text: "Praxis Systems — Professional Algorithmic Trading" });

        await sgCh.send({ embeds: [embed] });
        console.log("   ✔ #server-guide updated");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. #general-chat — remove duplicate role-selector embeds and daily briefings
    // ═══════════════════════════════════════════════════════════════════════════
    const gcCh = ch("general-chat");
    if (gcCh) {
        console.log("\n🧹 Cleaning #general-chat duplicates...");
        const msgs = await gcCh.messages.fetch({ limit: 20 });
        const roleSelectorMsgs = [...msgs.values()].filter(
            m => m.author.bot && m.embeds?.some(e => e.title?.includes("Signal Alert Roles"))
        );
        // Keep only the most recent one
        if (roleSelectorMsgs.length > 1) {
            const [keep, ...dupes] = roleSelectorMsgs; // most recent first
            for (const d of dupes) {
                await d.delete().catch(() => { });
                await new Promise(r => setTimeout(r, 400));
            }
            console.log(`   ✔ Removed ${dupes.length} duplicate role selector embed(s)`);
        }
        // Remove any untitled bot embeds (stale daily briefings, etc.)
        const untitledBotMsgs = [...msgs.values()].filter(
            m => m.author.bot && m.embeds?.length > 0 && !m.embeds[0].title && m.components?.length === 0
        );
        for (const m of untitledBotMsgs) {
            await m.delete().catch(() => { });
            await new Promise(r => setTimeout(r, 300));
        }
        if (untitledBotMsgs.length) console.log(`   ✔ Removed ${untitledBotMsgs.length} stale untitled embed(s)`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. #wins-and-pnl — improve description (already has embed, just ensure it's current)
    // ═══════════════════════════════════════════════════════════════════════════
    const winsCh = ch("wins-and-pnl");
    if (winsCh && !(await hasContent(winsCh, "PnL"))) {
        console.log("\n🏆 Seeding #wins-and-pnl...");
        await clearBotMessages(winsCh);
        await winsCh.send({
            embeds: [new EmbedBuilder()
                .setTitle("🏆 Wins & PnL")
                .setDescription(
                    "Share your **trade wins and PnL screenshots** here!\n\n" +
                    "Whether it's a small scalp or a full TP3 — every win counts. 📈\n\n" +
                    "**Posting tips:**\n" +
                    "• Attach your chart screenshot\n" +
                    "• Share which signal you followed (Scalp Pro or Wick Hunter)\n" +
                    "• Tag a fellow member to celebrate together!\n\n" +
                    "⚠️ *Not financial advice. Past performance ≠ future results.*"
                )
                .setColor(COLORS.gold)
                .setFooter({ text: "Praxis Systems — Community Wins" })],
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. #faq — seed with common questions
    // ═══════════════════════════════════════════════════════════════════════════
    const faqCh = ch("faq");
    if (faqCh && !(await hasContent(faqCh, "FAQ"))) {
        console.log("\n❓ Seeding #faq...");

        const faqs = [
            {
                q: "How do I get access to signals?",
                a: "Purchase a **Scalp Pro** or **Wick Hunter** membership. Once your role is granted, you'll see the signal channels automatically.",
            },
            {
                q: "How do I set up the TradingView indicator?",
                a: "Run `/tradingview set username:YourTVName` in any channel. An admin will add you to the indicator access list. Then go to TradingView → Indicators → Invite-Only Scripts.",
            },
            {
                q: "I changed my TradingView username. What do I do?",
                a: "Run `/tradingview set username:YourNewName` again. The bot will notify an admin to update your access.",
            },
            {
                q: "What instruments do the signals cover?",
                a: "Currently **Gold (GC)** and **NQ (NASDAQ Futures)**. More instruments may be added based on community feedback.",
            },
            {
                q: "What does each signal include?",
                a: "Every signal shows: **Direction** (Long/Short), **Entry Price**, **Stop Loss**, **TP1**, **TP2**, and **TP3**. Always manage your own risk.",
            },
            {
                q: "How do I get pinged for signals?",
                a: "Go to `#general-chat` and click the **Scalp Pro Alerts** or **Wick Hunter Alerts** button to opt-in to pings.",
            },
            {
                q: "I have a billing or account issue.",
                a: "Open a support ticket in `#create-ticket`. Our team responds within a few hours.",
            },
            {
                q: "Is there an AI assistant I can use?",
                a: "Yes! Go to `#ask-praxis` and click **Start Private AI Chat**. Your conversation is completely private — only you can see it.",
            },
        ];

        await faqCh.send({
            embeds: [new EmbedBuilder()
                .setTitle("❓ Frequently Asked Questions")
                .setDescription("Find answers to the most common questions below. Can't find your answer? Open a ticket in `#create-ticket`.")
                .setColor(COLORS.blue)
                .setFooter({ text: "Praxis Systems — FAQ" })],
        });

        for (const faq of faqs) {
            await faqCh.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`Q: ${faq.q}`)
                    .setDescription(`**A:** ${faq.a}`)
                    .setColor(COLORS.gray)],
            });
            await new Promise(r => setTimeout(r, 600));
        }
        console.log(`   ✔ Posted ${faqs.length} FAQ entries`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. #platform-help — usage guide
    // ═══════════════════════════════════════════════════════════════════════════
    const phCh = ch("platform-help");
    if (phCh && !(await hasContent(phCh, "Platform"))) {
        console.log("\n🛠 Seeding #platform-help...");
        await phCh.send({
            embeds: [new EmbedBuilder()
                .setTitle("🛠 Platform Help — TradingView & Signal Setup")
                .setDescription("Step-by-step guides for getting fully set up on Praxis Systems.")
                .setColor(COLORS.blue),
            ],
        });
        await new Promise(r => setTimeout(r, 500));
        await phCh.send({
            embeds: [new EmbedBuilder()
                .setTitle("📊 Step 1 — Register Your TradingView Username")
                .setDescription(
                    "Run this slash command in any channel:\n```\n/tradingview set username:YourTVUsername\n```\nThe bot will store your username and ping an admin to grant you access to the invite-only indicator script.\n\n" +
                    "• You only need to do this **once**\n" +
                    "• If you change your username, run it again\n" +
                    "• Use `/tradingview view` to check what's currently registered"
                ).setColor(COLORS.orange),
            ],
        });
        await new Promise(r => setTimeout(r, 500));
        await phCh.send({
            embeds: [new EmbedBuilder()
                .setTitle("📈 Step 2 — Add the Indicator to Your Chart")
                .setDescription(
                    "Once an admin has granted access:\n\n" +
                    "1. Open TradingView and go to your chart\n" +
                    "2. Click **Indicators** → **Invite-Only Scripts**\n" +
                    "3. Find the **Praxis** indicator and click it\n" +
                    "4. The indicator will appear on your chart\n\n" +
                    "If you don't see it yet, it may take a few minutes after admin grants access."
                ).setColor(COLORS.green),
            ],
        });
        await new Promise(r => setTimeout(r, 500));
        await phCh.send({
            embeds: [new EmbedBuilder()
                .setTitle("🔔 Step 3 — Get Signal Pings in Discord")
                .setDescription(
                    "Go to `#general-chat` and click:\n" +
                    "• **📊 Scalp Pro Alerts** — to get pinged for every Scalp Pro signal\n" +
                    "• **📈 Wick Hunter Alerts** — to get pinged for Wick Hunter signals\n\n" +
                    "Click again to unsubscribe. You control your own notifications."
                ).setColor(COLORS.purple),
            ],
        });
        console.log("   ✔ #platform-help seeded");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. Scalp Pro channels — seed info posts
    // ═══════════════════════════════════════════════════════════════════════════
    const spSig = ch("scalp-pro-signals");
    if (spSig && !(await hasContent(spSig, "Scalp Pro"))) {
        console.log("\n📊 Seeding #scalp-pro-signals...");
        await spSig.send({
            embeds: [new EmbedBuilder()
                .setTitle("📊 Scalp Pro — Signal Channel")
                .setDescription(
                    "Live algorithmic signals for **Gold (GC)** and **NQ (NASDAQ Futures)**.\n\n" +
                    "**Every signal includes:**\n" +
                    "🟢 **Entry** — the price level where the algo detected the setup\n" +
                    "🛑 **Stop Loss** — max loss level. Exit here if hit.\n" +
                    "🎯 **TP1 / TP2 / TP3** — take-profit targets\n\n" +
                    "**Risk Rules:**\n" +
                    "• Never risk more than **1-2% of your account** per trade\n" +
                    "• If SL is hit → exit. No averaging down.\n" +
                    "• Signals are algo-generated, not financial advice.\n\n" +
                    "🔔 Enable pings in `#general-chat` → **Scalp Pro Alerts** button"
                )
                .setColor(0x3498db)
                .setFooter({ text: "Praxis Systems — Scalp Pro Signal Desk" })],
        });
    }

    const spDaily = ch("scalp-pro-daily-plan");
    if (spDaily && !(await hasContent(spDaily, "Daily"))) {
        console.log("📊 Seeding #scalp-pro-daily-plan...");
        await spDaily.send({
            embeds: [new EmbedBuilder()
                .setTitle("📅 Scalp Pro — Daily Plan")
                .setDescription(
                    "This channel is updated each trading day with the **daily market context** for Scalp Pro members.\n\n" +
                    "**What to expect:**\n" +
                    "• Key levels for Gold (GC) and NQ\n" +
                    "• High-impact economic events for the day\n" +
                    "• Algo bias (bullish / bearish / neutral)\n" +
                    "• Session times to watch (London, NY Open, NY Close)\n\n" +
                    "Check `#announcements` every Monday for the weekly economic calendar."
                )
                .setColor(0x3498db)
                .setFooter({ text: "Praxis Systems — Scalp Pro Daily Plan" })],
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. Wick Hunter channels — seed info posts
    // ═══════════════════════════════════════════════════════════════════════════
    const whSig = ch("wick-hunter-signals");
    if (whSig && !(await hasContent(whSig, "Wick Hunter"))) {
        console.log("\n📈 Seeding #wick-hunter-signals...");
        await whSig.send({
            embeds: [new EmbedBuilder()
                .setTitle("📈 Wick Hunter — Signal Channel")
                .setDescription(
                    "Live algorithmic signals powered by the **Wick Hunter** strategy.\n\n" +
                    "**Every signal includes:**\n" +
                    "🟢 **Entry** — detected wick-rejection level\n" +
                    "🛑 **Stop Loss** — exit here if hit\n" +
                    "🎯 **TP1 / TP2 / TP3** — progressive take-profit targets\n\n" +
                    "**Risk Rules:**\n" +
                    "• Never risk more than **1-2% of your account** per trade\n" +
                    "• Honor your stop loss — no exceptions\n" +
                    "• Signals are algo-generated, not financial advice.\n\n" +
                    "🔔 Enable pings in `#general-chat` → **Wick Hunter Alerts** button"
                )
                .setColor(0x2ecc71)
                .setFooter({ text: "Praxis Systems — Wick Hunter Signal Desk" })],
        });
    }

    const whDaily = ch("wick-hunter-daily-plan");
    if (whDaily && !(await hasContent(whDaily, "Daily"))) {
        console.log("📈 Seeding #wick-hunter-daily-plan...");
        await whDaily.send({
            embeds: [new EmbedBuilder()
                .setTitle("📅 Wick Hunter — Daily Plan")
                .setDescription(
                    "Daily market context and key levels for **Wick Hunter** members.\n\n" +
                    "**What to expect:**\n" +
                    "• Key wick rejection zones to watch\n" +
                    "• Current market structure (trend/range/choppy)\n" +
                    "• High-impact economic events\n" +
                    "• Session overlap times for best signal probability\n\n" +
                    "Check `#announcements` every Monday for the weekly macro calendar."
                )
                .setColor(0x2ecc71)
                .setFooter({ text: "Praxis Systems — Wick Hunter Daily Plan" })],
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. #announcements — seed welcome message
    // ═══════════════════════════════════════════════════════════════════════════
    const annCh = ch("announcements");
    if (annCh && !(await hasContent(annCh, "Announcements"))) {
        console.log("\n📢 Seeding #announcements...");
        await annCh.send({
            embeds: [new EmbedBuilder()
                .setTitle("📢 Praxis Systems — Announcements")
                .setDescription(
                    "This channel is used for **important updates** including:\n\n" +
                    "📅 **Monday** — Weekly High-Impact Economic Calendar (auto-posted)\n" +
                    "🔔 **As needed** — Product updates, new features, maintenance notices\n" +
                    "🏆 **Milestones** — Community wins and member highlights\n\n" +
                    "Make sure notifications are enabled so you never miss a big economic event!"
                )
                .setColor(COLORS.orange)
                .setFooter({ text: "Praxis Systems — Announcements" })],
        });
    }

    console.log("\n\n✅  Seeding complete! All channels updated.\n");
    process.exit(0);
});

client.login(BOT_TOKEN).catch(e => {
    console.error("Login failed:", e.message);
    process.exit(1);
});
