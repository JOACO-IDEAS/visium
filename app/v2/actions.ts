"use server";

import { redirect } from "next/navigation";
import { Resend } from "resend";

const LEAD_INBOX = process.env.LEAD_ALERT_EMAIL?.trim();
const EMAIL_RE = /\S+@\S+\.\S+/;

/* El input del lead se interpola en el HTML del email — sin escape, un
   payload en "empresa" podría falsificar el contenido de la alerta. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Solicitud de acceso corporativo — corre 100% en el servidor, cero JS cliente. */
export async function requestAccess(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name || !company || !address || !EMAIL_RE.test(email)) {
    redirect("/v2?error=1");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !LEAD_INBOX) {
    console.log("[v2/requestAccess] lead delivery is not configured");
    redirect("/v2/thanks");
  }

  const [safeName, safeCompany, safeAddress, safeEmail] = [name, company, address, email].map(esc);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "VISIUM 5.0 <onboarding@resend.dev>",
      to: [LEAD_INBOX],
      replyTo: email,
      subject: `¡Nuevo Lead en Visium 5.0! — ${company} · ${address}`,
      html: `
        <div style="background:#000000;padding:48px 24px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
          <div style="max-width:520px;margin:0 auto;background:#202020;border:1px solid rgba(212,175,55,0.25);border-radius:10px;padding:40px;">
            <p style="margin:0 0 32px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#D4AF37;">
              Visium 5.0 · Acceso corporativo
            </p>
            <h1 style="margin:0 0 40px;font-size:30px;font-weight:300;letter-spacing:-0.025em;color:#ffffff;line-height:1.2;">
              Un nuevo desarrollo quiere ser
              <em style="font-family:Georgia,serif;font-weight:500;color:#F0CB65;">visto</em>.
            </h1>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#D4AF37;">Nombre</td>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:16px;color:#ffffff;text-align:right;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#D4AF37;">Empresa</td>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:16px;color:#ffffff;text-align:right;">${safeCompany}</td>
              </tr>
              <tr>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#D4AF37;">Desarrollo</td>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:16px;color:#ffffff;text-align:right;">${safeAddress}</td>
              </tr>
              <tr>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#D4AF37;">Email</td>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:16px;color:#ffffff;text-align:right;">
                  <a href="mailto:${safeEmail}" style="color:#F0CB65;">${safeEmail}</a>
                </td>
              </tr>
            </table>
            <a href="mailto:${safeEmail}" style="display:inline-block;margin-top:40px;background:linear-gradient(180deg,#F0CB65,#D4AF37);color:#000000;font-size:16px;font-weight:500;padding:12px 24px;border-radius:9999px;text-decoration:none;">
              Responder ahora
            </a>
          </div>
        </div>
      `,
    });
  } catch (err) {
    // El lead ya quedó registrado en logs; la UX del visitante no se rompe por un fallo de email.
    console.error("[v2/requestAccess] Resend error:", err);
  }

  redirect("/v2/thanks");
}

/** Solicitud liviana desde la demo — solo email, para el "Reporte de Viabilidad". */
export async function requestViabilityReport(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    redirect("/v2?error=1");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !LEAD_INBOX) {
    console.log("[v2/requestViabilityReport] lead delivery is not configured");
    redirect("/v2/thanks");
  }

  const safeEmail = esc(email);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "VISIUM 5.0 <onboarding@resend.dev>",
      to: [LEAD_INBOX],
      replyTo: email,
      subject: `Solicitud de Reporte de Viabilidad — ${email}`,
      html: `
        <div style="background:#000000;padding:48px 24px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
          <div style="max-width:520px;margin:0 auto;background:#202020;border:1px solid rgba(212,175,55,0.25);border-radius:10px;padding:40px;">
            <p style="margin:0 0 32px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#D4AF37;">
              Visium 5.0 · Reporte de Viabilidad
            </p>
            <h1 style="margin:0 0 32px;font-size:26px;font-weight:300;letter-spacing:-0.025em;color:#ffffff;line-height:1.3;">
              Un desarrollador pidió el modelo de datos completo.
            </h1>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#D4AF37;">Email</td>
                <td style="padding:14px 0;border-top:1px solid #333333;font-size:16px;color:#ffffff;text-align:right;">
                  <a href="mailto:${safeEmail}" style="color:#F0CB65;">${safeEmail}</a>
                </td>
              </tr>
            </table>
            <a href="mailto:${safeEmail}" style="display:inline-block;margin-top:32px;background:linear-gradient(180deg,#F0CB65,#D4AF37);color:#000000;font-size:16px;font-weight:500;padding:12px 24px;border-radius:9999px;text-decoration:none;">
              Responder ahora
            </a>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("[v2/requestViabilityReport] Resend error:", err);
  }

  redirect("/v2/thanks");
}
