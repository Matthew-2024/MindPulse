import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl = process.env.REACT_BASE_URL || "http://127.0.0.1:5180";
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.keyboard.press("Tab");
assertCondition(await page.evaluate(() => document.activeElement?.classList.contains("skip-link")), "keyboard focus should reach the skip link first");
await page.keyboard.press("Enter");
assertCondition(await page.evaluate(() => document.activeElement?.id === "main-content"), "skip link should move focus to main content");
assertCondition(await page.locator(".app-frame.phone-app.home-frame").count() === 1, "home should keep its phone app frame");
assertCondition(await page.locator(".route-transition").count() === 1, "home should render its content inside the route transition layer");
const homeTransition = await page.locator(".route-transition").evaluate((element) => {
  const style = getComputedStyle(element);
  return { animationName: style.animationName, animationDuration: style.animationDuration };
});
assertCondition(homeTransition.animationName === "route-enter", `home should use the route enter animation (${JSON.stringify(homeTransition)})`);
assertCondition(parseFloat(homeTransition.animationDuration) > 0, `home route animation should have a visible duration (${JSON.stringify(homeTransition)})`);
const homeLayout = await page.evaluate(() => {
  const main = document.querySelector(".page-shell-home");
  const nav = document.querySelector(".bottom-nav");
  const navRect = nav?.getBoundingClientRect();
  const mainRect = main?.getBoundingClientRect();
  return {
    navPosition: nav ? getComputedStyle(nav).position : "missing",
    mainOverflowY: main ? getComputedStyle(main).overflowY : "missing",
    navAtMainEnd: Boolean(navRect && mainRect && Math.abs(navRect.top - mainRect.bottom) <= 1)
  };
});
assertCondition(homeLayout.navPosition === "relative", "home navigation should occupy its own shell row");
assertCondition(homeLayout.mainOverflowY === "auto", "home content should scroll inside the shell");
assertCondition(homeLayout.navAtMainEnd, "home navigation should not overlap the content row");

await page.locator('.bottom-nav a[href="/reports"]').click();
await page.waitForURL(/\/reports$/);
assertCondition(await page.evaluate(() => document.activeElement?.id === "main-content"), "client-side route changes should move focus to main content");

for (const route of ["/checkin", "/insight", "/companion", "/help", "/reports", "/settings", "/rules", "/bottle"]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => {
    const frame = document.querySelector(".app-frame");
    const nav = document.querySelector(".bottom-nav");
    const main = document.querySelector(".page-shell");
    const surface = document.querySelector(".snapshot-panel, .section-block, .settings-section, .form-section, .companion-card, .safety-gate, .support-banner, .composer-panel, .bottle-panel");
    const navRect = nav?.getBoundingClientRect();
    const mainRect = main?.getBoundingClientRect();
    const backLink = document.querySelector(".page-intro .back-link");
    const eyebrow = document.querySelector(".page-intro > div > .eyebrow");
    const backLinkRect = backLink?.getBoundingClientRect();
    const eyebrowRect = eyebrow?.getBoundingClientRect();
    return {
      secondaryFrame: Boolean(frame?.classList.contains("secondary-frame")),
      background: frame ? getComputedStyle(frame).backgroundColor : "",
      navWidth: nav ? Math.round(nav.getBoundingClientRect().width) : 0,
      navPosition: nav ? getComputedStyle(nav).position : "missing",
      mainOverflowY: main ? getComputedStyle(main).overflowY : "missing",
      navAtMainEnd: Boolean(navRect && mainRect && Math.abs(navRect.top - mainRect.bottom) <= 1),
      borderRadius: surface ? parseFloat(getComputedStyle(surface).borderRadius) : 0,
      scrollbarWidth: main ? getComputedStyle(main).scrollbarWidth : "auto",
      webkitScrollbarDisplay: main ? getComputedStyle(main, "::-webkit-scrollbar").display : "inline",
      introMetaSeparated: !backLinkRect || !eyebrowRect || eyebrowRect.top >= backLinkRect.bottom + 6,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  });
  assertCondition(metrics.secondaryFrame, `${route} should use the shared secondary app frame`);
  assertCondition(metrics.background === "rgb(237, 246, 242)", `${route} should use the shared app background`);
  assertCondition(metrics.navWidth <= 488, `${route} should use the centered phone navigation`);
  assertCondition(metrics.navPosition === "relative", `${route} navigation should occupy its own shell row`);
  assertCondition(metrics.mainOverflowY === "auto", `${route} content should scroll inside the shell`);
  assertCondition(metrics.navAtMainEnd, `${route} navigation should not overlap the page content`);
  assertCondition(metrics.borderRadius >= 16, `${route} should keep the shared rounded surface treatment (${JSON.stringify(metrics)})`);
  assertCondition(metrics.scrollbarWidth === "none", `${route} should hide the phone content scrollbar (${JSON.stringify(metrics)})`);
  assertCondition(metrics.webkitScrollbarDisplay === "none", `${route} should hide the WebKit phone scrollbar (${JSON.stringify(metrics)})`);
  assertCondition(metrics.introMetaSeparated, `${route} should place its back link and eyebrow on separate rows (${JSON.stringify(metrics)})`);
  assertCondition(!metrics.overflow, `${route} should not overflow horizontally`);
}

await page.setViewportSize({ width: 1901, height: 871 });
await page.goto(`${baseUrl}/reports`, { waitUntil: "networkidle" });
const wideLayout = await page.evaluate(() => {
  const frame = document.querySelector(".app-frame");
  const main = document.querySelector(".page-shell");
  const nav = document.querySelector(".bottom-nav");
  const frameRect = frame?.getBoundingClientRect();
  const mainRect = main?.getBoundingClientRect();
  const navRect = nav?.getBoundingClientRect();
  return {
    frameWidth: frameRect ? Math.round(frameRect.width) : 0,
    mainWidth: mainRect ? Math.round(mainRect.width) : 0,
    navCenter: navRect ? navRect.left + navRect.width / 2 : 0,
    viewportCenter: window.innerWidth / 2,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1
  };
});
assertCondition(wideLayout.frameWidth === 487, `wide desktop should keep the 487px phone canvas (${JSON.stringify(wideLayout)})`);
assertCondition(wideLayout.mainWidth === 487, `wide desktop should use the full phone content width (${JSON.stringify(wideLayout)})`);
assertCondition(Math.abs(wideLayout.navCenter - wideLayout.viewportCenter) <= 1, `wide desktop navigation should be centered (${JSON.stringify(wideLayout)})`);
assertCondition(!wideLayout.overflow, "wide desktop should not overflow horizontally");

await page.setViewportSize({ width: 487, height: 872 });
await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
const scrollBehavior = await page.evaluate(() => {
  const main = document.querySelector(".page-shell");
  if (!main) return { scrollable: false, moved: false };
  const start = main.scrollTop;
  main.scrollTop = 180;
  return { scrollable: main.scrollHeight > main.clientHeight, moved: main.scrollTop > start };
});
assertCondition(scrollBehavior.scrollable && scrollBehavior.moved, `hiding the scrollbar should preserve content scrolling (${JSON.stringify(scrollBehavior)})`);

await browser.close();
console.log("React shell style smoke passed: shared frame, background, navigation, surfaces, and overflow.");
