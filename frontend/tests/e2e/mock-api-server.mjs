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

const walletPackages = [
  {
    id: "starter_pack",
    priceId: "price_e2e_starter",
    coinsAmount: 100,
    kind: "ONE_TIME",
    displayPriceCents: 500,
    currency: "USD"
  },
  {
    id: "pro_pack",
    priceId: "price_e2e_pro",
    coinsAmount: 500,
    kind: "ONE_TIME",
    displayPriceCents: 2000,
    currency: "USD"
  },
  {
    id: "club_pass_monthly",
    priceId: "price_e2e_club_pass",
    coinsAmount: 300,
    kind: "SUBSCRIPTION",
    displayPriceCents: 999,
    currency: "USD"
  }
];

let walletBalance = 0;
let activeE2eUserId = "user_e2e_1";
const checkoutSessions = new Map();
const syncedSessionIds = new Set();
const clubsList = [];
const eventsList = [];

const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-user-id, x-locale"
  );
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

  if (req.method === "POST" && url.pathname === "/api/v1/e2e/wallet/reset") {
    walletBalance = 0;
    activeE2eUserId = "user_e2e_1";
    checkoutSessions.clear();
    syncedSessionIds.clear();
    sendJson(res, 200, { balance: walletBalance });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/e2e/community/reset") {
    walletBalance = 200;
    activeE2eUserId = "user_e2e_1";
    clubsList.length = 0;
    eventsList.length = 0;
    sendJson(res, 200, { balance: walletBalance, userId: activeE2eUserId });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/e2e/auth/switch-user") {
    const body = await readBody(req);
    activeE2eUserId = typeof body.userId === "string" ? body.userId : "user_e2e_1";
    sendJson(res, 200, { userId: activeE2eUserId });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/wallet/balance") {
    sendJson(res, 200, {
      userId: activeE2eUserId,
      balance: walletBalance,
      currency: "COINS",
      updatedAt: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/clubs") {
    const nameFilter = url.searchParams.get("name")?.toLowerCase() ?? "";
    const locFilter = url.searchParams.get("location")?.toLowerCase() ?? "";
    const filtered = clubsList.filter((club) => {
      if (nameFilter && !club.name.toLowerCase().includes(nameFilter)) return false;
      if (
        locFilter &&
        ![club.city, club.state, club.country].some((v) =>
          v?.toLowerCase().includes(locFilter)
        )
      ) {
        return false;
      }
      return true;
    });
    sendJson(res, 200, {
      items: filtered.map((club) => ({
        ...club,
        memberCount: club.members.filter((m) => m.status === "ACTIVE").length
      })),
      page: 1,
      limit: 20,
      total: filtered.length
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/clubs") {
    const body = await readBody(req);
    if (walletBalance < 50) {
      sendJson(res, 409, { error: { code: "INSUFFICIENT_BALANCE" } });
      return;
    }
    walletBalance -= 50;
    const now = new Date().toISOString();
    const clubId = `club_e2e_${clubsList.length + 1}`;
    const club = {
      id: clubId,
      name: body.name,
      slug: body.slug ?? `${clubId}-slug`,
      description: body.description,
      email: body.email,
      phone: null,
      instagramUrl: null,
      country: body.country,
      state: body.state ?? null,
      city: body.city ?? null,
      address: body.address,
      mapsUrl: null,
      maxMembers: null,
      ownerId: activeE2eUserId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      members: [
        {
          id: `member_${Date.now()}`,
          clubId,
          userId: activeE2eUserId,
          role: "OWNER",
          status: "ACTIVE",
          joinedAt: now,
          createdAt: now,
          updatedAt: now
        }
      ]
    };
    clubsList.push(club);
    sendJson(res, 201, { ...club, memberCount: 1 });
    return;
  }

  if (
    req.method === "GET" &&
    url.pathname.startsWith("/api/v1/clubs/") &&
    !url.pathname.includes("/join") &&
    !url.pathname.includes("/members/")
  ) {
    const clubId = decodeURIComponent(url.pathname.replace("/api/v1/clubs/", ""));
    const club = clubsList.find((c) => c.id === clubId || c.slug === clubId);
    if (!club) {
      sendJson(res, 404, { error: { code: "CLUB_NOT_FOUND" } });
      return;
    }
    sendJson(res, 200, {
      ...club,
      memberCount: club.members.filter((m) => m.status === "ACTIVE").length
    });
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname.startsWith("/api/v1/clubs/") &&
    url.pathname.endsWith("/join")
  ) {
    const clubId = decodeURIComponent(
      url.pathname.replace("/api/v1/clubs/", "").replace(/\/join$/, "")
    );
    const club = clubsList.find((c) => c.id === clubId);
    if (!club) {
      sendJson(res, 404, { error: { code: "CLUB_NOT_FOUND" } });
      return;
    }
    const existing = club.members.find((m) => m.userId === activeE2eUserId);
    const now = new Date().toISOString();
    if (existing) {
      existing.status = "REQUESTED";
      existing.updatedAt = now;
      sendJson(res, 200, existing);
      return;
    }
    const member = {
      id: `member_${club.members.length + 1}`,
      clubId,
      userId: activeE2eUserId,
      role: "MEMBER",
      status: "REQUESTED",
      joinedAt: null,
      createdAt: now,
      updatedAt: now
    };
    club.members.push(member);
    sendJson(res, 200, member);
    return;
  }

  if (
    req.method === "PUT" &&
    url.pathname.startsWith("/api/v1/clubs/") &&
    url.pathname.includes("/members/")
  ) {
    const parts = url.pathname.replace("/api/v1/clubs/", "").split("/members/");
    const clubId = decodeURIComponent(parts[0] ?? "");
    const targetUserId = decodeURIComponent(parts[1] ?? "");
    const club = clubsList.find((c) => c.id === clubId);
    if (!club) {
      sendJson(res, 404, { error: { code: "CLUB_NOT_FOUND" } });
      return;
    }
    const member = club.members.find((m) => m.userId === targetUserId);
    if (!member) {
      sendJson(res, 404, { error: { code: "CLUB_MEMBER_NOT_FOUND" } });
      return;
    }
    const body = await readBody(req);
    const now = new Date().toISOString();
    if (body.action === "ACCEPT") {
      member.status = "ACTIVE";
      member.joinedAt = now;
    } else if (body.action === "REJECT") {
      member.status = "REMOVED";
    }
    if (body.role) member.role = body.role;
    if (body.status) member.status = body.status;
    member.updatedAt = now;
    sendJson(res, 200, member);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/events") {
    const locFilter = url.searchParams.get("location")?.toLowerCase() ?? "";
    const boostedOnly = url.searchParams.get("boostedOnly") === "true";
    const filtered = eventsList
      .filter((e) => {
        if (e.status !== "PUBLISHED") return false;
        if (boostedOnly && !e.isBoosted) return false;
        if (
          locFilter &&
          ![e.city, e.state, e.country, e.address].some((v) =>
            v?.toLowerCase().includes(locFilter)
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.isBoosted) - Number(a.isBoosted));
    sendJson(res, 200, {
      items: filtered,
      page: 1,
      limit: 20,
      total: filtered.length
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/events") {
    const body = await readBody(req);
    const now = new Date().toISOString();
    const created = {
      id: `event_e2e_${eventsList.length + 1}`,
      clubId: body.clubId ?? null,
      title: body.title,
      description: body.description,
      imageUrl: null,
      city: body.city ?? null,
      state: body.state ?? null,
      country: body.country ?? null,
      address: body.address,
      mapsUrl: null,
      startAt: body.startDate,
      endAt: body.endDate,
      registrationUrl: null,
      createdById: activeE2eUserId,
      status: "DRAFT",
      isBoosted: false,
      boostedUntil: null,
      createdAt: now,
      updatedAt: now
    };
    eventsList.push(created);
    sendJson(res, 201, created);
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname.startsWith("/api/v1/events/") &&
    url.pathname.endsWith("/publish")
  ) {
    const eventId = decodeURIComponent(
      url.pathname.replace("/api/v1/events/", "").replace(/\/publish$/, "")
    );
    const event = eventsList.find((e) => e.id === eventId);
    if (!event) {
      sendJson(res, 404, { error: { code: "EVENT_NOT_FOUND" } });
      return;
    }
    if (walletBalance < 30) {
      sendJson(res, 409, { error: { code: "INSUFFICIENT_BALANCE" } });
      return;
    }
    walletBalance -= 30;
    event.status = "PUBLISHED";
    event.updatedAt = new Date().toISOString();
    sendJson(res, 200, event);
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname.startsWith("/api/v1/events/") &&
    url.pathname.endsWith("/boost")
  ) {
    const eventId = decodeURIComponent(
      url.pathname.replace("/api/v1/events/", "").replace(/\/boost$/, "")
    );
    const event = eventsList.find((e) => e.id === eventId);
    if (!event) {
      sendJson(res, 404, { error: { code: "EVENT_NOT_FOUND" } });
      return;
    }
    if (walletBalance < 25) {
      sendJson(res, 409, { error: { code: "INSUFFICIENT_BALANCE" } });
      return;
    }
    walletBalance -= 25;
    event.isBoosted = true;
    event.boostedUntil = new Date(Date.now() + 7 * 86400_000).toISOString();
    event.updatedAt = new Date().toISOString();
    sendJson(res, 200, event);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/v1/events/")) {
    const eventId = decodeURIComponent(url.pathname.replace("/api/v1/events/", ""));
    const event = eventsList.find((e) => e.id === eventId);
    if (!event || event.status !== "PUBLISHED") {
      sendJson(res, 404, { error: { code: "EVENT_NOT_FOUND" } });
      return;
    }
    sendJson(res, 200, event);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/v1/billing/packages") {
    sendJson(res, 200, { packages: walletPackages });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/v1/billing/checkout-sessions") {
    const body = await readBody(req);
    const pkg = walletPackages.find((entry) => entry.priceId === body.priceId);
    if (!pkg) {
      sendJson(res, 400, {
        error: { code: "INVALID_BILLING_PRICE", messageKey: "errors.billing.invalid_price" }
      });
      return;
    }
    const sessionId = `cs_e2e_${checkoutSessions.size + 1}_${Date.now()}`;
    checkoutSessions.set(sessionId, pkg);
    sendJson(res, 201, {
      sessionId,
      client_secret: `${sessionId}_secret_e2e`
    });
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname.startsWith("/api/v1/billing/checkout-sessions/") &&
    url.pathname.endsWith("/sync")
  ) {
    const sessionId = decodeURIComponent(
      url.pathname
        .replace("/api/v1/billing/checkout-sessions/", "")
        .replace(/\/sync$/, "")
    );
    const pkg = checkoutSessions.get(sessionId);
    if (!pkg) {
      sendJson(res, 404, {
        error: {
          code: "CHECKOUT_SESSION_NOT_FOUND",
          messageKey: "errors.billing.checkout_session_not_found"
        }
      });
      return;
    }

    if (syncedSessionIds.has(sessionId)) {
      sendJson(res, 200, { status: "already_processed", balance: walletBalance });
      return;
    }

    syncedSessionIds.add(sessionId);
    walletBalance += pkg.coinsAmount;
    sendJson(res, 200, { status: "credited", balance: walletBalance });
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
