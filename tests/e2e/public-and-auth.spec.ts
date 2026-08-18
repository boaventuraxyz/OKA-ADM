import { expect, test } from "@playwright/test";

test("protege o painel e apresenta o login sem overflow", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Acesso" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("exibe a biblioteca única e alterna a prévia responsiva", async ({ page }) => {
  await page.goto("/theme-library");

  await expect(
    page.getByRole("heading", { name: "Biblioteca de temas" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(page.getByText("cover", { exact: true })).toBeVisible();
  await expect(page.getByText("impact-dark", { exact: true })).toBeVisible();

  const mobilePreview = page.getByRole("button", { name: "Celular" });
  await mobilePreview.click();
  await expect(mobilePreview).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Prévia do tema Capa em celular")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("bloqueia geração por IA sem sessão", async ({ request, baseURL }) => {
  const response = await request.post("/api/ai/campaigns", {
    data: {
      topic: "Segurança pública",
      brief:
        "Crie uma campanha de teste que nunca deve ser processada sem autenticação.",
      tone: "mobilizador",
    },
    headers: {
      Origin: baseURL ?? "http://127.0.0.1:3000",
    },
  });

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: { code: "AUTHENTICATION_REQUIRED" },
  });
});

test("padroniza erros da assinatura sem quebrar clientes legados", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/assinaturas", {
    data: {},
    headers: {
      Origin: baseURL ?? "http://localhost:3000",
    },
  });

  expect(response.status()).toBe(413);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: { code: "INVALID_REQUEST" },
    sucesso: false,
    erro: expect.any(String),
  });
});
