// src/storage/memory.ts
import { randomBytes } from "crypto";
var MemoryStorage = class {
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
    const ext = "mem_" + randomBytes(6).toString("hex");
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
export {
  MemoryStorage
};
