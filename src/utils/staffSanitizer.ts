/**
 * Utility functions for Staff views to strictly sanitize and hide
 * client personal identifiable information (PII) such as client name,
 * phone number, WhatsApp, email address, physical address, etc.
 *
 * Staff only receives and views order-related details (dimensions, weights,
 * stone specifications, CAD models, technical instructions, milestones, etc.)
 * required to execute the CAD design.
 */

export function sanitizeOrderBriefForStaff(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Remove entire Customer / Client Details blocks generated during checkout / custom request
  cleaned = cleaned.replace(
    /(?:👤\s*)?(?:Customer|Client)\s*Details:[\s\S]*?(?=(?:💍|📁|✨|📎|🎙️|🛠️|📝|📅|Please confirm|\n\n[^\n•]+:|$))/gi,
    ''
  );

  // 2. Remove standard customer PII lines (Name, Phone, WhatsApp, Email, Address, etc.)
  cleaned = cleaned.replace(
    /^(?:[•\-*]\s*)?(?:Name|Full Name|Customer Name|Client Name|Contact Name|Contact|WhatsApp|WhatsApp\s*\/\s*Phone|Phone|Phone Number|Mobile|Cell|Tel|Email|Email Address|Address|City|Country|Pincode):\s*[^\n\r]*$/gim,
    ''
  );

  // 3. Remove inline label pairs if written in continuous sentences
  cleaned = cleaned.replace(
    /(?:^|\s)(?:Name|Client Name|Customer Name|Contact Name|Contact|WhatsApp|Phone|Mobile|Cell|Email|Email Address):\s*[^\n\r,;]+/gim,
    ''
  );

  // 4. Strip any loose email addresses
  cleaned = cleaned.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '');

  // 5. Remove formal order announcement banners if present
  cleaned = cleaned.replace(
    /(?:💎\s*(?:NEW\s+CUSTOM\s+CAD\s+DESIGN\s+ORDER|CAD\s+FILE\s+MODIFICATION\s+ORDER)[^\n]*💎)/gi,
    ''
  );

  // 6. Clean up greetings mentioning customer names (e.g. "Dear [Name],")
  cleaned = cleaned.replace(/Dear\s+[^\n,]+,/gi, 'Hello,');

  // 7. Collapse excess blank lines and trim
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}
