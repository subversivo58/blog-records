/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/


async function listRecords(env, table) {
    try {
        const result = await env.DB.prepare(`
            SELECT *
            FROM ${table}
            ORDER BY created_at DESC, id DESC
        `).all();

        return Response.json({
            success: true,
            results: result.results
        });

    } catch {
        return Response.json({
            success: false,
            error: "Failed to retrieve records"
        }, {
            status: 500
        });
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
            return Response.json({
                success: false,
                error: "Record not found"
            }, {
                status: 404
            });
        }

        return Response.json({
            success: true,
            record: result
        });

    } catch {
        return Response.json({
            success: false,
            error: "Failed to retrieve record"
        }, {
            status: 500
        });
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
            return Response.json({
                success: false,
                error: "Record not found"
            }, {
                status: 404
            });
        }

        return Response.json({
            success: true,
            id: Number(id)
        });

    } catch {
        return Response.json({
            success: false,
            error: "Failed to delete record"
        }, {
            status: 500
        });
    }
}


// ------------------------------------------------------------
// FEEDBACK
// ------------------------------------------------------------

export async function listFeedback(request, env) {
    return listRecords(env, "feedback");
}

export async function getFeedback(request, env, ctx, id) {
    return getRecord(env, "feedback", id);
}

export async function deleteFeedback(request, env, ctx, id) {
    return deleteRecord(env, "feedback", id);
}


// ------------------------------------------------------------
// ERRORS
// ------------------------------------------------------------

export async function listErrors(request, env) {
    return listRecords(env, "errors");
}

export async function getError(request, env, ctx, id) {
    return getRecord(env, "errors", id);
}

export async function deleteError(request, env, ctx, id) {
    return deleteRecord(env, "errors", id);
}


// ------------------------------------------------------------
// ANALYTICS
// ------------------------------------------------------------

export async function listAnalytics(request, env) {
    return listRecords(env, "analytics");
}

export async function getAnalytics(request, env, ctx, id) {
    return getRecord(env, "analytics", id);
}

export async function deleteAnalytics(request, env, ctx, id) {
    return deleteRecord(env, "analytics", id);
}