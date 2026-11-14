import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/zoho-sync")({
  server: { handlers: { POST: async ({ request }) => {
    const expected = process.env['LOVABLE_CRON_SECRET'];
    const supplied = request.headers.get("Authorization");
    if (!expected || supplied !== `Bearer ${expected}`) {
      return Response.json({error:"Unauthorized"},{status:401});
    }
    try {
      const { syncZohoStep } = await import("@/lib/fincommand/zoho-sync.server");
      return Response.json(await syncZohoStep(),{headers:{"Cache-Control":"no-store"}});
    } catch(error) {
      console.error("Zoho import failed",error);
      return Response.json({error:error instanceof Error ? error.message : "Import failed"},{status:500});
    }
  } } },
});