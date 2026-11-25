/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

import { JWToken } from "./JWToken.mjs";


const JWT_AUDIENCE = "blog-records";

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

    if (!storedPublicKey) {
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

async function listRecords(env, table) {
    try {
        const result = await env.DB.prepare(`
            SELECT *
            FROM ${table}
            ORDER BY created_at DESC, id DESC
        `).all();

        return jsonResponse({
            success: true,
            results: result.results
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
    id
) {
    if (!ADMIN_TABLES.includes(resource)) {
        return new Response("Not Found", {
            status: 404
        });
    }

    const method = request.method.toUpperCase();

    if (method !== "GET" && method !== "DELETE") {
        return new Response("Method Not Allowed", {
            status: 405
        });
    }

    if (method === "DELETE" && !id) {
        return new Response("Method Not Allowed", {
            status: 405
        });
    }

    const authResponse = await authenticateAdmin(
        request,
        env
    );

    if (authResponse) {
        return authResponse;
    }

    if (method === "GET" && !id) {
        return listRecords(env, resource);
    }

    if (method === "GET" && id) {
        return getRecord(env, resource, id);
    }

    if (method === "DELETE" && id) {
        return deleteRecord(env, resource, id);
    }

    return new Response("Method Not Allowed", {
        status: 405
    });
}


async function handleRequest(request, env) {
    const url = new URL(request.url);

    const method = request.method.toUpperCase();

    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    const publicHandler = publicRoutes[
        `${method} ${pathname}`
    ];

    if (publicHandler) {
        return publicHandler(request, env);
    }

    const adminMatch = pathname.match(
        /^\/v1\/admin\/(feedback|errors|analytics)(?:\/(\d+))?$/
    );

    if (!adminMatch) {
        return new Response("Not Found", {
            status: 404
        });
    }

    const [, resource, id] = adminMatch;

    return handleAdminRequest(
        request,
        env,
        resource,
        id
    );
}


// ============================================================
// WORKER ENTRY POINT
// ============================================================

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env, ctx);
    }
};