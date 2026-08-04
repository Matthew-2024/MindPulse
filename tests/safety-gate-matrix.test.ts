import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

let canStartAction: typeof import("../src/domain/evaluate-state").canStartAction;
let evaluateState: typeof import("../src/domain/evaluate-state").evaluateState;

beforeAll(async () => {
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  const evaluator = await import("../src/domain/evaluate-state");
  canStartAction = evaluator.canStartAction;
  evaluateState = evaluator.evaluateState;
});

const normalRecords = [
  { mood: "calm", sleepHours: 7.2, steps: 7200, socialScore: 68 },
  { mood: "calm", sleepHours: 7.4, steps: 7600, socialScore: 70 },
  { mood: "happy", sleepHours: 7.5, steps: 7800, socialScore: 74 }
];

describe("Safety Gate three-state matrix", () => {
  it("keeps direct action contracts aligned across insufficient, normal, and high-risk states", () => {
    const insufficient = evaluateState([]);
    const normal = evaluateState(normalRecords);
    const highRisk = evaluateState([{ mood: "sad", note: "我很绝望，想从这个世界上消失" }]);

    expect(insufficient.risk.allowedActions).toEqual(["checkin"]);
    expect(canStartAction("companion", insufficient.risk)).toBe(false);
    expect(canStartAction("bottle", insufficient.risk)).toBe(false);
    expect(canStartAction("checkin", insufficient.risk)).toBe(true);
    expect(insufficient.risk.blockedActions).toEqual(expect.arrayContaining(["companion", "bottle"]));

    expect(normal.risk.mode).toBe("action");
    expect(canStartAction("companion", normal.risk)).toBe(true);
    expect(canStartAction("bottle", normal.risk)).toBe(true);

    expect(highRisk.risk.allowedActions).toEqual(["help"]);
    for (const action of ["breathe", "companion", "bottle", "self_check", "checkin"]) {
      expect(canStartAction(action, highRisk.risk)).toBe(false);
    }
    expect(canStartAction("help", highRisk.risk)).toBe(true);
  });

  it("reproduces the same state gates through real deep links", async () => {
    const edgeCandidates = [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ];
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || edgeCandidates.find((candidate) => existsSync(candidate));
    const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-gpu"] });
    const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const page = await context.newPage();
    const baseUrl = process.env.REACT_BASE_URL || "http://127.0.0.1:5180";

    async function resetBrowser() {
      await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        localStorage.clear();
        localStorage.setItem("mindpulseReactVaultCleared", "1");
        await new Promise((resolve) => {
          const request = indexedDB.deleteDatabase("mindpulse-local-vault");
          request.onsuccess = request.onerror = request.onblocked = () => resolve();
        });
      });
      await page.reload({ waitUntil: "networkidle" });
      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      await page.waitForSelector(".snapshot-panel");
    }

    try {
      await resetBrowser();
      for (const route of ["/companion", "/bottle"]) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => window.location.pathname === "/checkin");
        expect((await page.locator("body").innerText())).toContain("记录现在");
      }

      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      await page.getByRole("link", { name: "陪伴" }).click();
      await page.waitForFunction(() => window.location.pathname === "/checkin");
      expect((await page.locator("body").innerText())).toContain("先完成几次记录，再使用陪伴");

      await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "恢复演示数据" }).click();
      await page.waitForFunction(() => document.body.innerText.includes("示例记录"));
      await page.goto(`${baseUrl}/bottle`, { waitUntil: "networkidle" });
      await page.waitForSelector(".bottle-page");
      expect((await page.locator("body").innerText())).toContain("本机演示海域");

      await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
      await page.locator(".note-input").fill("我很绝望，想从这个世界上消失");
      await page.getByRole("button", { name: "保存并查看解释" }).click();
      await page.waitForURL(/\/help$/);
      for (const route of ["/companion", "/bottle"]) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => window.location.pathname === "/help");
        expect((await page.locator("body").innerText())).toContain("求助入口已打开");
      }
    } finally {
      await context.close();
      await browser.close();
    }
  }, 120000);
});
