import { describe, expect, it } from "vitest";
import { apiError, apiSuccess } from "@/lib/api/response";

describe("respostas padronizadas de API", () => {
  it("serializa sucesso e impede cache privado", async () => {
    const response = apiSuccess({ id: "123" }, { status: 201 });

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: "123" }
    });
  });

  it("serializa erro sem detalhes internos", async () => {
    const response = apiError("CAMPAIGN_NOT_FOUND", "Campanha não encontrada.", 404);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "CAMPAIGN_NOT_FOUND",
        message: "Campanha não encontrada."
      }
    });
  });
});
