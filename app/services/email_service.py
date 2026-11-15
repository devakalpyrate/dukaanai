import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("dukaanai.email")

def mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "your registered email"
    parts = email.split("@", 1)
    name, domain = parts[0], parts[1]
    if len(name) <= 2:
        masked_name = name[0] + "***"
    else:
        masked_name = name[0] + "***" + name[-1]
    return f"{masked_name}@{domain}"

def send_otp_email(to_email: str, otp_code: str, recipient_name: str = "Shop Owner") -> bool:
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port_raw = os.getenv("SMTP_PORT", "587").strip()
    smtp_port = int(smtp_port_raw) if smtp_port_raw.isdigit() else 587
    smtp_user = (
        os.getenv("EMAIL_ID")
        or os.getenv("SMTP_USER")
        or os.getenv("GMAIL_USER")
        or ""
    ).strip()
    smtp_password = (
        os.getenv("EMAIL_APP_PASSWORD")
        or os.getenv("SMTP_PASSWORD")
        or os.getenv("GMAIL_APP_PASSWORD")
        or ""
    ).strip()
    from_name = os.getenv("SMTP_FROM_NAME", "DukaanAI Support").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user).strip() or smtp_user

    if not smtp_user or not smtp_password:
        logger.warning(
            "SMTP credentials not configured in environment. Mocking email delivery to %s.",
            mask_email(to_email)
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp_code} is your DukaanAI verification code"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        plain_text = (
            f"Hello {recipient_name},\n\n"
            f"Your DukaanAI verification code is: {otp_code}\n\n"
            "This code is valid for 5 minutes. Please do not share this code with anyone.\n\n"
            "If you did not request this code, please ignore this email.\n\n"
            "Best regards,\n"
            "The DukaanAI Team"
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DukaanAI Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090B0E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090B0E; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #12161F; border: 1px solid #1E232B; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #1E232B;">
              <div style="display: inline-block; width: 44px; height: 44px; background: #FFD026; border-radius: 10px; line-height: 44px; font-size: 24px; font-weight: 900; color: #000000; text-align: center; margin-bottom: 12px;">
                &#2342;
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                Dukaan<span style="color: #FFD026;">AI</span>
              </h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #94A3B8;">Digital Khata & Voice Billing System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #FFFFFF;">
                One-Time Verification Code
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                Hello <strong style="color: #FFFFFF;">{recipient_name}</strong>,<br>
                Use the following 6-digit verification code to complete your login or registration on DukaanAI:
              </p>
              <div style="background-color: #181E29; border: 1px solid rgba(255, 208, 38, 0.35); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #FFD026; font-family: monospace;">
                  {otp_code}
                </span>
                <p style="margin: 8px 0 0; font-size: 12px; color: #94A3B8;">Valid for 5 minutes only</p>
              </div>
              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #94A3B8;">
                &#9888; <strong>Security Notice:</strong> Never share this code with anyone, including DukaanAI staff. We will never call or message asking for your code.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                If you did not initiate this request, you can safely ignore this email. Your account remains protected.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #0E1219; border-top: 1px solid #1E232B; text-align: center; font-size: 12px; color: #64748B;">
              &copy; 2026 DukaanAI Technologies. Built for India's Local Retailers.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        logger.info("Successfully sent OTP email to %s", mask_email(to_email))
        return True
    except Exception as exc:
        logger.error("Failed to send OTP email via SMTP to %s: %s", mask_email(to_email), exc)
        return False
