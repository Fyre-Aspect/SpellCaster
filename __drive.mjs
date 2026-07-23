import { chromium } from "playwright-core";
import fs from "node:fs";

const OUT = "C:/Users/aamir/AppData/Local/Temp/claude/c--Users-aamir-Coding-SpellCaster/0e07b317-7547-43cc-9d30-0279ca20bb3d/scratchpad/shots3";
fs.mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:5176/";
const errors = [];

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, reducedMotion: "no-preference" });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.locator("button.enter-game, button.landing-enter").first().click().catch(() => page.keyboard.press("Enter"));
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/01-menu-solo.png` });

const info = async (tag) => {
  const d = await page.evaluate(() => ({
    tab: document.querySelector(".mode-tab.active")?.textContent,
    mode: document.querySelector(".mode-slide.selected .mode-slide-name")?.textContent,
    gold: document.querySelector(".gold-corner")?.textContent?.trim(),
  }));
  console.log(tag, JSON.stringify(d));
};
await info("MENU");

// Versus tab
await page.locator(".mode-tab", { hasText: "Versus" }).click();
await page.waitForTimeout(500);
await info("VERSUS_TAB");
await page.screenshot({ path: `${OUT}/02-versus.png` });

// Back to Solo, open campaign via gold chip
await page.locator(".mode-tab", { hasText: "Solo" }).click();
await page.waitForTimeout(400);
await page.locator(".gold-corner").click();
await page.waitForTimeout(500);
const levels = await page.evaluate(() => ({
  count: document.querySelectorAll(".lvl-row").length,
  first: document.querySelector(".lvl-row .lvl-name")?.textContent,
  locked: document.querySelectorAll(".lvl-row.locked").length,
}));
console.log("MAP", JSON.stringify(levels));
await page.screenshot({ path: `${OUT}/03-map.png` });

// Start level 1
await page.locator(".lvl-row").first().click();
await page.waitForTimeout(3200); // transition + countdown
const foe = await page.evaluate(() => ({
  name: document.querySelector(".hp-card.bot .hp-name")?.textContent,
  hp: document.querySelector(".hp-card.bot .hp-value")?.textContent?.trim(),
  screen: document.querySelector(".battle-screen") ? "battle" : "other",
}));
console.log("BATTLE_START", JSON.stringify(foe));
await page.screenshot({ path: `${OUT}/04-battle.png` });

// Fight: cast Firebolt repeatedly, typing the shown incantation, until the
// result card appears
let cast = 0;
for (let i = 0; i < 12; i++) {
  const done = await page.evaluate(() => !!document.querySelector(".result-card"));
  if (done) break;
  await page.keyboard.press("1");
  await page.waitForTimeout(220);
  const text = await page.evaluate(() => document.querySelector(".code")?.textContent ?? "");
  if (!text) { await page.waitForTimeout(200); continue; }
  await page.keyboard.type(text, { delay: 6 });
  cast++;
  await page.waitForTimeout(450);
}
console.log("CASTS", cast);
await page.waitForTimeout(600);
const result = await page.evaluate(() => ({
  title: document.querySelector(".result-title")?.textContent,
  stars: document.querySelectorAll(".reward-star.on").length,
  gold: document.querySelector(".reward-earned")?.textContent,
  total: document.querySelector(".reward-total")?.textContent,
  hasNext: !!document.querySelector(".result-actions .btn-big"),
}));
console.log("RESULT", JSON.stringify(result));
await page.screenshot({ path: `${OUT}/05-finish.png` });

console.log("CONSOLE_ERRORS:", JSON.stringify(errors.filter((e) => !/429|404/.test(e)), null, 2));
await browser.close();
