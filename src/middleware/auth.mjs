/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

import { JWToken } from "../utils/JWToken.mjs";


function unauthorized(message = "Unauthorized") {
    return Response.json({
        success: false,
        error: message
    }, {
        status: 401
    });
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


export async function authenticateAdmin(request, env) {
    const authorization = request.headers.get("Authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
        return unauthorized("Invalid authorization header");
    }

    const token = match[1];

    const jwt = new JWToken({
        audience: "blog-records"
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