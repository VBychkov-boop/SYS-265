const express = require('express');
const { Pool }  = require('pg');
const Redis     = require('ioredis');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'taskdb',
  user:     process.env.DB_USER     || 'taskuser',
  password: process.env.DB_PASS     || 'changeme',
  max: 10,
  idleTimeoutMillis: 30000,
});

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  lazyConnect: true,
});

redisClient.on('connect', () => console.log('Redis connected'));
redisClient.on('error',   (e) => console.error('Redis error:', e.message));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});
app.use('/api/', limiter);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    await redisClient.ping();
    res.json({ status: 'ok', db: 'connected', cache: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

app.get('/api/tasks', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { title, priority = 'medium' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO tasks (title, priority) VALUES ($1, $2) RETURNING *',
      [title, priority]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { done } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE tasks SET done = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [done, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM tasks WHERE id = $1', [id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
    app.listen(PORT, () =>
      console.log(`API listening on port ${PORT}`)
    );
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

start();
