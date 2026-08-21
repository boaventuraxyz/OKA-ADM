import { afterEach, describe, expect, it, vi } from "vitest";

import { turnstileIsEnabled, verifyTurnstileToken } from "@/lib/turnstile";

const previousSecret = process.env.TURNSTILE_SECRET_KEY;

afterEach(() => {
  if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = previousSecret;
  vi.unstubAllGlobals();
});

describe("verificação do Turnstile", () => {
  it("fica desligada sem a chave secreta", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(turnstileIsEnabled()).toBe(false);
    expect(await verifyTurnstileToken("qualquer-token")).toBe("disabled");
  });

  it("recusa envio sem token quando está ligada", async () => {
    process.env.TURNSTILE_SECRET_KEY = "segredo";
    expect(turnstileIsEnabled()).toBe(true);
    expect(await verifyTurnstileToken("")).toBe("invalid");
    expect(await verifyTurnstileToken(null)).toBe("invalid");
  });

  it("aceita o token que a Cloudflare confirma", async () => {
    process.env.TURNSTILE_SECRET_KEY = "segredo";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await verifyTurnstileToken("token-bom", "203.0.113.7")).toBe("valid");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = init.body as URLSearchParams;
    expect(body.get("response")).toBe("token-bom");
    expect(body.get("secret")).toBe("segredo");
    expect(body.get("remoteip")).toBe("203.0.113.7");
  });

  it("recusa o token que a Cloudflare nega", async () => {
    process.env.TURNSTILE_SECRET_KEY = "segredo";
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ success: false }), { status: 200 }));
    expect(await verifyTurnstileToken("token-ruim")).toBe("invalid");
  });

  it("separa indisponibilidade de token falso", async () => {
    process.env.TURNSTILE_SECRET_KEY = "segredo";

    vi.stubGlobal("fetch", async () => new Response("erro", { status: 500 }));
    expect(await verifyTurnstileToken("token")).toBe("unavailable");

    vi.stubGlobal("fetch", async () => {
      throw new Error("rede fora");
    });
    expect(await verifyTurnstileToken("token")).toBe("unavailable");
  });
});
