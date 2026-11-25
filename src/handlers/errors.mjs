/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

const ERROR_TYPES = [
    "custom",
    "css",
    "javascript",
    "language",
    "plugin",
    "server"
];


export async function handleErrors(request, env) {
    let data;

    try {
        data = await request.json();
    } catch {
        return Response.json({
            success: false,
            error: "Invalid JSON"
        }, {
            status: 400
        });
    }

    const type = data?.type;
    const message = data?.message;

    if (!ERROR_TYPES.includes(type)) {
        return Response.json({
            success: false,
            error: "Invalid error type"
        }, {
            status: 400
        });
    }

    if (
        typeof message !== "string" ||
        message.trim().length < 1 ||
        message.trim().length > 280
    ) {
        return Response.json({
            success: false,
            error: "Message must contain between 1 and 280 characters"
        }, {
            status: 400
        });
    }

    try {
        const result = await env.DB.prepare(`
            INSERT INTO errors (type, message)
            VALUES (?, ?)
        `)
        .bind(type, message.trim())
        .run();

        return Response.json({
            success: true,
            id: result.meta.last_row_id
        }, {
            status: 201
        });

    } catch {
        return Response.json({
            success: false,
            error: "Failed to save error report"
        }, {
            status: 500
        });
    }
}