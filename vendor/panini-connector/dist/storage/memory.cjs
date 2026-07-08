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

// src/storage/memory.ts
var memory_exports = {};
__export(memory_exports, {
  MemoryStorage: () => MemoryStorage
});
module.exports = __toCommonJS(memory_exports);
var import_node_crypto = require("crypto");
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
    const ext = "mem_" + (0, import_node_crypto.randomBytes)(6).toString("hex");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MemoryStorage
});
