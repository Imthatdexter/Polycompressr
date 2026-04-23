import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Proxy: Polymarket Gamma API - active market
app.get('/api/active-market', async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) {
      return res.status(400).json({ error: 'slug query parameter required' });
    }
    const response = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}&_t=${Date.now()}`,
      { headers: { 'Cache-Control': 'no-cache' } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Polymarket API error:', err);
    res.status(502).json({ error: 'Failed to fetch from Polymarket' });
  }
});

// Proxy: Polymarket CLOB API - real-time odds
app.get('/api/odds', async (req, res) => {
  try {
    const { token_ids } = req.query;
    if (!token_ids) {
      return res.status(400).json({ error: 'token_ids query parameter required' });
    }
    const ids = token_ids.split(',');
    const results = await Promise.all(
      ids.map(async (id) => {
        const response = await fetch(
          `https://clob.polymarket.com/price?token_id=${id}&side=buy`,
          { headers: { 'Cache-Control': 'no-cache' } }
        );
        return response.json();
      })
    );
    res.json(results.map((r, i) => ({ tokenId: ids[i], price: r.price })));
  } catch (err) {
    console.error('CLOB odds error:', err);
    res.status(502).json({ error: 'Failed to fetch odds from Polymarket CLOB' });
  }
});

// Proxy: Binance klines for backfill
app.get('/api/klines', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', interval = '1m', startTime, endTime, limit = 60 } = req.query;
    const params = new URLSearchParams({ symbol, interval, limit: String(limit) });
    if (startTime) params.set('startTime', startTime);
    if (endTime) params.set('endTime', endTime);

    const response = await fetch(`https://api.binance.com/api/v3/klines?${params}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Binance klines error:', err);
    res.status(502).json({ error: 'Failed to fetch klines from Binance' });
  }
});

// Serve static frontend in production
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Polycompressr server running on port ${PORT}`);
});
