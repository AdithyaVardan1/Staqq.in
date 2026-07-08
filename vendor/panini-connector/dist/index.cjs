"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/storage/memory.ts
var memory_exports = {};
__export(memory_exports, {
  MemoryStorage: () => MemoryStorage
});
var import_node_crypto2, MemoryStorage;
var init_memory = __esm({
  "src/storage/memory.ts"() {
    "use strict";
    import_node_crypto2 = require("crypto");
    MemoryStorage = class {
      posts = /* @__PURE__ */ new Map();
      siteName;
      baseUrl;
      constructor(opts = {}) {
        this.siteName = opts.site_name ?? "In-memory connector";
        this.baseUrl = (opts.base_url ?? "").replace(/\/$/, "");
      }
      async ping() {
        return {
          site_name: this.siteName,
          version: "0.1.0",
          supported_ops: ["ping", "create_post", "update_post", "delete_post"],
          post_count: this.posts.size
        };
      }
      async create_post(post) {
        const ext = "mem_" + (0, import_node_crypto2.randomBytes)(6).toString("hex");
        this.posts.set(ext, { ...post });
        return { external_id: ext, external_url: this.externalUrl(post.slug) };
      }
      async update_post(externalId, post) {
        const existing = this.posts.get(externalId);
        if (!existing) {
          const e = new Error(`no post with external_id=${externalId}`);
          e.code = "NOT_FOUND";
          throw e;
        }
        const merged = { ...existing };
        const mergedRec = merged;
        for (const [k, v] of Object.entries(post)) {
          if (v !== void 0 && v !== null && v !== "") {
            mergedRec[k] = v;
          }
        }
        this.posts.set(externalId, merged);
        return { external_id: externalId, external_url: this.externalUrl(merged.slug) };
      }
      async delete_post(externalId) {
        this.posts.delete(externalId);
      }
      externalUrl(slug) {
        if (!slug || !this.baseUrl) return "";
        return `${this.baseUrl}/${slug.replace(/^\//, "")}`;
      }
      /** Test helper — returns stored post by id or undefined. */
      _get(externalId) {
        return this.posts.get(externalId);
      }
      /** Test helper — snapshot of the store. */
      _all() {
        return Object.fromEntries(this.posts);
      }
    };
  }
});

// src/storage/supabase.ts
var supabase_exports = {};
__export(supabase_exports, {
  SupabaseStorage: () => SupabaseStorage
});
function safeIdent(name) {
  const safe = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (!safe) throw new Error(`invalid identifier ${JSON.stringify(name)}`);
  return safe;
}
var import_node_crypto3, SupabaseStorage;
var init_supabase = __esm({
  "src/storage/supabase.ts"() {
    "use strict";
    import_node_crypto3 = require("crypto");
    SupabaseStorage = class {
      url;
      key;
      table;
      siteName;
      baseUrl;
      toRow;
      externalIdColumn;
      sdkGeneratesId;
      externalUrlTemplate;
      constructor(opts = {}) {
        const urlEnv = opts.url_env ?? "SUPABASE_URL";
        const keyEnv = opts.key_env ?? "SUPABASE_SERVICE_ROLE_KEY";
        this.url = (opts.url ?? process.env[urlEnv] ?? "").replace(/\/$/, "");
        this.key = opts.service_role_key ?? process.env[keyEnv] ?? "";
        if (!this.url || !this.key) {
          throw new Error(
            `SupabaseStorage: missing credentials. Set ${urlEnv} + ${keyEnv} or pass url= + service_role_key=`
          );
        }
        this.table = safeIdent(opts.table ?? "panini_posts");
        this.siteName = opts.site_name || "Supabase connector";
        this.baseUrl = (opts.base_url ?? "").replace(/\/$/, "");
        this.toRow = opts.toRow ?? ((post) => ({ ...post }));
        this.externalIdColumn = safeIdent(opts.externalIdColumn ?? "external_id");
        this.sdkGeneratesId = this.externalIdColumn === "external_id" && !opts.externalIdColumn;
        if (opts.externalIdColumn && opts.externalIdColumn !== "external_id") {
          this.sdkGeneratesId = false;
        }
        this.externalUrlTemplate = opts.externalUrlTemplate ?? "";
      }
      get headers() {
        return {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        };
      }
      async ping() {
        try {
          const r = await fetch(`${this.url}/rest/v1/${this.table}?limit=0`, {
            method: "GET",
            headers: this.headers
          });
          if (r.status >= 400) {
            const err = (await r.text()).slice(0, 200);
            return { site_name: this.siteName, db_ok: false, error: err };
          }
        } catch (e) {
          return { site_name: this.siteName, db_ok: false, error: String(e).slice(0, 200) };
        }
        return {
          site_name: this.siteName,
          version: "0.1.0",
          db_ok: true,
          supported_ops: ["ping", "create_post", "update_post", "delete_post"]
        };
      }
      async create_post(post) {
        const row = this.toRow(post);
        let sdkGeneratedId = "";
        if (this.sdkGeneratesId) {
          sdkGeneratedId = "sb_" + (0, import_node_crypto3.randomBytes)(6).toString("hex");
          row[this.externalIdColumn] = sdkGeneratedId;
        }
        const r = await fetch(
          `${this.url}/rest/v1/${this.table}?select=*`,
          { method: "POST", headers: this.headers, body: JSON.stringify(row) }
        );
        if (r.status >= 400) {
          throw new Error(`Supabase insert failed HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        }
        const inserted = await r.json();
        if (!inserted || inserted.length === 0) {
          throw new Error("Supabase insert returned no row (RLS blocking? add returning=* policy)");
        }
        const externalId = this.sdkGeneratesId ? sdkGeneratedId : String(inserted[0][this.externalIdColumn] ?? "");
        if (!externalId) {
          throw new Error(
            `Supabase insert succeeded but column ${JSON.stringify(this.externalIdColumn)} was empty \u2014 check your table schema or externalIdColumn config.`
          );
        }
        return {
          external_id: externalId,
          external_url: this.buildUrl(post, externalId)
        };
      }
      async update_post(externalId, post) {
        const row = this.toRow(post);
        delete row[this.externalIdColumn];
        const r = await fetch(
          `${this.url}/rest/v1/${this.table}?${this.externalIdColumn}=eq.${encodeURIComponent(externalId)}`,
          { method: "PATCH", headers: this.headers, body: JSON.stringify(row) }
        );
        if (r.status >= 400) {
          throw new Error(`Supabase update failed HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        }
        const rows = await r.json();
        if (!rows || rows.length === 0) {
          const e = new Error(`no post with ${this.externalIdColumn}=${externalId}`);
          e.code = "NOT_FOUND";
          throw e;
        }
        return {
          external_id: externalId,
          external_url: this.buildUrl(post, externalId)
        };
      }
      async delete_post(externalId) {
        const r = await fetch(
          `${this.url}/rest/v1/${this.table}?${this.externalIdColumn}=eq.${encodeURIComponent(externalId)}`,
          { method: "DELETE", headers: this.headers }
        );
        if (r.status >= 400) {
          throw new Error(`Supabase delete failed HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        }
      }
      /** Substitute {slug}/{id}/{title} in externalUrlTemplate. Falls back
       *  to legacy base_url + slug for backwards compat. */
      buildUrl(post, externalId) {
        if (this.externalUrlTemplate) {
          return this.externalUrlTemplate.replace(/\{slug\}/g, post.slug || "").replace(/\{id\}/g, externalId).replace(/\{title\}/g, encodeURIComponent(post.title || ""));
        }
        if (this.baseUrl && post.slug) {
          return `${this.baseUrl}/${post.slug.replace(/^\//, "")}`;
        }
        return "";
      }
    };
  }
});

// src/storage/postgres.ts
var postgres_exports = {};
__export(postgres_exports, {
  PostgresStorage: () => PostgresStorage
});
function coerceForPg(v) {
  if (v === void 0) return null;
  if (v === null) return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    return JSON.stringify(v);
  }
  return v;
}
function safeIdent2(name) {
  const safe = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (!safe) throw new Error(`invalid identifier ${JSON.stringify(name)}`);
  return safe;
}
var import_node_crypto4, CREATE_TABLE_SQL, PostgresStorage;
var init_postgres = __esm({
  "src/storage/postgres.ts"() {
    "use strict";
    import_node_crypto4 = require("crypto");
    CREATE_TABLE_SQL = (table) => `
CREATE TABLE IF NOT EXISTS ${table} (
    external_id  text PRIMARY KEY,
    title        text NOT NULL,
    slug         text NOT NULL,
    body_html    text NOT NULL,
    excerpt      text,
    categories   jsonb,
    tags         jsonb,
    featured_image_url text,
    author_name  text,
    seo_meta     jsonb,
    json_ld      jsonb,
    status       text NOT NULL DEFAULT 'publish',
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ${table}_slug_idx ON ${table}(slug);
CREATE INDEX IF NOT EXISTS ${table}_created_at_idx ON ${table}(created_at DESC);
`.trim();
    PostgresStorage = class {
      dsn;
      table;
      siteName;
      baseUrl;
      tableReady;
      poolPromise = null;
      toRow;
      externalIdColumn;
      sdkGeneratesId;
      externalUrlTemplate;
      customMode;
      constructor(opts = {}) {
        const dsnEnv = opts.dsn_env ?? "DATABASE_URL";
        this.dsn = opts.dsn ?? process.env[dsnEnv] ?? "";
        if (!this.dsn) {
          throw new Error(
            `PostgresStorage: missing DSN. Set env ${dsnEnv} or pass dsn=`
          );
        }
        this.table = safeIdent2(opts.table ?? "panini_posts");
        this.siteName = opts.site_name || "Postgres connector";
        this.baseUrl = (opts.base_url ?? "").replace(/\/$/, "");
        this.toRow = opts.toRow ?? ((post) => ({ ...post }));
        this.externalIdColumn = safeIdent2(opts.externalIdColumn ?? "external_id");
        this.sdkGeneratesId = !opts.externalIdColumn || opts.externalIdColumn === "external_id";
        this.externalUrlTemplate = opts.externalUrlTemplate ?? "";
        this.customMode = !!(opts.toRow || opts.externalIdColumn);
        this.tableReady = opts.auto_create_table === false || this.customMode;
      }
      async getPool() {
        if (this.poolPromise) return this.poolPromise;
        this.poolPromise = (async () => {
          let pgModule;
          try {
            pgModule = await import("pg");
          } catch (e) {
            throw new Error("pg is not installed. Run: npm install pg");
          }
          const pool = new pgModule.Pool({ connectionString: this.dsn });
          return pool;
        })();
        return this.poolPromise;
      }
      async ensureTable() {
        if (this.tableReady) return;
        const pool = await this.getPool();
        await pool.query(CREATE_TABLE_SQL(this.table));
        this.tableReady = true;
      }
      async ping() {
        try {
          const pool = await this.getPool();
          const r = await pool.query("SELECT 1 AS ok");
          const dbOk = r.rows[0]?.ok === 1 || r.rows[0]?.ok === true;
          return {
            site_name: this.siteName,
            version: "0.1.0",
            db_ok: dbOk,
            supported_ops: ["ping", "create_post", "update_post", "delete_post"]
          };
        } catch (e) {
          return {
            site_name: this.siteName,
            db_ok: false,
            error: String(e).slice(0, 200)
          };
        }
      }
      async create_post(post) {
        await this.ensureTable();
        const row = this.toRow(post);
        let sdkGeneratedId = "";
        if (this.sdkGeneratesId) {
          sdkGeneratedId = "pg_" + (0, import_node_crypto4.randomBytes)(6).toString("hex");
          row[this.externalIdColumn] = sdkGeneratedId;
        }
        const cols = Object.keys(row).map(safeIdent2);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const vals = Object.values(row).map(coerceForPg);
        const returningCol = safeIdent2(this.externalIdColumn);
        const sql = `INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING ${returningCol}`;
        const pool = await this.getPool();
        const r = await pool.query(sql, vals);
        if (r.rows.length === 0) {
          throw new Error("Postgres insert returned no row");
        }
        const externalId = this.sdkGeneratesId ? sdkGeneratedId : String(r.rows[0][this.externalIdColumn] ?? "");
        if (!externalId) {
          throw new Error(
            `Postgres insert succeeded but column ${JSON.stringify(this.externalIdColumn)} was empty \u2014 check your schema or externalIdColumn config.`
          );
        }
        return {
          external_id: externalId,
          external_url: this.buildUrl(post, externalId)
        };
      }
      async update_post(externalId, post) {
        await this.ensureTable();
        const row = this.toRow(post);
        delete row[this.externalIdColumn];
        const cols = Object.keys(row).map(safeIdent2);
        if (cols.length === 0) {
          return { external_id: externalId, external_url: this.buildUrl(post, externalId) };
        }
        const set = cols.map((c, i) => `${c}=$${i + 1}`).join(", ");
        const vals = Object.values(row).map(coerceForPg);
        const idPh = `$${vals.length + 1}`;
        const sql = `UPDATE ${this.table} SET ${set} WHERE ${safeIdent2(this.externalIdColumn)}=${idPh} RETURNING ${safeIdent2(this.externalIdColumn)}`;
        const pool = await this.getPool();
        const r = await pool.query(sql, [...vals, externalId]);
        if (r.rows.length === 0) {
          const e = new Error(`no post with ${this.externalIdColumn}=${externalId}`);
          e.code = "NOT_FOUND";
          throw e;
        }
        return {
          external_id: externalId,
          external_url: this.buildUrl(post, externalId)
        };
      }
      async delete_post(externalId) {
        await this.ensureTable();
        const pool = await this.getPool();
        await pool.query(
          `DELETE FROM ${this.table} WHERE ${safeIdent2(this.externalIdColumn)}=$1`,
          [externalId]
        );
      }
      buildUrl(post, externalId) {
        if (this.externalUrlTemplate) {
          return this.externalUrlTemplate.replace(/\{slug\}/g, post.slug || "").replace(/\{id\}/g, externalId).replace(/\{title\}/g, encodeURIComponent(post.title || ""));
        }
        if (this.baseUrl && post.slug) {
          return `${this.baseUrl}/${post.slug.replace(/^\//, "")}`;
        }
        return "";
      }
    };
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  EnvelopeError: () => EnvelopeError,
  MemoryStorage: () => MemoryStorage,
  REPLAY_WINDOW_SECONDS: () => REPLAY_WINDOW_SECONDS,
  SUPPORTED_VERSION: () => SUPPORTED_VERSION,
  VALID_OPS: () => VALID_OPS,
  VERSION: () => VERSION,
  VerificationError: () => VerificationError,
  computeSignature: () => computeSignature,
  dispatch: () => dispatch,
  isNotFound: () => isNotFound,
  normalizePost: () => normalizePost,
  parseEnvelope: () => parseEnvelope,
  resolveStorage: () => resolveStorage,
  verify: () => verify
});
module.exports = __toCommonJS(src_exports);

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

// src/index.ts
init_memory();
var VERSION = "0.1.0";
async function resolveStorage(storage, config = {}) {
  if (typeof storage !== "string") return storage;
  if (storage === "memory") {
    const { MemoryStorage: MemoryStorage2 } = await Promise.resolve().then(() => (init_memory(), memory_exports));
    return new MemoryStorage2(config);
  }
  if (storage === "supabase") {
    const { SupabaseStorage: SupabaseStorage2 } = await Promise.resolve().then(() => (init_supabase(), supabase_exports));
    return new SupabaseStorage2(config);
  }
  if (storage === "postgres") {
    const { PostgresStorage: PostgresStorage2 } = await Promise.resolve().then(() => (init_postgres(), postgres_exports));
    return new PostgresStorage2(config);
  }
  throw new Error(
    `unknown storage alias ${JSON.stringify(storage)}. Use one of: memory, supabase, postgres \u2014 or pass an adapter instance.`
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EnvelopeError,
  MemoryStorage,
  REPLAY_WINDOW_SECONDS,
  SUPPORTED_VERSION,
  VALID_OPS,
  VERSION,
  VerificationError,
  computeSignature,
  dispatch,
  isNotFound,
  normalizePost,
  parseEnvelope,
  resolveStorage,
  verify
});
