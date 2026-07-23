import { chromium } from "playwright-core";
import fs from "node:fs";

const OUT = "C:/Users/aamir/AppData/Local/Temp/claude/c--Users-aamir-Coding-SpellCaster/0e07b317-7547-43cc-9d30-0279ca20bb3d/scratchpad/shots2";
fs.mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:5175/";
const errors = [];

const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 820 }, reducedMotion: "no-preference" });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

// Enter as guest
const enter = page.locator("button.enter-game, button.landing-enter").first();
await enter.click().catch(() => page.keyboard.press("Enter"));
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/01-menu.png` });

const snap = async (tag) => {
  const info = await page.evaluate(() => ({
    mode: document.querySelector(".mode-slide.selected .mode-slide-name")?.textContent,
    activeRow: document.querySelector(".nav-row.nav-active")?.className,
    diff: [...document.querySelectorAll(".diff-btn.selected")].map((b) => b.textContent.trim()),
    challenge: [...document.querySelectorAll(".content-btn.selected")].map((b) => b.textContent.trim()),
    screen: document.querySelector(".menu") ? "menu" : (document.querySelector(".countdown") ? "countdown" : "other"),
    hasDropdown: !!document.querySelector(".account-dropdown"),
    hasModal: !!document.querySelector(".account-modal"),
  }));
  console.log(tag, JSON.stringify(info));
  return info;
};
await snap("INITIAL");

// Arrow RIGHT twice on the modes row -> should advance modes
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(500);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(600);
await snap("AFTER_RIGHT_x2");
await page.screenshot({ path: `${OUT}/02-arrow-modes.png` });

// Arrow DOWN to next row, then RIGHT to change it
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(300);
await snap("AFTER_DOWN");
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
await snap("AFTER_DOWN_RIGHT");
await page.screenshot({ path: `${OUT}/03-arrow-row2.png` });

// Open the account dropdown
await page.locator(".account-trigger").click();
await page.waitForTimeout(300);
await snap("DROPDOWN_OPEN");
await page.screenshot({ path: `${OUT}/04-dropdown.png` });

// Enter while dropdown open must NOT start a game
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
await snap("ENTER_WITH_DROPDOWN");

// Reopen and click Stats
await page.locator(".account-trigger").click();
await page.waitForTimeout(250);
await page.locator(".account-item", { hasText: "Stats" }).click();
await page.waitForTimeout(400);
await snap("STATS_OPEN");
await page.screenshot({ path: `${OUT}/05-stats.png` });

// Close (Escape) then open Settings
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.locator(".account-trigger").click();
await page.waitForTimeout(200);
await page.locator(".account-item", { hasText: "Settings" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/06-settings.png` });
// toggle sound
await page.locator(".switch").first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/07-settings-toggled.png` });

// Close settings, then press Enter to start the game
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.keyboard.press("Enter");
await page.waitForTimeout(700);
await snap("AFTER_ENTER_START");
await page.screenshot({ path: `${OUT}/08-start.png` });

console.log("CONSOLE_ERRORS:", JSON.stringify(errors.filter((e) => !/429|404/.test(e)), null, 2));
await browser.close();
