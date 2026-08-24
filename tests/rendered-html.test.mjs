import assert from "node:assert/strict";
import test from "node:test";

const publicOrigin = "https://maker.example.com";
process.env.LETPOT_SITE_URL = publicOrigin;

async function render(path = "/") {
  const serverUrl = new URL("../dist/server/index.js", import.meta.url);
  serverUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(serverUrl.href);
  return handler(new Request(`http://localhost:3000${path}`, { headers: { accept: "text/html" } }));
}

test("reports production health", async () => {
  const response = await render("/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", service: "letpot-maker" });
});

test("renders the LetPot Maker homepage and searchable asset library", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  const initialHead = html.slice(0, html.indexOf("</head>"));
  assert.match(html, /<title>LetPot Maker — Customize &amp; print 3D garden accessories/i);
  assert.match(html, /<meta name="description" content="Explore 34 printable LetPot accessories/i);
  assert.match(html, new RegExp(`<link rel="canonical" href="${publicOrigin}">`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${publicOrigin}">`));
  assert.match(html, new RegExp(`<meta property="og:image" content="${publicOrigin}/og-maker\\.png">`));
  assert.match(html, /<meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">/i);
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/i);
  assert.match(html, /"@type":"WebSite"/);
  assert.match(html, /"@type":"SoftwareApplication"/);
  assert.match(html, /"price":0,"priceCurrency":"USD"/);
  assert.match(html, /Make your LetPot/);
  assert.match(html, /Open Maker Studio/);
  assert.match(html, /Loading 3D preview…/);
  assert.match(html, /BROWSE THE MAKER LIBRARY/);
  assert.match(html, /SEARCH THE LIBRARY/);
  assert.match(html, /THE MAKER ROADMAP/);
  assert.match(html, /Source code/);
  assert.doesNotMatch(html, /<meta name="keywords"/i);
  assert.doesNotMatch(initialHead, /model-factory|three\.module/i);
  assert.doesNotMatch(html, /3D Garden Lab|Garden Lab is growing/);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("renders the separate parametric Studio", async () => {
  const response = await render("/studio");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Maker Studio — LetPot Maker<\/title>/i);
  assert.match(html, new RegExp(`<link rel="canonical" href="${publicOrigin}/studio">`));
  assert.match(html, new RegExp(`<meta property="og:image" content="${publicOrigin}/og-maker\\.png">`));
  assert.match(html, /"@type":"SoftwareApplication"/);
  assert.match(html, /LetPot Maker Studio: customize and export printable 3D accessories/);
  assert.match(html, /Maker Library/);
  assert.match(html, /My Creations/);
  assert.match(html, /Little Sprout/);
  assert.match(html, /Festive Fir/);
  assert.match(html, /Sweet Basil/);
  assert.match(html, /Tomato Vine/);
  assert.match(html, /Realistic/);
  assert.match(html, /Veggie/);
  assert.match(html, /Christmas/);
  assert.match(html, /Jolly Santa/);
  assert.match(html, /Export all/);
  assert.match(html, /Bambu 3MF/);
  assert.match(html, /AI Generate/);
  assert.match(html, /Mobile Studio workspace/);
  assert.match(html, /Preview/);
  assert.match(html, /Library/);
  assert.match(html, /Adjust/);
  assert.match(html, /SIGNATURE/);
  assert.match(html, /Base &amp; fit/);
  assert.match(html, /fixed standard/);
  assert.match(html, /Ø33.*Ø41/);
  assert.doesNotMatch(html, /Lower seat diameter|Top cover diameter|Logo cover thickness/);
  assert.doesNotMatch(html, /Parametric workspace|Export selected|New design|Detachable by design/i);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("consolidates Studio model query variants onto one canonical URL", async () => {
  const response = await render("/studio?model=basil");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(`<link rel="canonical" href="${publicOrigin}/studio">`));
  assert.doesNotMatch(html, /rel="canonical"[^>]+\?model=/i);
});

test("renders the interactive Pod Styler", async () => {
  const response = await render("/pod-styler");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>LetPot Pod Styler — Preview printable 3D accessories<\/title>/i);
  assert.match(html, new RegExp(`<link rel="canonical" href="${publicOrigin}/pod-styler">`));
  assert.match(html, new RegExp(`<meta property="og:image" content="${publicOrigin}/og-maker\\.png">`));
  assert.match(html, /"@type":"SoftwareApplication"/);
  assert.match(html, /LetPot Pod Styler: preview printable accessories on your indoor garden/);
  assert.match(html, /Choose LetPot model/);
  assert.match(html, /LPH-MAX/);
  assert.match(html, /LPH-SE/);
  assert.match(html, /LPH-AIR/);
  assert.match(html, /LPH-MINI/);
  assert.match(html, /Character selection/);
  assert.match(html, /Choose a SE pod/);
  assert.match(html, /Pod 1, /);
  assert.match(html, /Filter characters by tag/);
  assert.match(html, /Shift \+ click pods to select several/);
  assert.match(html, /Try a mix/);
});

test("publishes crawler discovery and app identity endpoints", async () => {
  const robotsResponse = await render("/robots.txt");
  assert.equal(robotsResponse.status, 200);
  assert.match(robotsResponse.headers.get("content-type") ?? "", /^text\/plain\b/i);
  const robots = await robotsResponse.text();
  assert.match(robots, /User-Agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, new RegExp(`Sitemap: ${publicOrigin}/sitemap\\.xml`));

  const sitemapResponse = await render("/sitemap.xml");
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemapResponse.headers.get("content-type") ?? "", /application\/xml/i);
  const sitemap = await sitemapResponse.text();
  assert.deepEqual(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]),
    [`${publicOrigin}/`, `${publicOrigin}/studio`, `${publicOrigin}/pod-styler`],
  );

  const manifestResponse = await render("/manifest.webmanifest");
  assert.equal(manifestResponse.status, 200);
  assert.match(manifestResponse.headers.get("content-type") ?? "", /application\/manifest\+json/i);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.name, "LetPot Maker");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.icons[0].src, "/favicon.svg");
});

test("keeps unknown routes out of the index", async () => {
  const response = await render("/not-a-page");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /<meta name="robots" content="noindex"/i);
});
