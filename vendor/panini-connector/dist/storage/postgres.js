// src/storage/postgres.ts
import { randomBytes } from "crypto";
var CREATE_TABLE_SQL = (table) => `
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
var PostgresStorage = class {
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
    this.table = safeIdent(opts.table ?? "panini_posts");
    this.siteName = opts.site_name || "Postgres connector";
    this.baseUrl = (opts.base_url ?? "").replace(/\/$/, "");
    this.toRow = opts.toRow ?? ((post) => ({ ...post }));
    this.externalIdColumn = safeIdent(opts.externalIdColumn ?? "external_id");
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
      sdkGeneratedId = "pg_" + randomBytes(6).toString("hex");
      row[this.externalIdColumn] = sdkGeneratedId;
    }
    const cols = Object.keys(row).map(safeIdent);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const vals = Object.values(row).map(coerceForPg);
    const returningCol = safeIdent(this.externalIdColumn);
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
    const cols = Object.keys(row).map(safeIdent);
    if (cols.length === 0) {
      return { external_id: externalId, external_url: this.buildUrl(post, externalId) };
    }
    const set = cols.map((c, i) => `${c}=$${i + 1}`).join(", ");
    const vals = Object.values(row).map(coerceForPg);
    const idPh = `$${vals.length + 1}`;
    const sql = `UPDATE ${this.table} SET ${set} WHERE ${safeIdent(this.externalIdColumn)}=${idPh} RETURNING ${safeIdent(this.externalIdColumn)}`;
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
      `DELETE FROM ${this.table} WHERE ${safeIdent(this.externalIdColumn)}=$1`,
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
function coerceForPg(v) {
  if (v === void 0) return null;
  if (v === null) return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    return JSON.stringify(v);
  }
  return v;
}
function safeIdent(name) {
  const safe = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (!safe) throw new Error(`invalid identifier ${JSON.stringify(name)}`);
  return safe;
}
export {
  PostgresStorage
};
