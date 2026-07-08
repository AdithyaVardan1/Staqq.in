"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/framework/nextPagesRouter.ts
var nextPagesRouter_exports = {};
__export(nextPagesRouter_exports, {
  createHandler: () => createHandler
});
module.exports = __toCommonJS(nextPagesRouter_exports);

// src/envelope.ts
var SUPPORTED_VERSION = "1";
var VALID_OPS = ["ping", "create_post", "update_post", "delete_post"];
var EnvelopeError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "EnvelopeError";
  }
};
function parseEnvelope(rawBody) {
  const bodyStr = typeof rawBody === "string" ? rawBody : new TextDecoder("utf-8", { fatal: true }).decode(rawBody);
  let data;
  try {
    data = JSON.parse(bodyStr);
  } catch (e) {
    throw new EnvelopeError(`body is not valid JSON: ${e.message}`);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new EnvelopeError("envelope must be a JSON object");
  }
  const d = data;
  const op = d.op;
  if (!op || !VALID_OPS.includes(op)) {
    throw new EnvelopeError(
      `unknown op ${JSON.stringify(op)}; must be one of ${JSON.stringify(VALID_OPS)}`
    );
  }
  const version = d.version;
  if (version && version !== SUPPORTED_VERSION) {
    throw new EnvelopeError(
      `envelope version ${JSON.stringify(version)} not supported by SDK (expected ${JSON.stringify(SUPPORTED_VERSION)}); upgrade panini-connector`
    );
  }
  const post = d.post;
  if ((op === "create_post" || op === "update_post") && (typeof post !== "object" || post === null)) {
    throw new EnvelopeError(`${op} requires a 'post' object`);
  }
  const externalId = d.external_id ?? "";
  if (op === "delete_post" && !externalId) {
    throw new EnvelopeError(`delete_post requires 'external_id'`);
  }
  return {
    op,
    version: version ?? SUPPORTED_VERSION,
    request_id: d.request_id ?? "",
    timestamp: d.timestamp ?? "",
    post: post ?? {},
    external_id: externalId
  };
}
function normalizePost(post) {
  return {
    title: String(post.title ?? "").trim(),
    slug: String(post.slug ?? "").trim(),
    body_html: String(post.body_html ?? ""),
    excerpt: String(post.excerpt ?? ""),
    categories: Array.isArray(post.categories) ? post.categories : [],
    tags: Array.isArray(post.tags) ? post.tags : [],
    featured_image_url: String(post.featured_image_url ?? ""),
    author_name: String(post.author_name ?? ""),
    seo_meta: post.seo_meta && typeof post.seo_meta === "object" ? post.seo_meta : {},
    json_ld: Array.isArray(post.json_ld) ? post.json_ld : [],
    status: String(post.status ?? "publish")
  };
}

// src/dispatch.ts
var isNotFound = (e) => !!e && typeof e === "object" && e.code === "NOT_FOUND";
async function dispatch(envelope, storage, opts = {}) {
  const { onPostChange } = opts;
  if (envelope.op === "ping") {
    const meta = await storage.ping();
    return { ok: true, ...meta };
  }
  if (envelope.op === "create_post") {
    const post = normalizePost(envelope.post);
    const result = await storage.create_post(post);
    await fireCallback(onPostChange, "create_post", { ...post, ...result });
    return { ok: true, ...result };
  }
  if (envelope.op === "update_post") {
    const post = normalizePost(envelope.post);
    const result = await storage.update_post(envelope.external_id, post);
    await fireCallback(onPostChange, "update_post", { ...post, ...result });
    return { ok: true, ...result };
  }
  if (envelope.op === "delete_post") {
    await storage.delete_post(envelope.external_id);
    await fireCallback(onPostChange, "delete_post", {
      external_id: envelope.external_id
    });
    return { ok: true, external_id: envelope.external_id };
  }
  return { ok: false, error: `unhandled op ${envelope.op}` };
}
async function fireCallback(cb, op, payload) {
  if (!cb) return;
  try {
    const result = cb(op, payload);
    if (result && typeof result.then === "function") {
      await result;
    }
  } catch (e) {
    console.error(`[panini-connector] on_post_change callback failed for ${op}:`, e);
  }
}

// src/verify.ts
var import_node_crypto = require("crypto");
var REPLAY_WINDOW_SECONDS = 300;
var VerificationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "VerificationError";
  }
};
function computeSignature(secret, timestamp, rawBody) {
  const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf-8") : Buffer.from(rawBody);
  const mac = (0, import_node_crypto.createHmac)("sha256", secret);
  mac.update(`${timestamp}.`, "utf-8");
  mac.update(body);
  return "sha256=" + mac.digest("hex");
}
function verify(args) {
  const {
    secret,
    timestamp,
    signature,
    rawBody,
    replayWindowSeconds = REPLAY_WINDOW_SECONDS,
    _now
  } = args;
  if (!secret) throw new VerificationError("secret is empty");
  if (!timestamp) throw new VerificationError("missing X-Compass-Timestamp");
  if (!signature) throw new VerificationError("missing X-Compass-Signature");
  if (!signature.startsWith("sha256=")) {
    throw new VerificationError("signature scheme not sha256");
  }
  const ts = Number.parseInt(timestamp, 10);
  if (Number.isNaN(ts)) {
    throw new VerificationError("timestamp not an integer");
  }
  const now = _now ?? Math.floor(Date.now() / 1e3);
  if (Math.abs(now - ts) > replayWindowSeconds) {
    throw new VerificationError(
      `timestamp ${ts} outside replay window (now=${now})`
    );
  }
  const expected = computeSignature(secret, timestamp, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !(0, import_node_crypto.timingSafeEqual)(a, b)) {
    throw new VerificationError("signature mismatch");
  }
}

// src/framework/nextPagesRouter.ts
function createHandler(opts) {
  const secretEnv = opts.secretEnv ?? "SEO_CONNECTOR_SECRET";
  const secret = opts.secret ?? process.env[secretEnv] ?? "";
  if (!secret) {
    throw new Error(
      `panini-connector: no secret configured. Pass secret= or set env ${secretEnv}.`
    );
  }
  const replayWindow = opts.replayWindowSeconds ?? 300;
  return async function handler(req, res) {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "method not allowed" });
      return;
    }
    const ts = pickHeader(req.headers["x-compass-timestamp"]);
    const sig = pickHeader(req.headers["x-compass-signature"]);
    let rawBody;
    try {
      rawBody = await readRawBody(req);
    } catch (e) {
      writeJson(res, 400, { ok: false, error: "failed to read request body" });
      return;
    }
    try {
      verify({ secret, timestamp: ts, signature: sig, rawBody, replayWindowSeconds: replayWindow });
    } catch (e) {
      if (e instanceof VerificationError) {
        writeJson(res, 401, { ok: false, error: "signature verification failed" });
        return;
      }
      throw e;
    }
    let envelope;
    try {
      envelope = parseEnvelope(rawBody);
    } catch (e) {
      if (e instanceof EnvelopeError) {
        writeJson(res, 400, { ok: false, error: `bad envelope: ${e.message}` });
        return;
      }
      throw e;
    }
    try {
      const result = await dispatch(envelope, opts.storage, { onPostChange: opts.onPostChange });
      writeJson(res, 200, result);
    } catch (e) {
      if (isNotFound(e)) {
        writeJson(res, 404, { ok: false, error: e.message });
        return;
      }
      console.error("[panini-connector] dispatch failed:", e);
      writeJson(res, 500, { ok: false, error: `internal: ${e.name || "Error"}` });
    }
  };
}
function pickHeader(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? null;
  return null;
}
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}
function writeJson(res, status, body) {
  res.setHeader("Content-Type", "application/json");
  res.status(status).send(JSON.stringify(body));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createHandler
});
