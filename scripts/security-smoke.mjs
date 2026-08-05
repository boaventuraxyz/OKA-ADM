import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";

const port = Number(process.env.SECURITY_TEST_PORT || 3117);
const baseUrl = `http://127.0.0.1:${port}`;
const password = "correct-horse-battery-staple";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      SENHA_ADMIN: password,
      SESSION_SECRET: "security-test-session-secret-with-more-than-32-bytes",
      SUPABASE_SECRET_KEY: "sb_secret_test_only_not_a_real_key_00000000",
      SUPABASE_URL: "https://example.supabase.co"
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let serverErrors = "";
server.stderr.on("data", (chunk) => {
  serverErrors += String(chunk);
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function redirectPath(response) {
  const location = response.headers.get("location");
  return location ? new URL(location, baseUrl).pathname : null;
}

function requestWithHost(path, host) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        headers: { Host: host },
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
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start.\n${serverErrors}`);
}

function login(candidate, ip, origin = baseUrl) {
  return fetch(`${baseUrl}/api/login`, {
    body: new URLSearchParams({ senha: candidate }),
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

function importRequest({ cookie, file = "id,titulo\n,Teste", origin = baseUrl }) {
  const body = new FormData();
  body.set("arquivo", new File([file], "campanhas.csv", { type: "text/csv" }));
  body.set("modo", "preview");
  return fetch(`${baseUrl}/api/campanhas/importar`, {
    body,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: origin,
      "X-Vercel-Forwarded-For": "10.0.0.40"
    },
    method: "POST",
    redirect: "manual"
  });
}

try {
  await waitForServer();

  const loginPage = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  assert(
    loginPage.headers.get("content-security-policy")?.includes("frame-ancestors 'self'"),
    "Content-Security-Policy is missing."
  );
  assert(
    loginPage.headers.get("strict-transport-security") === "max-age=63072000",
    "Strict-Transport-Security is missing."
  );
  assert(loginPage.headers.get("x-frame-options") === "SAMEORIGIN", "X-Frame-Options is missing.");

  const customDomainAdmin = await requestWithHost(
    "/login",
    "tieminevoeiro.com"
  );
  assert(customDomainAdmin.statusCode === 404, "Custom candidate domain exposed an admin route.");
  assert(
    customDomainAdmin.headers["x-robots-tag"]?.includes("noindex"),
    "Blocked custom-domain route is indexable."
  );

  const crossOriginLogin = await login(password, "10.0.0.10", "https://evil.example");
  assert(crossOriginLogin.status === 403, "Cross-origin login was accepted.");

  const missingOriginLogin = await fetch(`${baseUrl}/api/login`, {
    body: new URLSearchParams({ senha: password }),
    method: "POST",
    redirect: "manual"
  });
  assert(missingOriginLogin.status === 403, "Login without origin metadata was accepted.");

  const oversizedLogin = await fetch(`${baseUrl}/api/login`, {
    body: new URLSearchParams({ senha: "x".repeat(5000) }),
    headers: { Origin: baseUrl },
    method: "POST",
    redirect: "manual"
  });
  assert(oversizedLogin.status === 413, "Oversized login was accepted.");

  const oversizedChunk = new TextEncoder().encode(`senha=${"x".repeat(5000)}`);
  const chunkedLogin = await fetch(`${baseUrl}/api/login`, {
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(oversizedChunk);
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

  const validLogin = await login(password, "10.0.0.21");
  const setCookie = validLogin.headers.get("set-cookie") || "";
  assert(validLogin.status === 303 && redirectPath(validLogin) === "/", "Valid login failed.");
  assert(setCookie.startsWith("__Host-adm_session="), "Production cookie does not use __Host-.");
  assert(
    /secure/i.test(setCookie) &&
      /httponly/i.test(setCookie) &&
      /samesite=lax/i.test(setCookie) &&
      /path=\//i.test(setCookie),
    "Session cookie flags are incomplete."
  );

  const sessionCookie = setCookie.split(";")[0];
  const validSession = await fetch(`${baseUrl}/login`, {
    headers: { Cookie: sessionCookie },
    redirect: "manual"
  });
  assert(
    validSession.status >= 300 &&
      validSession.status < 400 &&
      redirectPath(validSession) === "/",
    "Valid session was rejected."
  );

  const separator = sessionCookie.indexOf("=");
  const cookieName = sessionCookie.slice(0, separator);
  const token = sessionCookie.slice(separator + 1);
  const tamperedToken = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  const tamperedSession = await fetch(`${baseUrl}/login`, {
    headers: { Cookie: `${cookieName}=${tamperedToken}` },
    redirect: "manual"
  });
  assert(tamperedSession.status === 200, "Tampered session was accepted.");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await login("wrong-password-value", "10.0.0.20");
    assert(
      response.status === 303 && response.headers.get("location")?.includes("erro=senha"),
      `Wrong login attempt ${attempt + 1} returned an unexpected response.`
    );
  }

  const blockedLogin = await login(password, "10.0.0.20");
  assert(
    blockedLogin.status === 303 &&
      blockedLogin.headers.get("location")?.includes("erro=limite") &&
      blockedLogin.headers.has("retry-after"),
    "Login rate limit did not activate."
  );

  const crossOriginSignature = await invalidSignature("10.0.0.30", "https://evil.example");
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
    headers: {
      Cookie: sessionCookie,
      Origin: "https://evil.example"
    },
    method: "POST",
    redirect: "manual"
  });
  assert(crossOriginLogout.status === 403, "Cross-origin logout was accepted.");

  const anonymousImport = await importRequest({});
  assert(anonymousImport.status === 401, "Anonymous campaign import was accepted.");

  const crossOriginImport = await importRequest({
    cookie: sessionCookie,
    origin: "https://evil.example"
  });
  assert(crossOriginImport.status === 403, "Cross-origin campaign import was accepted.");

  const oversizedImport = await importRequest({
    cookie: sessionCookie,
    file: "x".repeat(2 * 1024 * 1024 + 64_001)
  });
  assert(oversizedImport.status === 413, "Oversized campaign import was accepted.");

  console.log("Security headers: OK");
  console.log("Candidate domain admin isolation: OK");
  console.log("Login origin, body and rate-limit controls: OK");
  console.log("Signed session flags and tamper rejection: OK");
  console.log("Public submission origin and rate-limit controls: OK");
  console.log("Admin logout origin controls: OK");
  console.log("Campaign import session, origin and size controls: OK");
} finally {
  server.kill();
}
