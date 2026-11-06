import { proxyAiRequest } from "@/lib/server/ai-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { path: string[] } };

export function GET(request: Request, { params }: RouteContext) {
  return proxyAiRequest(request, params.path);
}

export function POST(request: Request, { params }: RouteContext) {
  return proxyAiRequest(request, params.path);
}
