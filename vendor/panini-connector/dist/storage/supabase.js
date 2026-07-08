// src/storage/supabase.ts
import { randomBytes } from "crypto";
var SupabaseStorage = class {
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
      sdkGeneratedId = "sb_" + randomBytes(6).toString("hex");
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
function safeIdent(name) {
  const safe = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (!safe) throw new Error(`invalid identifier ${JSON.stringify(name)}`);
  return safe;
}
export {
  SupabaseStorage
};
