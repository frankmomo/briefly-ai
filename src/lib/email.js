// ============================================================
// src/lib/email.js — Servicio de envío de emails transaccionales
// Soporta: SendGrid (primary) y Nodemailer (fallback SMTP)
// ============================================================
import nodemailer from 'nodemailer';

// ─── Config ──────────────────────────────────────────────

const FROM_NAME = 'Briefly AI';
const FROM_EMAIL = process.env.EMAIL_FROM || 'briefing@briefly-ai.com';

// ─── SendGrid (primary) ──────────────────────────────────

let sendgridClient = null;

async function getSendGridClient() {
  if (!sendgridClient && process.env.SENDGRID_API_KEY) {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgridClient = sgMail;
  }
  return sendgridClient;
}

// ─── SMTP / Nodemailer (fallback) ────────────────────────

let smtpTransporter = null;

function getSmtpTransporter() {
  if (!smtpTransporter && process.env.SMTP_HOST) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return smtpTransporter;
}

// ─── Send Email ──────────────────────────────────────────

/**
 * Envía un email transaccional.
 * Prioriza SendGrid si está configurado, fallback a SMTP/Nodemailer.
 *
 * @param {Object} options
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} options.html - Cuerpo HTML
 * @param {string} [options.text] - Versión texto plano (opcional)
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('Destinatario requerido');
  if (!subject) throw new Error('Asunto requerido');
  if (!html) throw new Error('Cuerpo HTML requerido');

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  // Intentar con SendGrid primero
  const sgClient = await getSendGridClient();
  if (sgClient) {
    try {
      await sgClient.send(msg);
      console.log(`[Email] Sent via SendGrid to ${to}: "${subject}"`);
      return { provider: 'sendgrid', success: true };
    } catch (err) {
      console.error(`[Email] SendGrid error for ${to}:`, err.message);
      // Fallback a SMTP si SendGrid falla
    }
  }

  // Fallback SMTP
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });
      console.log(`[Email] Sent via SMTP to ${to}: "${subject}"`);
      return { provider: 'smtp', success: true };
    } catch (err) {
      console.error(`[Email] SMTP error for ${to}:`, err.message);
      throw err;
    }
  }

  throw new Error(
    'No email provider configured. Set SENDGRID_API_KEY or SMTP_* variables in .env'
  );
}

// ─── Templates ───────────────────────────────────────────

/**
 * Genera el HTML del briefing diario para enviar por email.
 */
export function buildDigestEmailHtml(userName, entries, date) {
  const dateFormatted = new Date(date).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const importanceBadge = (imp) => {
    const colors = {
      alta: '#ef4444',
      media: '#f59e0b',
      baja: '#3b82f6',
    };
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:${colors[imp] || '#6b7280'}">${imp.toUpperCase()}</span>`;
  };

  const entriesHtml = entries
    .map(
      (e, i) => `
    <tr>
      <td style="padding:20px 0;border-bottom:1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="30" valign="top" style="font-size:12px;color:#9ca3af;font-family:monospace;">${String(i + 1).padStart(2, '0')}</td>
            <td>
              <div style="margin-bottom:8px;">${importanceBadge(e.importance)}</div>
              <h3 style="margin:0 0 6px;font-size:16px;color:#111827;">${e.topic}</h3>
              <p style="margin:0 0 10px;font-size:14px;color:#6b7280;line-height:1.5;">${e.summary}</p>
              ${
                e.action
                  ? `<div style="padding:10px 14px;background:#eef2ff;border-radius:6px;border-left:3px solid #6366f1;">
                    <span style="font-size:11px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;">Acción:</span>
                    <p style="margin:4px 0 0;font-size:13px;color:#4338ca;">${e.action}</p>
                  </div>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:32px;text-align:center;">
              <h1 style="margin:0;font-size:20px;color:white;font-weight:700;">☕ Briefly AI</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">Tu briefing ejecutivo del día</p>
            </td>
          </tr>

          <!-- Date -->
          <tr>
            <td style="padding:20px 32px;background:#f5f3ff;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#6b7280;">${dateFormatted}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">
                Hola <strong style="color:#111827;">${userName}</strong>, aquí están los temas que requieren tu atención hoy:
              </p>
            </td>
          </tr>

          <!-- Entries -->
          <tr>
            <td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${entriesHtml}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
                Este briefing fue generado automáticamente por Briefly AI.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${process.env.APP_URL || 'https://briefly-ai.vercel.app'}/dashboard" style="color:#6366f1;text-decoration:none;">Ver en dashboard</a>
                &nbsp;·&nbsp;
                <a href="${process.env.APP_URL || 'https://briefly-ai.vercel.app'}/settings" style="color:#6366f1;text-decoration:none;">Preferencias</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envía el briefing diario por email a un usuario.
 * Se llama DESPUÉS de que el worker guarda el digest en Supabase.
 */
export async function sendDigestEmail(userId, userName, userEmail, entries, date) {
  if (!userId || !userEmail) {
    console.warn(`[Email] sendDigestEmail: userId o email faltante (${userId}, ${userEmail})`);
    return;
  }

  const subject = `☕ Tu briefing Briefly — ${new Date(date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  const html = buildDigestEmailHtml(userName || 'usuario', entries, date);

  await sendEmail({
    to: userEmail,
    subject,
    html,
  });

  console.log(`[Email] Digest sent to ${userEmail} (${userId})`);
}
