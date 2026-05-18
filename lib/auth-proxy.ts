import { NextRequest, NextResponse } from "next/server";
import { resolveBackendUrl } from "@/lib/server-backend-url";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

function buildForwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return headers;
}

function collectForwardHeaders(res: Response): Headers {
  const headers = new Headers();
  res.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.append(key, value);
  });
  return headers;
}

/** Proxy an auth response from Express so Set-Cookie applies to the Vercel origin. */
export async function proxyAuthToBackend(
  req: NextRequest,
  backendPath: string,
): Promise<NextResponse> {
  const backend = resolveBackendUrl();
  const url = `${backend}${backendPath}${req.nextUrl.search}`;

  try {
    const init: RequestInit = {
      method: req.method,
      headers: buildForwardHeaders(req),
      redirect: "manual",
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.text();
    }

    const res = await fetch(url, init);
    const forwardHeaders = collectForwardHeaders(res);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return NextResponse.json(
          { error: "Auth redirect missing Location header" },
          { status: 502 },
        );
      }
      return NextResponse.redirect(location, {
        status: res.status,
        headers: forwardHeaders,
      });
    }

    const body =
      res.status === 204 || res.status === 304 ? null : await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: forwardHeaders,
    });
  } catch (err) {
    console.error("[auth-proxy] failed:", url, err);
    return NextResponse.json(
      {
        error: "Could not reach the auth API",
        backend,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
