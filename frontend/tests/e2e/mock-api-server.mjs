import http from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 4344);
const nowIso = "2026-07-21T12:00:00.000Z";

const profiles = new Map([
  [
    "hugo_calderano",
    {
      userId: "user_seed_1",
      username: "hugo_calderano",
      city: "Rio de Janeiro",
      state: "RJ",
      country: "Brazil",
      instagramUrl: "https://www.instagram.com/hugocalderano",
      description: "[Hugo Calderano]\n🏆 Shakehand | Right-handed | Elite / Pro\nBrazilian table tennis player.",
      preferredLocale: "pt-BR",
      status: "ACTIVE",
      createdAt: nowIso,
      updatedAt: nowIso
    }
  ],
  [
    "taken_player",
    {
      userId: "user_seed_2",
      username: "taken_player",
      city: "Sao Paulo",
      state: "SP",
      country: "Brazil",
      instagramUrl: null,
      description: "Existing club regular",
      preferredLocale: "en",
      status: "ACTIVE",
      createdAt: nowIso,
      updatedAt: nowIso
    }
  ],
  [
    "private_player",
    {
      userId: "user_seed_3",
      username: "private_player",
      city: "Curitiba",
      state: "PR",
      country: "Brazil",
      instagramUrl: null,
      description: "Pending private profile",
      preferredLocale: "en",
      status: "PENDING",
      createdAt: nowIso,
      updatedAt: nowIso
    }
  ]
]);

const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-locale");
};

const sendJson = (res, statusCode, payload) => {
  setCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const toPublicProfile = (profile) => ({
  username: profile.username,
  city: profile.city,
  state: profile.state,
  country: profile.country,
  instagramUrl: profile.instagramUrl,
  description: profile.description,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/v1/profiles/")) {
    const username = decodeURIComponent(url.pathname.replace("/api/v1/profiles/", ""));
    const profile = profiles.get(username);

    if (!profile || profile.status !== "ACTIVE") {
      sendJson(res, 404, {
        error: {
          code: "PROFILE_NOT_FOUND",
          messageKey: "errors.profiles.profile_not_found"
        }
      });
      return;
    }

    sendJson(res, 200, toPublicProfile(profile));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/profiles") {
    const body = await readBody(req);
    const username = typeof body.username === "string" ? body.username.trim() : "";

    if (!username || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          messageKey: "errors.validation.invalid_request"
        }
      });
      return;
    }

    if (profiles.has(username)) {
      sendJson(res, 409, {
        error: {
          code: "PROFILE_USERNAME_ALREADY_EXISTS",
          messageKey: "errors.profiles.username_conflict"
        }
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const created = {
      userId: req.headers["x-user-id"] ?? `user_e2e_${profiles.size + 1}`,
      username,
      city: body.city ?? null,
      state: body.state ?? null,
      country: body.country ?? "Brazil",
      instagramUrl: body.instagramUrl ?? null,
      description: body.description ?? null,
      preferredLocale: body.preferredLocale ?? "en",
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    profiles.set(username, created);
    sendJson(res, 201, created);
    return;
  }

  sendJson(res, 404, { error: { code: "NOT_FOUND" } });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`E2E mock API listening on http://127.0.0.1:${PORT}`);
});
