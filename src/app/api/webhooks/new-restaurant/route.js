import { NextResponse } from 'next/server';

// POST /api/webhooks/new-restaurant
//
// Relais de notification : Supabase (trigger sur restaurants) ne peut pas
// joindre api.telegram.org depuis sa région (handshake TLS filtré). On passe
// donc par cette route, hébergée sur Vercel, qui elle joint Telegram sans
// souci.
//
// Auth : header `Authorization: Bearer <RESTAURANT_WEBHOOK_SECRET>` — le même
// secret est stocké côté Supabase dans Vault (restaurant_webhook_secret) et
// injecté par le trigger. Sans ça, n'importe qui pourrait spammer la route.
//
// Variables d'environnement (Vercel → Settings → Environment Variables) :
//   RESTAURANT_WEBHOOK_SECRET  chaîne aléatoire, identique au secret Vault
//   TELEGRAM_BOT_TOKEN         token du bot (régénéré via BotFather)
//   TELEGRAM_CHAT_ID           id du chat qui reçoit les notifications

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(request) {
  const secret = process.env.RESTAURANT_WEBHOOK_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('new-restaurant webhook : TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID manquants');
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });
  }

  const { name, owner_email, location, created_at } = payload;

  const dateLabel = created_at
    ? new Date(created_at).toLocaleString('fr-FR', {
        timeZone: 'Africa/Douala',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const text =
    '🆕 <b>Nouveau restaurant en attente de validation</b>\n\n' +
    `<b>${escapeHtml(name || 'Sans nom')}</b>\n` +
    `${escapeHtml(owner_email || '—')}\n` +
    `${escapeHtml(location || 'Localisation non renseignée')}` +
    (dateLabel ? `\n\nInscrit le ${escapeHtml(dateLabel)}` : '');

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', text }),
    });

    if (!tgRes.ok) {
      const detail = await tgRes.text();
      console.error('new-restaurant webhook : Telegram a répondu', tgRes.status, detail);
      return NextResponse.json({ error: 'Envoi Telegram échoué.' }, { status: 502 });
    }
  } catch (err) {
    console.error('new-restaurant webhook : Telegram injoignable', err);
    return NextResponse.json({ error: 'Telegram injoignable.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
