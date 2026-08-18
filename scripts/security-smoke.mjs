import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";

const port = Number(process.env.SECURITY_TEST_PORT || 3117);
const authPort = port + 1;
const baseUrl = `http://127.0.0.1:${port}`;
const smokeServiceRoleKey = [
  Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url"),
  "security-smoke-signature"
].join(".");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function responseHasError(response, code) {
  return response.headers.get("location")?.includes(`erro=${code}`) ?? false;
}

const authServer = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");

  if (request.url?.startsWith("/auth/v1/token")) {
    request.resume();
    request.on("end", () => {
      response.statusCode = 400;
      response.end(
        JSON.stringify({
          code: "invalid_credentials",
          message: "Invalid login credentials"
        })
      );
    });
    return;
  }

  if (request.url === "/auth/v1/user") {
    response.statusCode = 401;
    response.end(
      JSON.stringify({
        code: "session_not_found",
        message: "Auth session missing"
      })
    );
    return;
  }

  response.statusCode = 404;
  response.end(JSON.stringify({ message: "Not found" }));
});

await new Promise((resolve, reject) => {
  authServer.once("error", reject);
  authServer.listen(authPort, "127.0.0.1", resolve);
});

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_URL: baseUrl,
      SUPABASE_URL: `http://127.0.0.1:${authPort}`,
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_security_smoke_only_000000",
      SUPABASE_SECRET_KEY: smokeServiceRoleKey,
      AI_MODEL: "openai/gpt-5.6-luna"
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let serverErrors = "";
server.stderr.on("data", (chunk) => {
  serverErrors += String(chunk);
});

function redirectPath(response) {
  const location = response.headers.get("location");
  return location ? new URL(location, baseUrl).pathname : null;
}

function requestWithHost(path, host, protocol = "https") {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        headers: { Host: host, "X-Forwarded-Proto": protocol },
        hostname: "127.0.0.1",
        method: "GET",
        path,
        port
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response));
      }
    );
    request.on("error", reject);
    request.end();
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start.\n${serverErrors}`);
}

function login(password, ip, origin = baseUrl) {
  return fetch(`${baseUrl}/api/login`, {
    body: new URLSearchParams({
      email: "security@example.test",
      senha: password
    }),
    headers: {
      Origin: origin,
      "X-Vercel-Forwarded-For": ip,
      "X-Forwarded-For": ip
    },
    method: "POST",
    redirect: "manual"
  });
}

function invalidSignature(ip, origin = baseUrl) {
  const body = new FormData();
  body.set("campanha_id", "invalid");
  body.set("consentimento", "sim");
  return fetch(`${baseUrl}/api/assinaturas`, {
    body,
    headers: {
      Origin: origin,
      "X-Vercel-Forwarded-For": ip,
      "X-Forwarded-For": ip
    },
    method: "POST",
    redirect: "manual"
  });
}

try {
  await waitForServer();

  const loginPage = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  const csp = loginPage.headers.get("content-security-policy") || "";
  assert(csp.includes("frame-ancestors 'none'"), "CSP frame protection is missing.");
  assert(csp.includes("upgrade-insecure-requests"), "Mixed-content protection is missing.");
  assert(!csp.includes("viacep.com.br"), "CSP still allows the retired browser CEP integration.");
  assert(
    loginPage.headers.get("strict-transport-security") === "max-age=63072000",
    "HSTS is missing."
  );
  assert(loginPage.headers.get("x-frame-options") === "DENY", "X-Frame-Options is not DENY.");
  assert(
    loginPage.headers.get("x-content-type-options") === "nosniff",
    "MIME sniffing protection is missing."
  );

  const platformRoot = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert(
    platformRoot.status === 308 && redirectPath(platformRoot) === "/admin",
    "Platform root is not canonicalized to /admin."
  );

  const anonymousAdmin = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
  assert(
    anonymousAdmin.status >= 300 &&
      anonymousAdmin.status < 400 &&
      redirectPath(anonymousAdmin) === "/login",
    "Anonymous /admin access was not blocked."
  );

  const customDomainAdmin = await requestWithHost("/admin", "tieminevoeiro.com");
  assert(customDomainAdmin.statusCode === 404, "A candidate domain exposed the admin.");
  assert(
    customDomainAdmin.headers["x-robots-tag"]?.includes("noindex"),
    "Blocked domain route is indexable."
  );

  const customDomainHttp = await requestWithHost("/", "tieminevoeiro.com", "http");
  assert(
    customDomainHttp.statusCode === 308 &&
      customDomainHttp.headers.location === "https://tieminevoeiro.com/",
    "Candidate domain did not enforce HTTPS."
  );

  const customDomainWww = await requestWithHost("/", "www.tieminevoeiro.com");
  assert(
    customDomainWww.statusCode === 308 &&
      customDomainWww.headers.location === "https://tieminevoeiro.com/",
    "Candidate www domain did not redirect to the canonical host."
  );

  const crossOriginLogin = await login(
    "invalid-password",
    "10.0.0.10",
    "https://evil.example"
  );
  assert(crossOriginLogin.status === 403, "Cross-origin login was accepted.");

  const missingOriginLogin = await fetch(`${baseUrl}/api/login`, {
    body: new URLSearchParams({
      email: "security@example.test",
      senha: "invalid-password"
    }),
    method: "POST",
    redirect: "manual"
  });
  assert(missingOriginLogin.status === 403, "Login without origin metadata was accepted.");

  const oversizedLogin = await fetch(`${baseUrl}/api/login`, {
    body: new URLSearchParams({
      email: "security@example.test",
      senha: "x".repeat(5000)
    }),
    headers: { Origin: baseUrl },
    method: "POST",
    redirect: "manual"
  });
  assert(oversizedLogin.status === 413, "Oversized login was accepted.");

  const chunk = new TextEncoder().encode(
    `email=security%40example.test&senha=${"x".repeat(5000)}`
  );
  const chunkedLogin = await fetch(`${baseUrl}/api/login`, {
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.close();
      }
    }),
    duplex: "half",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: baseUrl
    },
    method: "POST",
    redirect: "manual"
  });
  assert(chunkedLogin.status === 413, "Oversized chunked login was accepted.");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await login("invalid-password", "10.0.0.20");
    assert(
      response.status === 303 && responseHasError(response, "credenciais"),
      `Invalid login attempt ${attempt + 1} returned an unexpected response.`
    );
  }
  const blockedLogin = await login("invalid-password", "10.0.0.20");
  assert(
    blockedLogin.status === 303 &&
      responseHasError(blockedLogin, "limite") &&
      blockedLogin.headers.has("retry-after"),
    "Login rate limit did not activate."
  );

  const crossOriginSignature = await invalidSignature(
    "10.0.0.30",
    "https://evil.example"
  );
  assert(crossOriginSignature.status === 403, "Cross-origin signature was accepted.");

  const signatureStatuses = [];
  for (let attempt = 0; attempt < 11; attempt += 1) {
    signatureStatuses.push((await invalidSignature("10.0.0.31")).status);
  }
  assert(
    signatureStatuses.slice(0, 10).every((status) => status === 400) &&
      signatureStatuses[10] === 429,
    `Signature rate limit failed: ${signatureStatuses.join(",")}`
  );

  const crossOriginLogout = await fetch(`${baseUrl}/api/logout`, {
    headers: { Origin: "https://evil.example" },
    method: "POST",
    redirect: "manual"
  });
  assert(crossOriginLogout.status === 403, "Cross-origin logout was accepted.");

  const crossOriginAi = await fetch(`${baseUrl}/api/ai/campaigns`, {
    body: JSON.stringify({
      topic: "Teste",
      brief: "Briefing de teste suficientemente longo."
    }),
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example"
    },
    method: "POST"
  });
  assert(crossOriginAi.status === 403, "Cross-origin AI generation was accepted.");

  const anonymousAi = await fetch(`${baseUrl}/api/ai/campaigns`, {
    body: JSON.stringify({
      topic: "Teste",
      brief: "Briefing de teste suficientemente longo."
    }),
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    method: "POST"
  });
  assert(anonymousAi.status === 401, "Anonymous AI generation was accepted.");

  console.log("Security headers and CSP: OK");
  console.log("Platform and candidate-domain isolation: OK");
  console.log("Supabase Auth login boundaries and rate limit: OK");
  console.log("Public submission origin and rate limit: OK");
  console.log("Logout and AI authorization boundaries: OK");
} finally {
  server.kill();
  await new Promise((resolve) => authServer.close(resolve));
}
