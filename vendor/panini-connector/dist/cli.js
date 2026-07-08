#!/usr/bin/env node

// src/verify.ts
import { createHmac, timingSafeEqual } from "crypto";
function computeSignature(secret, timestamp, rawBody) {
  const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf-8") : Buffer.from(rawBody);
  const mac = createHmac("sha256", secret);
  mac.update(`${timestamp}.`, "utf-8");
  mac.update(body);
  return "sha256=" + mac.digest("hex");
}

// src/cli.ts
var VERSION = "0.1.0";
function envelope(op, extra = {}) {
  return {
    op,
    version: "1",
    request_id: cryptoRandomId(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...extra
  };
}
function cryptoRandomId() {
  try {
    return globalThis.crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}
async function post(url, secret, payload) {
  const raw = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1e3).toString();
  const sig = computeSignature(secret, ts, raw);
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Compass-Timestamp": ts,
      "X-Compass-Signature": sig,
      "X-Compass-Version": "1",
      "X-Compass-Request-Id": String(payload.request_id ?? ""),
      "User-Agent": `panini-connector-js/${VERSION} (cli)`
    },
    body: raw
  });
  let body;
  const text = await r.text();
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 400) };
  }
  return { status: r.status, body };
}
function ok(response, op) {
  if ((response.status === 200 || response.status === 201) && response.body.ok !== false) {
    return true;
  }
  if (response.status === 200 && response.body.ok === false) {
    console.log(
      `  \u2717 ${op.padEnd(12)} \u2192 200 but body {ok: false}: ${JSON.stringify(response.body.error ?? "")}`
    );
    return false;
  }
  console.log(`  \u2717 ${op.padEnd(12)} \u2192 HTTP ${response.status}: ${JSON.stringify(response.body)}`);
  return false;
}
async function runTest(url, secret) {
  console.log(`Testing connector at ${url}...`);
  let r = await post(url, secret, envelope("ping"));
  if (!ok(r, "ping")) return 1;
  const siteName = r.body.site_name ?? "(unnamed)";
  console.log(`  \u2713 ping        \u2192 200 OK  site_name=${JSON.stringify(siteName)}`);
  const demo = {
    title: "Panini connector smoke test",
    slug: "panini-smoke-test",
    body_html: "<p>If you can read this in your DB, the connector works.</p>",
    excerpt: "Panini connector smoke test post \u2014 safe to delete.",
    categories: ["test"],
    tags: ["panini", "connector"],
    featured_image_url: "",
    author_name: "Panini",
    seo_meta: { title: "Smoke test", description: "Delete me." },
    json_ld: [],
    status: "publish"
  };
  r = await post(url, secret, envelope("create_post", { post: demo }));
  if (!ok(r, "create_post")) return 1;
  const extId = String(r.body.external_id ?? "");
  const extUrl = String(r.body.external_url ?? "");
  console.log(
    `  \u2713 create_post \u2192 200 OK  external_id=${JSON.stringify(extId)}` + (extUrl ? `  url=${extUrl}` : "")
  );
  const demoUpdated = { ...demo, title: demo.title + " (updated)" };
  r = await post(url, secret, envelope("update_post", { post: demoUpdated, external_id: extId }));
  if (!ok(r, "update_post")) return 1;
  console.log(`  \u2713 update_post \u2192 200 OK  external_id=${JSON.stringify(extId)}`);
  r = await post(url, secret, envelope("delete_post", { external_id: extId }));
  if (!ok(r, "delete_post")) return 1;
  console.log(`  \u2713 delete_post \u2192 200 OK  external_id=${JSON.stringify(extId)}`);
  console.log("\nAll ops working. Your connector is wired correctly.");
  return 0;
}
function usage() {
  console.log(`panini-connector \u2014 CLI smoke test for a deployed connector

Usage:
  panini-connector test --url <URL> --secret <SECRET>

Options:
  --url <URL>       Connector URL, e.g. https://example.com/api/seo-connector
  --secret <SECRET> Shared HMAC secret (same as SEO_CONNECTOR_SECRET on the server)
  --help            Show this message
`);
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    process.exit(args.length === 0 ? 1 : 0);
  }
  const cmd = args[0];
  if (cmd !== "test") {
    console.error(`unknown command: ${cmd}`);
    usage();
    process.exit(1);
  }
  let url = "";
  let secret = "";
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--url") url = args[++i] ?? "";
    else if (args[i] === "--secret") secret = args[++i] ?? "";
  }
  if (!url || !secret) {
    console.error("Missing --url or --secret");
    usage();
    process.exit(1);
  }
  const rc = await runTest(url, secret);
  process.exit(rc);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
