import QRCode from 'qrcode';
import { Resend } from 'resend';

interface RegistrationConfirmationEmailInput {
  registrationId: string;
  attempt: number;
  participantName: string;
  participantEmail: string;
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  credentialUrl: string;
}

const escapeHtml = (value?: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const safeHeaderName = (value?: string) => String(value || 'Credencia Check-in')
  .replace(/[\r\n<>]/g, '')
  .trim() || 'Credencia Check-in';

const formatEventDate = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(parsed);
};

const buildText = (input: RegistrationConfirmationEmailInput) => [
  `Olá, ${input.participantName}!`,
  '',
  `Sua inscrição no evento ${input.eventName} foi aprovada.`,
  input.eventDate ? `Data: ${formatEventDate(input.eventDate)}` : '',
  input.eventLocation ? `Local: ${input.eventLocation}` : '',
  '',
  `Acesse sua credencial: ${input.credentialUrl}`,
  '',
  'Apresente o QR Code da credencial no check-in.'
].filter(line => line !== '').join('\n');

const buildHtml = (input: RegistrationConfirmationEmailInput) => {
  const participantName = escapeHtml(input.participantName);
  const eventName = escapeHtml(input.eventName);
  const eventDate = escapeHtml(formatEventDate(input.eventDate));
  const eventLocation = escapeHtml(input.eventLocation);
  const credentialUrl = escapeHtml(input.credentialUrl);

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:620px;margin:0 auto;padding:32px 16px">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
        <div style="background:#10b981;padding:22px 28px">
          <div style="font-size:22px;font-weight:800;color:#052e2b">Inscrição aprovada</div>
        </div>
        <div style="padding:28px">
          <p style="font-size:18px;margin:0 0 12px">Olá, <strong>${participantName}</strong>!</p>
          <p style="line-height:1.6;margin:0 0 22px">Sua inscrição no evento <strong>${eventName}</strong> foi aprovada.</p>
          ${(eventDate || eventLocation) ? `<div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;line-height:1.7">
            ${eventDate ? `<div><strong>Data:</strong> ${eventDate}</div>` : ''}
            ${eventLocation ? `<div><strong>Local:</strong> ${eventLocation}</div>` : ''}
          </div>` : ''}
          <div style="text-align:center;margin:24px 0">
            <img src="cid:credential-qr" width="220" height="220" alt="QR Code da credencial" style="display:block;margin:0 auto 16px;max-width:220px;width:100%;height:auto" />
            <a href="${credentialUrl}" style="display:inline-block;background:#10b981;color:#052e2b;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:10px">Acessar minha credencial</a>
          </div>
          <p style="font-size:13px;line-height:1.5;color:#64748b;margin:24px 0 0">Apresente este QR Code no check-in. Se o botão não abrir, copie este endereço:<br><a href="${credentialUrl}" style="color:#047857;word-break:break-all">${credentialUrl}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`;
};

export async function sendRegistrationConfirmationEmail(input: RegistrationConfirmationEmailInput) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || '').trim();
  const fromName = safeHeaderName(process.env.RESEND_FROM_NAME);

  if (!apiKey) throw new Error('RESEND_API_KEY não configurada.');
  if (!fromEmail) throw new Error('RESEND_FROM_EMAIL não configurado.');
  if (!input.participantEmail) throw new Error('A inscrição não possui e-mail.');
  if (!input.credentialUrl) throw new Error('Não foi possível gerar o link da credencial.');

  const qrCode = await QRCode.toBuffer(input.credentialUrl, {
    type: 'png',
    width: 440,
    margin: 2,
    errorCorrectionLevel: 'M'
  });
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: input.participantEmail,
    subject: `Inscrição aprovada — ${input.eventName}`,
    html: buildHtml(input),
    text: buildText(input),
    attachments: [{
      filename: 'qr-code-credencial.png',
      content: qrCode,
      contentType: 'image/png',
      contentId: 'credential-qr'
    }],
    tags: [{ name: 'registration_id', value: input.registrationId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256) }]
  }, {
    idempotencyKey: `registration-confirmation/${input.registrationId}/${input.attempt}`
  });

  if (error) throw new Error(error.message || 'O Resend recusou o envio.');
  if (!data?.id) throw new Error('O Resend não retornou a identificação do e-mail.');
  return { id: data.id };
}
