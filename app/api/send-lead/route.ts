import { NextResponse } from "next/server";
import { Resend } from "resend";

const LEAD_INBOX = process.env.LEAD_ALERT_EMAIL?.trim();

const EMAIL_RE = /\S+@\S+\.\S+/;
const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function leadEmailHtml(direction: string, email: string) {
  const gold = "#D4B36A";
  const goldBright = "#E6C98A";
  return `
  <div style="margin:0;padding:40px 16px;background:#0d0d0d;font-family:'JetBrains Mono','SF Mono',Menlo,Consolas,monospace;">
    <div style="max-width:560px;margin:0 auto;border:1px solid rgba(212,179,106,0.28);border-radius:18px;background:#101013;overflow:hidden;">
      <div style="padding:28px 36px;border-bottom:1px solid rgba(212,179,106,0.18);">
        <p style="margin:0;font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:${gold};">
          VISIUM 5.0 · Motor de conversión
        </p>
        <h1 style="margin:14px 0 0;font-size:22px;font-weight:600;color:#f2f0ea;">
          ¡Nuevo Lead en Visium 5.0!
        </h1>
      </div>
      <div style="padding:30px 36px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#5a5a66;">
          Dirección solicitada
        </p>
        <p style="margin:0 0 24px;font-size:17px;color:${goldBright};">
          ${esc(direction)}
        </p>
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#5a5a66;">
          Email corporativo
        </p>
        <p style="margin:0;font-size:17px;color:${goldBright};">
          <a href="mailto:${esc(email)}" style="color:${goldBright};text-decoration:none;">${esc(email)}</a>
        </p>
      </div>
      <div style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#5a5a66;">
          Capturado por el embudo de simulación espacial · visium.app
        </p>
      </div>
    </div>
  </div>`;
}

export async function POST(req: Request) {
  let body: { direction?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const direction = body.direction?.trim();
  const email = body.email?.trim();
  if (!direction || !email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Faltan datos del lead" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !LEAD_INBOX) {
    console.error("[send-lead] lead delivery is not configured");
    return NextResponse.json({ error: "Servicio de alertas no configurado" }, { status: 503 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "VISIUM 5.0 <onboarding@resend.dev>",
    to: LEAD_INBOX,
    replyTo: email,
    subject: `¡Nuevo Lead en Visium 5.0! — ${direction}`,
    html: leadEmailHtml(direction, email),
  });

  if (error) {
    console.error("[send-lead] Error de Resend:", error);
    return NextResponse.json({ error: "No se pudo enviar la alerta" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
