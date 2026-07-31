export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'nexar-crucigrama',
    questionSource: 'wikipedia-es',
    openaiOptionalConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
}
