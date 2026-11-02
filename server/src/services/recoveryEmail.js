import { env } from '../config/env.js';
import { ApiError } from '../middleware/error.js';
export async function sendRecoveryEmail({ email, url, language }) {
  if (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM) throw new ApiError(503, 'Password recovery is unavailable. Please contact the administrator.');
  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.PASSWORD_RESET_FROM, to: [email], subject: language === 'hi' ? 'PMS पासवर्ड बदलें' : 'Reset your PMS password', text: `${language === 'hi' ? 'पासवर्ड बदलने का लिंक (30 मिनट):' : 'Reset your password (expires in 30 minutes):'}\n${url}\n${language === 'hi' ? 'यदि आपने अनुरोध नहीं किया, तो इसे अनदेखा करें।' : 'If you did not request this, ignore this email.'}` }),
    });
  } catch { throw new ApiError(503, 'Password recovery is unavailable. Please contact the administrator.'); }
  if (!response.ok) throw new ApiError(503, 'Password recovery is unavailable. Please contact the administrator.');
}
