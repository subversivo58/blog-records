
/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

import { handleFeedback } from "../handlers/feedback.mjs";
import { handleErrors } from "../handlers/errors.mjs";
import { handleAnalytics } from "../handlers/analytics.mjs";

import {
    listFeedback,
    getFeedback,
    deleteFeedback,
    listErrors,
    getError,
    deleteError,
    listAnalytics,
    getAnalytics,
    deleteAnalytics
} from "../handlers/admin.mjs";

import { authenticateAdmin } from "../middleware/auth.mjs";


const publicRoutes = {
    "POST /v1/feedback": handleFeedback,
    "POST /v1/errors": handleErrors,
    "POST /v1/analytics": handleAnalytics
};


const adminRoutes = {
    feedback: {
        list: listFeedback,
        get: getFeedback,
        delete: deleteFeedback
    },

    errors: {
        list: listErrors,
        get: getError,
        delete: deleteError
    },

    analytics: {
        list: listAnalytics,
        get: getAnalytics,
        delete: deleteAnalytics
    }
};


export async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    const publicHandler = publicRoutes[`${method} ${pathname}`];

    if (publicHandler) {
        return publicHandler(request, env, ctx);
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

    let handler;

    if (method === "GET" && !id) {
        handler = adminRoutes[resource].list;
    } else if (method === "GET" && id) {
        handler = adminRoutes[resource].get;
    } else if (method === "DELETE" && id) {
        handler = adminRoutes[resource].delete;
    }

    if (!handler) {
        return new Response("Method Not Allowed", {
            status: 405
        });
    }

    const authResponse = await authenticateAdmin(request, env);

    if (authResponse) {
        return authResponse;
    }

    return handler(request, env, ctx, id);
}
