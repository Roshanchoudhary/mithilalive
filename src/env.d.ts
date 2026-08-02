/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
  interface Locals {
    db: D1Database;
    kv: KVNamespace;
    r2: R2Bucket;
    user: {
      id: number;
      email: string;
      name: string;
      role: string;
      permissions: string[];
    } | null;
  }
}

interface ImportMetaEnv {
  readonly JWT_SECRET: string;
  readonly JWT_EXPIRY: string;
  readonly BCRYPT_ROUNDS: string;
  readonly ADMIN_EMAIL: string;
  readonly ADMIN_PASSWORD: string;
  readonly SITE_NAME: string;
  readonly SITE_URL: string;
  readonly CLOUDFLARE_ACCOUNT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
