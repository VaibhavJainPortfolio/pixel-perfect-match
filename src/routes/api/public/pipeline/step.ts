import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Called by the database (pg_net) for each claimed pipeline step. Verified by a private token.
export const Route = createFileRoute("/api/public/pipeline/step")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { verifyPipelineToken, executeStep } = await import("@/lib/pipeline.server");
        if (!(await verifyPipelineToken(admin, request.headers.get("x-pipeline-token") ?? ""))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const parsed = z.object({ stepId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const result = await executeStep(admin, parsed.data.stepId);
        return Response.json(result);
      },
    },
  },
});
