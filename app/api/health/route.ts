export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", service: "letpot-maker" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
