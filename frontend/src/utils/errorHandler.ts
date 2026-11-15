export const SAFE_MESSAGES = {
  REGISTRATION_FAILED: 'Unable to create your account. Please try again.',
  LOGIN_FAILED: 'Unable to log in. Check your credentials and try again.',
  CUSTOMER_FAILED: 'Unable to add customer. Please try again.',
  PRODUCT_FAILED: 'Unable to add product. Please try again.',
  VOICE_FAILED: 'Unable to process your voice request. Please try again.',
  NETWORK_FAILED: 'Service temporarily unavailable. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  SETTINGS_FAILED: 'Unable to save settings. Please try again.',
  OTP_FAILED: 'Unable to verify confirmation code. Please try again.',
  OTP_SEND_FAILED: 'Unable to send verification code. Please try again.',
  TRANSACTION_FAILED: 'Unable to update ledger. Please try again.',
  ACTION_FAILED: 'Unable to complete request. Please try again.',
} as const;

const SENSITIVE_PATTERNS = [
  /mysql/i,
  /postgres/i,
  /sqlite/i,
  /supabase/i,
  /postgrest/i,
  /database/i,
  /\btable\b/i,
  /\bcolumn\b/i,
  /\brelation\b/i,
  /\bschema\b/i,
  /error\s*104/i,
  /\b104\b/,
  /\bsql\b/i,
  /select\s+/i,
  /insert\s+into/i,
  /traceback/i,
  /exception/i,
  /syntaxerror/i,
  /failed\s+to\s+fetch/i,
  /networkerror/i,
  /token/i,
  /secret/i,
  /api_key/i,
  /\bkey\b/i,
  /password/i,
  /bearer/i,
  /\.py\b/i,
  /file\s+"/i,
  /line\s+\d+/i,
  /500/i,
  /groq/i,
  /bodhan/i,
  /huggingface/i,
  /fastapi/i,
  /uvicorn/i,
  /gunicorn/i,
  /gsk_/i,
  /hf_/i,
  /sb_/i,
  /http:\/\//i,
  /https:\/\//i,
];

export function sanitizeErrorMessage(
  rawError: unknown,
  fallbackMessage: string = SAFE_MESSAGES.SERVICE_UNAVAILABLE
): string {
  if (!rawError) return fallbackMessage;

  let msg = '';
  if (typeof rawError === 'string') {
    msg = rawError;
  } else if (typeof rawError === 'object' && rawError !== null) {
    const obj = rawError as any;
    msg =
      obj.error?.message ||
      obj.detail ||
      obj.message ||
      '';
  }

  if (!msg || typeof msg !== 'string') {
    return fallbackMessage;
  }

  const clean = msg.trim();
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(clean)) {
      return fallbackMessage;
    }
  }

  if (clean.length > 120) {
    return fallbackMessage;
  }

  return clean || fallbackMessage;
}
