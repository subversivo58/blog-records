
/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

import { JWToken } from "./JWToken.mjs";


const ALLOWED_ORIGIN = "https://subversivo58.github.io";

const JWT_AUDIENCE = "blog-records";

const PAGE_SIZE = 25;

const ERROR_TYPES = [
    "custom",
    "css",
    "javascript",
    "language",
    "plugin",
    "server"
];

const ADMIN_TABLES = [
    "feedback",
    "errors",
    "analytics"
];


// ============================================================
// RESPONSE
// ============================================================

function jsonResponse(data, status = 200) {
    return Response.json(data, {
        status
    });
}


function errorResponse(error, status) {
    return jsonResponse({
        success: false,
        error
    }, status);
}


function corsResponse(response) {
    const headers = new Headers(response.headers);

    headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
    headers.set("Vary", "Origin");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}


function handlePreflight(request) {
    const requestedMethod = request.headers.get(
        "Access-Control-Request-Method"
    );

    const requestedHeaders = request.headers.get(
        "Access-Control-Request-Headers"
    );

    const allowedMethods = [
        "GET",
        "POST",
        "DELETE"
    ];

    const allowedHeaders = [
        "authorization",
        "content-type"
    ];

    if (
        !requestedMethod ||
        !allowedMethods.includes(requestedMethod.toUpperCase())
    ) {
        return errorResponse("Method Not Allowed", 405);
    }

    if (requestedHeaders) {
        const headers = requestedHeaders
            .split(",")
            .map(header => header.trim().toLowerCase());

        if (
            headers.some(header => !allowedHeaders.includes(header))
        ) {
            return errorResponse("Headers Not Allowed", 403);
        }
    }

    return new Response(null, {
        status: 204
    });
}


// ============================================================
// JWT AUTHENTICATION
// ============================================================

function unauthorized(message = "Unauthorized") {
    return errorResponse(message, 401);
}


function normalizePublicKey(value) {
    return value
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/\s/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}


async function authenticateAdmin(request, env) {
    const authorization = request.headers.get("Authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
        return unauthorized("Invalid authorization header");
    }

    const token = match[1];

    const jwt = new JWToken({
        audience: JWT_AUDIENCE
    });

    let decoded;

    try {
        decoded = jwt.decode(token);
    } catch {
        return unauthorized("Invalid token");
    }

    const kid = decoded.header?.kid;

    if (typeof kid !== "string") {
        return unauthorized("Invalid key identifier");
    }

    const storedPublicKey = env[kid];

    if (typeof storedPublicKey !== "string") {
        return unauthorized("Public key not found");
    }

    try {
        const publicKey = await jwt.importKey({
            keyId: kid,
            type: "public",
            keyData: normalizePublicKey(storedPublicKey),
            format: "spki"
        });

        await jwt.verify({
            token,
            publicKey
        });

    } catch {
        return unauthorized("Token verification failed");
    }

    return null;
}


// ============================================================
// PUBLIC HANDLERS
// ============================================================

// ------------------------------------------------------------
// FEEDBACK
// ------------------------------------------------------------

async function handleFeedback(request, env) {
    let data;

    try {
        data = await request.json();
    } catch {
        return errorResponse("Invalid JSON", 400);
    }

    const rating = data?.rating;
    const message = data?.message;

    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        return errorResponse(
            "Rating must be an integer between 1 and 5",
            400
        );
    }

    if (
        typeof message !== "string" ||
        message.trim().length < 1 ||
        message.trim().length > 500
    ) {
        return errorResponse(
            "Message must contain between 1 and 500 characters",
            400
        );
    }

    try {
        const result = await env.DB.prepare(`
            INSERT INTO feedback (rating, message)
            VALUES (?, ?)
        `)
        .bind(rating, message.trim())
        .run();

        return jsonResponse({
            success: true,
            id: result.meta.last_row_id
        }, 201);

    } catch {
        return errorResponse(
            "Failed to save feedback",
            500
        );
    }
}


// ------------------------------------------------------------
// ERRORS
// ------------------------------------------------------------

async function handleErrors(request, env) {
    let data;

    try {
        data = await request.json();
    } catch {
        return errorResponse("Invalid JSON", 400);
    }

    const type = data?.type;
    const message = data?.message;

    if (!ERROR_TYPES.includes(type)) {
        return errorResponse("Invalid error type", 400);
    }

    if (
        typeof message !== "string" ||
        message.trim().length < 1 ||
        message.trim().length > 280
    ) {
        return errorResponse(
            "Message must contain between 1 and 280 characters",
            400
        );
    }

    try {
        const result = await env.DB.prepare(`
            INSERT INTO errors (type, message)
            VALUES (?, ?)
        `)
        .bind(type, message.trim())
        .run();

        return jsonResponse({
            success: true,
            id: result.meta.last_row_id
        }, 201);

    } catch {
        return errorResponse(
            "Failed to save error report",
            500
        );
    }
}


// ------------------------------------------------------------
// ANALYTICS
// ------------------------------------------------------------

async function handleAnalytics(request, env) {
    let data;

    try {
        data = await request.json();
    } catch {
        return errorResponse("Invalid JSON", 400);
    }

    try {
        const result = await env.DB.prepare(`
            INSERT INTO analytics (content)
            VALUES (?)
        `)
        .bind(JSON.stringify(data))
        .run();

        return jsonResponse({
            success: true,
            id: result.meta.last_row_id
        }, 201);

    } catch {
        return errorResponse(
            "Failed to save analytics",
            500
        );
    }
}


// ============================================================
// ADMIN HANDLERS
// ============================================================

async function listRecords(env, table, page) {
    const offset = (page - 1) * PAGE_SIZE;

    try {
        const count = await env.DB.prepare(`
            SELECT COUNT(*) AS total
            FROM ${table}
        `).first();

        const result = await env.DB.prepare(`
            SELECT *
            FROM ${table}
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
        `)
        .bind(PAGE_SIZE, offset)
        .all();

        const total = count.total;

        return jsonResponse({
            success: true,
            results: result.results,
            pagination: {
                page,
                limit: PAGE_SIZE,
                total,
                totalPages: Math.ceil(total / PAGE_SIZE)
            }
        });

    } catch {
        return errorResponse(
            "Failed to retrieve records",
            500
        );
    }
}


async function getRecord(env, table, id) {
    try {
        const result = await env.DB.prepare(`
            SELECT *
            FROM ${table}
            WHERE id = ?
        `)
        .bind(Number(id))
        .first();

        if (!result) {
            return errorResponse(
                "Record not found",
                404
            );
        }

        return jsonResponse({
            success: true,
            record: result
        });

    } catch {
        return errorResponse(
            "Failed to retrieve record",
            500
        );
    }
}


async function deleteRecord(env, table, id) {
    try {
        const result = await env.DB.prepare(`
            DELETE FROM ${table}
            WHERE id = ?
        `)
        .bind(Number(id))
        .run();

        if (result.meta.changes === 0) {
            return errorResponse(
                "Record not found",
                404
            );
        }

        return jsonResponse({
            success: true,
            id: Number(id)
        });

    } catch {
        return errorResponse(
            "Failed to delete record",
            500
        );
    }
}


// ============================================================
// ROUTER
// ============================================================

const publicRoutes = {
    "POST /v1/feedback": handleFeedback,
    "POST /v1/errors": handleErrors,
    "POST /v1/analytics": handleAnalytics
};


async function handleAdminRequest(
    request,
    env,
    resource,
    id,
    url
) {
    if (!ADMIN_TABLES.includes(resource)) {
        return errorResponse("Not Found", 404);
    }

    const method = request.method.toUpperCase();

    if (method !== "GET" && method !== "DELETE") {
        return errorResponse("Method Not Allowed", 405);
    }

    if (method === "DELETE" && !id) {
        return errorResponse("Method Not Allowed", 405);
    }

    const authResponse = await authenticateAdmin(
        request,
        env
    );

    if (authResponse) {
        return authResponse;
    }

    if (method === "GET" && !id) {
        const pageParam = url.searchParams.get("page") ?? "1";
        const page = Number(pageParam);

        if (
            !/^[1-9]\d*$/.test(pageParam) ||
            !Number.isSafeInteger(page)
        ) {
            return errorResponse("Invalid page number", 400);
        }

        return listRecords(env, resource, page);
    }

    if (method === "GET" && id) {
        return getRecord(env, resource, id);
    }

    if (method === "DELETE" && id) {
        return deleteRecord(env, resource, id);
    }

    return errorResponse("Method Not Allowed", 405);
}


async function handleRequest(request, env) {
    const origin = request.headers.get("Origin");

    if (origin !== ALLOWED_ORIGIN) {
        return errorResponse("Origin Not Allowed", 403);
    }

    if (request.method.toUpperCase() === "OPTIONS") {
        return corsResponse(handlePreflight(request));
    }

    const url = new URL(request.url);

    const method = request.method.toUpperCase();

    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    const publicHandler = publicRoutes[
        `${method} ${pathname}`
    ];

    if (publicHandler) {
        return corsResponse(
            await publicHandler(request, env)
        );
    }

    const adminMatch = pathname.match(
        /^\/v1\/admin\/(feedback|errors|analytics)(?:\/(\d+))?$/
    );

    if (!adminMatch) {
        return corsResponse(
            errorResponse("Not Found", 404)
        );
    }

    const [, resource, id] = adminMatch;

    const response = await handleAdminRequest(
        request,
        env,
        resource,
        id,
        url
    );

    return corsResponse(response);
}


// ============================================================
// WORKER ENTRY POINT
// ============================================================

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env);
    }
};
