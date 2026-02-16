CREATE TABLE IF NOT EXISTS tasks (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    priority    VARCHAR(10)  NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low', 'medium', 'high')),
    done        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);

INSERT INTO tasks (title, priority) VALUES
    ('Set up Docker environment',   'high'),
    ('Write API documentation',     'medium'),
    ('Add authentication layer',    'high'),
    ('Configure CI/CD pipeline',    'medium'),
    ('Review pull requests',        'low');
