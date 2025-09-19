import express from 'express';
import cors from 'cors';
import { summarize } from '@eonmentor/shared/dist/utils/summarizer.js';
const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/summarize', (req, res) => {
  const { text } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }
  const s = summarize(text);
  return res.json({ summary: s });
});
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`[backend] listening on ${port}`));
