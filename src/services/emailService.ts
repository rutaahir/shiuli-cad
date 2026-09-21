/**
 * Shiuli CAD Studio - Production Email Service
 * Configured with Gmail SMTP transport:
 * Sender: socialbuzz31@gmail.com
 * App Password: rcyg ebys rsgn yguc
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Dispatches an email via the Vite nodemailer middleware / backend API.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.warn('Email API dispatch warning:', data.error || 'Failed to send via server endpoint');
      return {
        success: false,
        error: data.error || 'Failed to send email via SMTP service',
      };
    }

    console.log('✅ Email successfully dispatched to:', payload.to, 'MessageId:', data.messageId);
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: any) {
    console.error('❌ Email dispatch exception:', err);
    return {
      success: false,
      error: err?.message || 'Network exception during email dispatch',
    };
  }
}

/**
 * 1. Send OTP Verification Code Email
 */
export async function sendOtpEmail(toEmail: string, otpCode: string, purpose: string = 'Account Verification & Security Access') {
  const subject = `[Shiuli CAD Studio] Security Verification Code: ${otpCode}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070D22; color: #FAF8F3; padding: 40px 30px; border-radius: 16px; border: 1px solid #D4AF37;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: Georgia, serif; color: #F5E7A3; margin: 0; font-size: 28px; letter-spacing: 2px;">SHIULI CAD STUDIO</h1>
        <p style="color: #C9C2A6; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 6px;">Jewellery Design | 3D Modeling | Master CAD Files</p>
      </div>
      
      <div style="background-color: #0B1436; padding: 25px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3); text-align: center; margin-bottom: 25px;">
        <p style="color: #C9C2A6; font-size: 13px; margin-bottom: 15px;">Your requested One-Time Security Code for <strong>${purpose}</strong> is:</p>
        <div style="font-family: monospace; font-size: 36px; font-weight: bold; color: #F5E7A3; letter-spacing: 10px; background-color: #060A1B; padding: 15px 25px; border-radius: 10px; border: 1px border-[#D4AF37]; display: inline-block;">
          ${otpCode}
        </div>
        <p style="color: #94A3B8; font-size: 11px; margin-top: 15px;">This verification code is valid for 10 minutes. Please do not share it with anyone.</p>
      </div>

      <p style="color: #C9C2A6; font-size: 12px; line-height: 1.6;">If you did not request this security code, please disregard this email or contact atelier support immediately at <a href="mailto:hello@shiulicadstudio.com" style="color: #F5E7A3; text-decoration: underline;">hello@shiulicadstudio.com</a>.</p>

      <div style="border-top: 1px solid rgba(212,175,55,0.2); margin-top: 30px; padding-top: 20px; text-align: center; color: #64748B; font-size: 10px;">
        <p style="margin: 3px 0;">468/6, CHATRABHUJDARSHAN CO OP H.SOC, MANEK CHOWK, SANKADI SHERI, OPP B.D.COLLEGE, AHMEDABAD 1</p>
        <p style="margin: 3px 0;">Phone: +91 95747 87098 | Email: hello@shiulicadstudio.com</p>
        <p style="margin: 10px 0 0 0; color: #475569;">© ${new Date().getFullYear()} Shiuli CAD Studio. All Rights Reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text: `Your Shiuli CAD Studio OTP verification code is ${otpCode}. It is valid for 10 minutes.`,
  });
}

/**
 * 2. Send CAD File Download Links & Purchase Receipt Email
 */
export async function sendCadDownloadEmail(
  toEmail: string,
  productTitle: string,
  fileFormats: string[],
  downloadUrl: string,
  licenseType: string = 'Standard Commercial License'
) {
  const subject = `[Shiuli CAD Studio] Access Your CAD Download: ${productTitle}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070D22; color: #FAF8F3; padding: 40px 30px; border-radius: 16px; border: 1px solid #D4AF37;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: Georgia, serif; color: #F5E7A3; margin: 0; font-size: 28px; letter-spacing: 2px;">SHIULI CAD STUDIO</h1>
        <p style="color: #C9C2A6; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 6px;">Master CAD Deliverables Vault</p>
      </div>

      <div style="background-color: #0B1436; padding: 25px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3); margin-bottom: 25px;">
        <h2 style="font-family: Georgia, serif; color: #FAF8F3; font-size: 20px; margin-top: 0;">Order Deliverable Ready</h2>
        <p style="color: #C9C2A6; font-size: 13px; line-height: 1.6;">Thank you for purchasing <strong>${productTitle}</strong>. Your master watertight production files are ready for instant download.</p>
        
        <div style="background-color: #060A1B; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 3px solid #D4AF37;">
          <p style="margin: 4px 0; font-size: 12px; color: #F5E7A3;"><strong>Design Title:</strong> ${productTitle}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #C9C2A6;"><strong>Included Formats:</strong> ${fileFormats.join(', ')}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #C9C2A6;"><strong>License:</strong> ${licenseType}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #C9C2A6;"><strong>Mesh Tolerance:</strong> 0.02mm Watertight Solid (Zero Non-Manifold Edges)</p>
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="${downloadUrl}" style="background-color: #D4AF37; color: #080E24; font-weight: bold; padding: 14px 28px; border-radius: 30px; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
            Download Master CAD Pack (.3DM / .STL)
          </a>
        </div>
      </div>

      <p style="color: #C9C2A6; font-size: 12px; line-height: 1.6;">Need custom modifications, stone dimension tweaking, or technical assistance with wax printing? Reply to this email or contact our senior CAD engineer on WhatsApp at <a href="https://wa.me/919574787098" style="color: #F5E7A3; text-decoration: underline;">+91 95747 87098</a>.</p>

      <div style="border-top: 1px solid rgba(212,175,55,0.2); margin-top: 30px; padding-top: 20px; text-align: center; color: #64748B; font-size: 10px;">
        <p style="margin: 3px 0;">468/6, CHATRABHUJDARSHAN CO OP H.SOC, MANEK CHOWK, SANKADI SHERI, OPP B.D.COLLEGE, AHMEDABAD 1</p>
        <p style="margin: 3px 0;">Phone: +91 95747 87098 | Email: hello@shiulicadstudio.com</p>
        <p style="margin: 10px 0 0 0; color: #475569;">© ${new Date().getFullYear()} Shiuli CAD Studio. All Rights Reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text: `Your CAD deliverables for ${productTitle} are ready for download. Link: ${downloadUrl}`,
  });
}

/**
 * 3. Send Custom Design Request Confirmation Email
 */
export async function sendCustomDesignConfirmationEmail(toEmail: string, designTitle: string, clientName: string, categoryName: string, detailsSummary: string) {
  const subject = `[Shiuli CAD Studio] Custom Design Request Received: ${designTitle}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070D22; color: #FAF8F3; padding: 40px 30px; border-radius: 16px; border: 1px solid #D4AF37;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: Georgia, serif; color: #F5E7A3; margin: 0; font-size: 28px; letter-spacing: 2px;">SHIULI CAD STUDIO</h1>
        <p style="color: #C9C2A6; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 6px;">Bespoke Jewellery Engineering</p>
      </div>

      <div style="background-color: #0B1436; padding: 25px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3); margin-bottom: 25px;">
        <h2 style="font-family: Georgia, serif; color: #FAF8F3; font-size: 18px; margin-top: 0;">Dear ${clientName || 'Jeweller'},</h2>
        <p style="color: #C9C2A6; font-size: 13px; line-height: 1.6;">We have successfully received your custom CAD design submission for <strong>"${designTitle}"</strong> (${categoryName}).</p>

        <div style="background-color: #060A1B; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 3px solid #D4AF37;">
          <p style="margin: 4px 0; font-size: 12px; color: #F5E7A3;"><strong>Submission Reference:</strong> ${designTitle}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #C9C2A6;"><strong>Category:</strong> ${categoryName}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #C9C2A6;"><strong>Details & Specs:</strong> ${detailsSummary}</p>
        </div>

        <p style="color: #C9C2A6; font-size: 12px; line-height: 1.6;">Our Senior MatrixGold / Rhino 8 CAD Modeler is reviewing your specifications and reference materials. You will receive an official studio estimate and delivery timeline shortly.</p>
      </div>

      <div style="border-top: 1px solid rgba(212,175,55,0.2); margin-top: 30px; padding-top: 20px; text-align: center; color: #64748B; font-size: 10px;">
        <p style="margin: 3px 0;">468/6, CHATRABHUJDARSHAN CO OP H.SOC, MANEK CHOWK, SANKADI SHERI, OPP B.D.COLLEGE, AHMEDABAD 1</p>
        <p style="margin: 3px 0;">Phone: +91 95747 87098 | Email: hello@shiulicadstudio.com</p>
        <p style="margin: 10px 0 0 0; color: #475569;">© ${new Date().getFullYear()} Shiuli CAD Studio. All Rights Reserved.</p>
      </div>
    </div>
  `;

  // Also send copy to studio inbox socialbuzz31@gmail.com
  await sendEmail({
    to: 'socialbuzz31@gmail.com',
    subject: `[STUDIO ALERT] New Custom Design Request: ${designTitle} from ${clientName}`,
    html: `<p><strong>Client:</strong> ${clientName} (${toEmail})</p><p><strong>Title:</strong> ${designTitle}</p><p><strong>Category:</strong> ${categoryName}</p><p><strong>Specs:</strong> ${detailsSummary}</p>`,
    text: `New Custom Design Request from ${clientName} (${toEmail}): ${designTitle}`,
  });

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text: `Dear ${clientName}, your custom CAD design request "${designTitle}" has been received by Shiuli CAD Studio.`,
  });
}

/**
 * 4. Send Contact Form Submission Email
 */
export async function sendContactFormEmail(name: string, clientEmail: string, messageSubject: string, messageBody: string) {
  const subject = `[Shiuli CAD Studio] We Received Your Inquiry: ${messageSubject}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070D22; color: #FAF8F3; padding: 40px 30px; border-radius: 16px; border: 1px solid #D4AF37;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: Georgia, serif; color: #F5E7A3; margin: 0; font-size: 28px; letter-spacing: 2px;">SHIULI CAD STUDIO</h1>
        <p style="color: #C9C2A6; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 6px;">Client Care & Support</p>
      </div>

      <div style="background-color: #0B1436; padding: 25px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3); margin-bottom: 25px;">
        <h2 style="font-family: Georgia, serif; color: #FAF8F3; font-size: 18px; margin-top: 0;">Hello ${name},</h2>
        <p style="color: #C9C2A6; font-size: 13px; line-height: 1.6;">Thank you for contacting Shiuli CAD Studio. We have received your inquiry regarding <strong>"${messageSubject}"</strong>.</p>
        
        <div style="background-color: #060A1B; padding: 15px; border-radius: 8px; margin: 15px 0; font-style: italic; color: #C9C2A6; font-size: 12px;">
          "${messageBody}"
        </div>

        <p style="color: #C9C2A6; font-size: 12px; line-height: 1.6;">Our team responds within a few hours. For urgent design consultations, you can also reach us directly on WhatsApp at <a href="https://wa.me/919574787098" style="color: #F5E7A3; text-decoration: underline;">+91 95747 87098</a>.</p>
      </div>

      <div style="border-top: 1px solid rgba(212,175,55,0.2); margin-top: 30px; padding-top: 20px; text-align: center; color: #64748B; font-size: 10px;">
        <p style="margin: 3px 0;">468/6, CHATRABHUJDARSHAN CO OP H.SOC, MANEK CHOWK, SANKADI SHERI, OPP B.D.COLLEGE, AHMEDABAD 1</p>
        <p style="margin: 3px 0;">Phone: +91 95747 87098 | Email: hello@shiulicadstudio.com</p>
        <p style="margin: 10px 0 0 0; color: #475569;">© ${new Date().getFullYear()} Shiuli CAD Studio. All Rights Reserved.</p>
      </div>
    </div>
  `;

  // Send copy to studio inbox socialbuzz31@gmail.com
  await sendEmail({
    to: 'socialbuzz31@gmail.com',
    subject: `[INQUIRY ALERT] Contact Form Submission from ${name} (${clientEmail})`,
    html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${clientEmail}</p><p><strong>Subject:</strong> ${messageSubject}</p><p><strong>Message:</strong> ${messageBody}</p>`,
    text: `New contact form inquiry from ${name} (${clientEmail}): ${messageBody}`,
  });

  return sendEmail({
    to: clientEmail,
    subject,
    html,
    text: `Hello ${name}, thank you for contacting Shiuli CAD Studio regarding "${messageSubject}". Our team will respond shortly.`,
  });
}
