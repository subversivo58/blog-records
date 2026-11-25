
/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

import * as JWToken from "../utils/JWToken.mjs";


const JWT_AUDIENCE = "blog-records";


function unauthorized(message = "Unauthorized") {
    return new Response(message, {
        status: 401,
        headers: {
            "Content-Type": "text/plain; charset=utf-8"
        }
    });
}


export async function authenticateAdmin(request, env) {
    const authorization = request.headers.get("Authorization");

    if (!authorization) {
        return unauthorized();
    }

    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
        return unauthorized();
    }

    const token = match[1];

    let decoded;

    try {
        decoded = JWToken.decode(token);
    } catch {
        return unauthorized("Invalid token");
    }

    if (!decoded?.header?.kid) {
        return unauthorized("Missing key identifier");
    }

    const kid = decoded.header.kid;

    if (!/^K_[A-Za-z0-9]+$/.test(kid)) {
        return unauthorized("Invalid key identifier");
    }

    const publicKey = env[kid];

    if (!publicKey) {
        return unauthorized("Public key not found");
    }

    let valid;

    try {
        valid = await JWToken.verify({
            token,
            publicKey
        });
    } catch {
        return unauthorized("Invalid token");
    }

    if (!valid) {
        return unauthorized("Invalid token");
    }

    if (JWToken.isExpired(token)) {
        return unauthorized("Expired token");
    }

    if (decoded.payload?.aud !== JWT_AUDIENCE) {
        return unauthorized("Invalid audience");
    }

    return null;
}
