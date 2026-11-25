
/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

export async function handleAnalytics(request, env) {
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

    try {
        const result = await env.DB.prepare(`
            INSERT INTO analytics (content)
            VALUES (?)
        `)
        .bind(JSON.stringify(data))
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
            error: "Failed to save analytics"
        }, {
            status: 500
        });
    }
}
