// ============================================
// /api/verify
// Simple password gate check.
// Keeps the access code server-side so it is
// never shipped to the browser.
// ============================================

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { code } = await req.json();
    const expected = process.env.ACCESS_CODE;

    if (!expected) {
      return new Response(JSON.stringify({ ok: false, error: 'Not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const match = typeof code === 'string' && code.trim() === expected;

    return new Response(JSON.stringify({ ok: match }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
