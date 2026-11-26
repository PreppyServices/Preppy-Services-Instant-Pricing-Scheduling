import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { pricing } from "../data/buildings";
import { firstServicePrice } from "../lib/introPricing";

const regular = pricing["Gran Paraiso"].lines["01"];
const introPrice = firstServicePrice(regular);
const shots = "/opt/cursor/artifacts";

const bookings = new WeakMap<Page, string[]>();

test.beforeAll(() => {
  mkdirSync(shots, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  const hits: string[] = [];
  bookings.set(page, hits);
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("mode=book") || url.includes("/api/booking/jobber")) hits.push(url);
  });
});

test.afterEach(async ({ page }) => {
  expect(bookings.get(page) ?? [], "a test issued a booking request").toEqual([]);
});

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

test("no param keeps the landing flow and does not offer paint", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "landing");
  await expect(page.locator("[data-intro-pricing]")).toHaveAttribute("data-intro-pricing", "off");
  await expect(page.locator("[data-service-tile='glass']")).toBeVisible();
  await expect(page.locator("[data-service-tile='custom']")).toBeVisible();
  await expect(page.locator("[data-service-tile='storefront']")).toBeVisible();
  await expect(page.locator("[data-building-lock]")).toHaveCount(0);
  await expect(page.locator("[data-holiday-flyer]")).toHaveCount(0);
  await expect(page.getByText("Interior Paint")).toHaveCount(0);
  await expect(page.locator("[data-landing-mode]")).not.toContainText(/paint/i);

  const glass = await page.locator("[data-service-tile='glass']").boundingBox();
  const custom = await page.locator("[data-service-tile='custom']").boundingBox();
  const storefront = await page.locator("[data-service-tile='storefront']").boundingBox();
  expect(glass && custom && storefront).toBeTruthy();
  expect(Math.abs((glass?.y ?? 0) - (custom?.y ?? 1))).toBeLessThan(2);
  expect((glass?.x ?? 0) < (custom?.x ?? 0)).toBeTruthy();
  expect((glass?.width ?? 0) > 120).toBeTruthy();
  expect((storefront?.y ?? 0) > (glass?.y ?? 0)).toBeTruthy();
  expect((storefront?.width ?? 0) > (glass?.width ?? 0) + 40).toBeTruthy();
  const overflows = await page.locator("[data-service-tile]").evaluateAll((nodes) =>
    nodes.map((node) => node.scrollWidth > node.clientWidth + 1)
  );
  expect(overflows.every((hit) => hit === false)).toBeTruthy();

  const keywords = await page.locator('meta[name="keywords"]').getAttribute("content");
  expect(keywords?.toLowerCase() ?? "").not.toContain("paint");
  const html = await page.content();
  expect(html.toLowerCase()).not.toContain("paint");
  await shot(page, "phone-root");
});

test("?b=Gran Paraiso&intro=1 locks the building and shows 20%", async ({ page }) => {
  await page.goto("/?b=Gran%20Paraiso&intro=1");
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "line");
  await expect(page.locator("[data-building-lock='locked']")).toBeVisible();
  await expect(page.locator("[data-locked-building]")).toHaveText("Gran Paraiso");
  await expect(page.getByRole("button", { name: "Change building" })).toBeVisible();
  await expect(page.locator("[data-line-picker='line']")).toBeVisible();
  await expect(page.locator("[data-service-tiles]")).toHaveCount(0);
  await expect(page.locator("[data-holiday-flyer]")).toHaveCount(0);
  await expect(page.locator("[data-intro-pricing]")).toHaveAttribute("data-intro-pricing", "on");
  await expect(page.locator("[data-discount-banner]")).toContainText("20%");
  await expect(page.locator("[data-landing-mode]")).not.toContainText(/paint/i);

  await page.locator("[data-line-picker='line']").selectOption("01");
  await expect(page.locator("[data-pricing-mode]")).toHaveAttribute("data-pricing-mode", "intro");
  await expect(page.locator("[data-regular-price]")).toHaveAttribute("data-regular-price", String(regular));
  await expect(page.locator("[data-charged-price]")).toHaveAttribute(
    "data-charged-price",
    String(introPrice)
  );
  expect(introPrice).toBe(Math.round(regular * 0.8));
  await shot(page, "phone-gran-paraiso-intro");
});

test("?b=Gran Paraiso without intro shows the regular price", async ({ page }) => {
  await page.goto("/?b=Gran%20Paraiso");
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "line");
  await expect(page.locator("[data-locked-building]")).toHaveText("Gran Paraiso");
  await expect(page.locator("[data-line-picker='line']")).toBeVisible();
  await expect(page.locator("[data-intro-pricing]")).toHaveAttribute("data-intro-pricing", "off");
  await expect(page.locator("[data-discount-banner]")).toHaveCount(0);
  await expect(page.locator("[data-service-tiles]")).toHaveCount(0);
  await expect(page.locator("[data-holiday-flyer]")).toHaveCount(0);

  await page.locator("[data-line-picker='line']").selectOption("01");
  await expect(page.locator("[data-pricing-mode]")).toHaveAttribute("data-pricing-mode", "regular");
  await expect(page.locator("[data-charged-price]")).toHaveAttribute("data-charged-price", String(regular));
  await expect(page.locator("[data-regular-price]")).toHaveAttribute("data-regular-price", String(regular));
  await shot(page, "phone-gran-paraiso-regular");
});

test("unknown ?b= falls back to the landing flow", async ({ page }) => {
  await page.goto("/?b=Not%20A%20Real%20Building");
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "landing");
  await expect(page.locator("[data-building-lock]")).toHaveCount(0);
  await expect(page.locator("[data-service-tiles]")).toBeVisible();
  await expect(page.getByText("Building not verified yet")).toBeVisible();
  await expect(page.getByText("Not A Real Building")).toBeVisible();
  await expect(page.locator("[data-line-picker='line']")).toBeVisible();
  await expect(page.getByText("Interior Paint")).toHaveCount(0);
  await shot(page, "phone-unknown-building");
});

test("change building returns to the landing flow", async ({ page }) => {
  await page.goto("/?b=Gran%20Paraiso&intro=1");
  await page.getByRole("button", { name: "Change building" }).click();
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "landing");
  await expect(page.locator("[data-building-lock]")).toHaveCount(0);
  await expect(page.locator("[data-service-tiles]")).toBeVisible();
  await expect(page.locator("[data-holiday-flyer]")).toBeVisible();
  await expect(page.locator("[data-intro-pricing]")).toHaveAttribute("data-intro-pricing", "on");
  await shot(page, "phone-change-building");
});

test("?service=painting with a known building does not render paint", async ({ page }) => {
  await page.goto("/?service=painting&b=Gran%20Paraiso");
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "line");
  await expect(page.locator("[data-line-picker='line']")).toBeVisible();
  await expect(page.locator("[data-landing-mode]")).not.toContainText(/paint/i);
  await expect(page.getByText("Balcony Glass Detailing")).toHaveCount(0);
});

test("storefront, llms, sitemap, and the OG card do not mention paint", async ({ page }) => {
  await page.goto("/storefront");
  const keywords = await page.locator('meta[name="keywords"]').getAttribute("content");
  expect((keywords ?? "").toLowerCase()).not.toContain("paint");
  expect((await page.content()).toLowerCase()).not.toContain("paint");

  const llms = await page.request.get("/llms.txt");
  expect(llms.ok()).toBeTruthy();
  expect((await llms.text()).toLowerCase()).not.toContain("paint");

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect((await sitemap.text()).toLowerCase()).not.toContain("paint");

  const og = await page.request.get("/og/preppy");
  expect(og.ok()).toBeTruthy();
  expect(og.headers()["content-type"] ?? "").toContain("image/png");

  const ogUrl = new URL("/og/preppy", page.url()).toString();
  await page.setContent(
    `<body style="margin:0;background:#0b1a24"><img alt="Preppy link preview" src="${ogUrl}" style="width:390px;height:auto;display:block" /></body>`
  );
  const preview = page.locator("img");
  await preview.waitFor({ state: "visible" });
  await preview.screenshot({ path: `${shots}/phone-og-card.png` });
});
