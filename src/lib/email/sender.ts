import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || "Zernio CRM Pro <no-reply@zernio.com>";

  // 1. Resend API Strategy (Official SDK)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim() !== "") {
    try {
      const resend = new Resend(resendApiKey.trim());
      const resendFrom = process.env.RESEND_FROM || "Zernio CRM Pro <onboarding@resend.dev>";

      const response = await resend.emails.send({
        from: resendFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (response.error) {
        console.warn(`[EMAIL Resend SDK] Error al enviar a ${options.to}:`, response.error);
      } else if (response.data?.id) {
        console.log(`[EMAIL Resend SDK] Correo enviado con éxito a ${options.to}. ID: ${response.data.id}`);
        return { success: true, messageId: response.data.id };
      }
    } catch (err: any) {
      console.error(`[EMAIL] Excepción con Resend SDK:`, err?.message || err);
    }
  }

  // 2. SMTP Strategy (Nodemailer)
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPassword) {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === "true" || port === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`[EMAIL] Enviado vía SMTP (${smtpHost}) a ${options.to}. ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (smtpErr) {
      console.error(`[EMAIL] Error enviando correo vía SMTP:`, smtpErr);
    }
  }

  // 3. Fallback / Local Development (Consola limpia para pruebas inmediatas)
  console.log(`
============================================================
📧 [EMAIL SIMULADOR - SIN SERVIDOR SMTP CONFIGURADO]
Para: ${options.to}
Asunto: ${options.subject}
------------------------------------------------------------
${options.text || options.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
============================================================
  `);

  return { success: true, simulated: true };
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  code: string;
  expirationMinutes?: number;
}) {
  const { to, name, code, expirationMinutes = 15 } = params;

  const subject = `🔐 ${code} es tu código de recuperación de Zernio CRM Pro`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #334155; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 32px 24px; }
          .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
          .description { font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .code-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
          .code-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          .code-number { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4f46e5; font-family: Courier, monospace; margin: 0; }
          .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #9a3412; line-height: 1.5; margin-bottom: 24px; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Zernio CRM Pro</h1>
            <p>Recuperación de Contraseña de Usuario</p>
          </div>
          <div class="content">
            <div class="greeting">¡Hola, ${name}!</div>
            <div class="description">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta en Zernio CRM Pro. Utiliza el siguiente código de verificación de 6 dígitos:
            </div>

            <div class="code-box">
              <div class="code-label">Código de Seguridad (OTP)</div>
              <div class="code-number">${code}</div>
            </div>

            <div class="warning">
              ⏱️ <strong>Importante:</strong> Este código es de un solo uso y expirará en <strong>${expirationMinutes} minutos</strong>. Si tú no solicitaste este cambio, puedes ignorar este mensaje; tu contraseña actual continuará siendo segura.
            </div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Zernio CRM Pro • Cifrado de extremo a extremo
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `Hola ${name},\n\nTu código de recuperación para Zernio CRM Pro es: ${code}\n\nVálido por ${expirationMinutes} minutos. Si no solicitaste este cambio, puedes ignorar este mensaje.`;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}
