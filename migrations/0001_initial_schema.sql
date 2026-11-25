-- ============================================================
-- BLOG RECORDS
-- Initial Database Schema
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: feedback
-- ------------------------------------------------------------

CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    rating INTEGER NOT NULL CHECK (
        rating BETWEEN 1 AND 5
    ),

    message TEXT NOT NULL CHECK (
        length(trim(message)) BETWEEN 1 AND 500
    ),

    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);


-- ------------------------------------------------------------
-- TABLE: errors
-- ------------------------------------------------------------

CREATE TABLE errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    type TEXT NOT NULL CHECK (
        type IN (
            'custom',
            'css',
            'javascript',
            'language',
            'plugin',
            'server'
        )
    ),

    message TEXT NOT NULL CHECK (
        length(trim(message)) BETWEEN 1 AND 280
    ),

    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);


-- ------------------------------------------------------------
-- TABLE: analytics
-- ------------------------------------------------------------

CREATE TABLE analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    content TEXT NOT NULL CHECK (
        json_valid(content)
    ),

    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);