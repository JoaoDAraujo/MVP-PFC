import nodemailer from 'nodemailer';

// ==========================================
// mailer.ts — Serviço de envio de e-mail via Gmail (Nodemailer)
// ==========================================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── E-mail de boas-vindas com QR Code do 2FA ─────────────────────────
export async function sendWelcomeEmail(
  to: string,
  username: string,
  qrCodeDataUrl: string
): Promise<void> {
  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

  await transporter.sendMail({
    from:    `"PoC Segurança Auth" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Sua conta foi criada - Configure o 2FA agora',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
        <div style="background: #1a1a2e; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #fff; margin: 0;">Bem-vindo, ${username}!</h2>
        </div>
        <div style="background: #f9f9f9; padding: 28px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <p>Sua conta foi criada com sucesso. Configure o autenticador de dois fatores (2FA) agora:</p>
          <ol>
            <li>Abra o <strong>Google Authenticator</strong></li>
            <li>Toque em <strong>"+"</strong> → <strong>"Escanear QR Code"</strong></li>
            <li>Aponte a câmera para o QR Code abaixo</li>
          </ol>
          <div style="text-align: center; margin: 24px 0;">
            <img src="cid:qrcode@poc" alt="QR Code 2FA"
              style="width: 200px; height: 200px; border: 2px solid #ddd; border-radius: 8px; padding: 8px; background: #fff;" />
          </div>
          <p style="font-size: 13px; color: #e74c3c; text-align: center;">Guarde este QR Code em local seguro como backup.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">Se você não criou esta conta, ignore este e-mail.</p>
        </div>
      </div>`,
    attachments: [{
      filename: 'qrcode-2fa.png', content: base64Data,
      encoding: 'base64', cid: 'qrcode@poc', contentType: 'image/png',
    }],
  });
}

// ── Código OTP durante o login (escolha de 2FA por e-mail) ───────────
export async function sendMfaCodeEmail(
  to: string,
  username: string,
  code: string
): Promise<void> {
  await transporter.sendMail({
    from:    `"PoC Segurança Auth" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Seu código de verificação',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
        <div style="background: #1a1a2e; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #fff; margin: 0;">Código de Verificação</h2>
        </div>
        <div style="background: #f9f9f9; padding: 28px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <p>Olá, <strong>${username}</strong>. Use o código abaixo para concluir seu login:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="display:inline-block; font-size:36px; font-weight:bold; letter-spacing:10px;
              background:#fff; border:2px dashed #f0a500; border-radius:8px; padding:16px 28px; color:#1a1a2e;">
              ${code}
            </span>
          </div>
          <p style="text-align: center; color: #e74c3c; font-size: 13px;">
            Este código expira em <strong>15 minutos</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            Se você não tentou fazer login, ignore este e-mail e considere trocar sua senha.
          </p>
        </div>
      </div>`,
  });
}

// ── Código OTP para recuperação de senha ─────────────────────────────
export async function sendRecoveryCodeEmail(
  to: string,
  username: string,
  code: string
): Promise<void> {
  await transporter.sendMail({
    from:    `"PoC Segurança Auth" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Código para redefinir sua senha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
        <div style="background: #1a1a2e; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #fff; margin: 0;">Redefinição de Senha</h2>
        </div>
        <div style="background: #f9f9f9; padding: 28px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <p>Olá, <strong>${username}</strong>. Use o código abaixo para redefinir sua senha:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="display:inline-block; font-size:36px; font-weight:bold; letter-spacing:10px;
              background:#fff; border:2px dashed #f0a500; border-radius:8px; padding:16px 28px; color:#1a1a2e;">
              ${code}
            </span>
          </div>
          <p style="text-align: center; color: #e74c3c; font-size: 13px;">
            Este código expira em <strong>15 minutos</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.
          </p>
        </div>
      </div>`,
  });
}