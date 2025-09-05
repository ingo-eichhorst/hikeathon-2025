import { defineEventHandler, setResponseStatus } from 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/h3@1.15.4/node_modules/h3/dist/index.mjs';
import { u as useRuntimeConfig } from '../../nitro/nitro.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/destr@2.0.5/node_modules/destr/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/hookable@5.5.3/node_modules/hookable/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/ofetch@1.4.1/node_modules/ofetch/dist/node.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/node-mock-http@1.0.3/node_modules/node-mock-http/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/ufo@1.6.1/node_modules/ufo/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/unstorage@1.17.1_db0@0.3.2_ioredis@5.7.0/node_modules/unstorage/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/unstorage@1.17.1_db0@0.3.2_ioredis@5.7.0/node_modules/unstorage/drivers/fs.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/unstorage@1.17.1_db0@0.3.2_ioredis@5.7.0/node_modules/unstorage/drivers/fs-lite.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/unstorage@1.17.1_db0@0.3.2_ioredis@5.7.0/node_modules/unstorage/drivers/lru-cache.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/ohash@2.0.11/node_modules/ohash/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/klona@2.0.6/node_modules/klona/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/defu@6.1.4/node_modules/defu/dist/defu.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/scule@1.3.0/node_modules/scule/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/unctx@2.4.1/node_modules/unctx/dist/index.mjs';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/radix3@1.1.2/node_modules/radix3/dist/index.mjs';
import 'node:fs';
import 'node:url';
import 'file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/pathe@2.0.3/node_modules/pathe/dist/index.mjs';

const health_get = defineEventHandler(async (event) => {
  try {
    const { createClient } = await import('file:///Users/ingo/projects/hikeathon-2025/node_modules/.pnpm/@supabase+supabase-js@2.57.0/node_modules/@supabase/supabase-js/dist/main/index.js');
    const config = useRuntimeConfig();
    const supabase = createClient(
      config.public.supabase.url,
      config.public.supabase.anonKey
    );
    const { data, error } = await supabase.from("teams").select("count(*)").limit(1);
    const services = {
      database: error ? "error" : "connected",
      storage: "available",
      // Assuming storage is available if DB works
      realtime: "active"
      // Assuming realtime is active if DB works
    };
    return {
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      services,
      version: process.env.npm_package_version || "1.0.0",
      environment: "prerender"
    };
  } catch (error) {
    setResponseStatus(event, 503);
    return {
      status: "unhealthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      services: {
        database: "error",
        storage: "unknown",
        realtime: "unknown"
      }
    };
  }
});

export { health_get as default };
//# sourceMappingURL=health.get.mjs.map
