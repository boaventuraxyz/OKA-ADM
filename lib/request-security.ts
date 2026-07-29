import "server-only";

export function isSameOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol;
  const allowedOrigins = new Set([requestUrl.origin.toLowerCase()]);

  for (const host of [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  ]) {
    if (!host) continue;
    try {
      allowedOrigins.add(new URL(`${protocol}//${host}`).origin.toLowerCase());
    } catch {
      // Invalid proxy metadata is ignored.
    }
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const source = origin && origin !== "null" ? origin : referer;

  if (source) {
    try {
      return allowedOrigins.has(new URL(source).origin.toLowerCase());
    } catch {
      return false;
    }
  }

  return request.headers.get("sec-fetch-site") === "same-origin";
}

export function requestBodyWithinLimit(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return true;
  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 && length <= maxBytes;
}

export async function readFormDataWithinLimit(
  request: Request,
  maxBytes: number
) {
  if (!requestBodyWithinLimit(request, maxBytes) || !request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }

    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return await new Response(body, {
      headers: {
        "Content-Type": request.headers.get("content-type") || ""
      }
    }).formData();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
