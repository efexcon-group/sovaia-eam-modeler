import { NextResponse } from "next/server";
import { modelerFetch } from "@/lib/api-client";

export const dynamic = "force-dynamic";

/**
 * Proxy für /v1/reference/sovaia[/{cluster_path}] — der Canvas (Client-Component)
 * kann nicht direkt zur FastAPI (Bearer liegt nur server-seitig in der Session).
 * Diese Route hängt den Token via modelerFetch an. Same-Origin → Cookies fließen.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  // Slash-Pfade (z.B. "verticals/heim-pflege.yaml") bleiben erhalten.
  const sub = path.map(encodeURIComponent).join("/");
  const apiPath = sub ? `/reference/sovaia/${sub}` : "/reference/sovaia";
  try {
    const data = await modelerFetch<unknown>(apiPath);
    return NextResponse.json(data);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
