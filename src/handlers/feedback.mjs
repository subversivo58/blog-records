
/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

export async function handleFeedback(request, env) {
    let data;

    try {
        data = await request.json();
    } catch {
        return Response.json({
            error: "Invalid JSON"
        }, {
            status: 400
        });
    }

    const rating = data?.rating;
    const message = data?.message;

    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        return Response.json({
            error: "Rating must be an integer between 1 and 5"
        }, {
            status: 400
        });
    }

    if (
        typeof message !== "string" ||
        message.trim().length < 1 ||
        message.trim().length > 500
    ) {
        return Response.json({
            error: "Message must contain between 1 and 500 characters"
        }, {
            status: 400
        });
    }

    try {
        const result = await env.DB.prepare(`
            INSERT INTO feedback (rating, message)
            VALUES (?, ?)
        `)
        .bind(rating, message.trim())
        .run();

        return Response.json({
            success: true,
            id: result.meta.last_row_id
        }, {
            status: 201
        });

    } catch {
        return Response.json({
            error: "Failed to save feedback"
        }, {
            status: 500
        });
    }
}
