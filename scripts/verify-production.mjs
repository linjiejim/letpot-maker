import assert from "node:assert/strict";

const siteUrl = process.env.LETPOT_SITE_URL;

assert.ok(siteUrl, "LETPOT_SITE_URL is required");
assert.match(siteUrl, /^https:\/\/[^/]+$/, "LETPOT_SITE_URL must be an HTTPS origin without a path");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(pathname, options = {}) {
  const url = new URL(pathname, siteUrl);
  let lastError;

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok || options.redirect === "manual") {
        return response;
      }

      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < 10) {
      await delay(2_000);
    }
  }

  throw lastError;
}

const healthResponse = await fetchWithRetry("/api/health");
const health = await healthResponse.json();
assert.deepEqual(health, { status: "ok", service: "letpot-maker" });

const homeResponse = await fetchWithRetry("/");
const home = await homeResponse.text();
assert.match(home, /<title>LetPot Maker/);
assert.ok(home.includes(`<link rel="canonical" href="${siteUrl}"`), "home canonical URL is incorrect");
assert.ok(home.includes('<script type="application/ld+json"'), "home JSON-LD is missing");
assert.match(home, /<h1[ >]/, "home H1 is missing");

const robotsResponse = await fetchWithRetry("/robots.txt");
const robots = await robotsResponse.text();
assert.ok(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), "robots sitemap URL is incorrect");

const sitemapResponse = await fetchWithRetry("/sitemap.xml");
const sitemap = await sitemapResponse.text();
for (const pathname of ["/", "/studio", "/pod-styler"]) {
  assert.ok(sitemap.includes(`<loc>${siteUrl}${pathname}</loc>`), `sitemap is missing ${pathname}`);
}

const manifestResponse = await fetchWithRetry("/manifest.webmanifest");
const manifest = await manifestResponse.json();
assert.equal(manifest.name, "LetPot Maker");

const httpUrl = new URL(siteUrl);
httpUrl.protocol = "http:";
const redirectResponse = await fetchWithRetry(httpUrl, {
  redirect: "manual",
});
assert.ok([301, 302, 307, 308].includes(redirectResponse.status), "HTTP origin does not redirect to HTTPS");
assert.equal(redirectResponse.headers.get("location"), `${siteUrl}/`);

console.log(JSON.stringify({
  status: "ok",
  siteUrl,
  checks: ["health", "home SEO", "robots", "sitemap", "manifest", "HTTPS redirect"],
}));
