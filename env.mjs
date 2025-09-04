import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // server-only keys (never NEXT_PUBLIC_)
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
  },
  client: {
    // safe to expose in browser (must start with NEXT_PUBLIC_)
  },
  // For Next.js >= 13.4.4, you only need to destructure client variables:
  experimental__runtimeEnv: {},
});
