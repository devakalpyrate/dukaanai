import os
import smtplib
import logging
from typing import Any, Dict, List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

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


def send_account_deletion_statement_email(
    to_email: str,
    recipient_name: str,
    shop_name: str,
    transactions: List[Dict[str, Any]],
    summary_info: Dict[str, Any],
    pdf_bytes: Optional[bytes] = None,
) -> bool:
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

    total_credit = float(summary_info.get("total_credit") or 0.0)
    total_paid = float(summary_info.get("total_paid") or 0.0)
    outstanding = float(summary_info.get("total_debt") or summary_info.get("outstanding_debt") or 0.0)
    tx_count = len(transactions)

    if not smtp_user or not smtp_password:
        logger.warning(
            "SMTP credentials not configured in environment. Mocking account deletion statement email to %s with %d transactions.",
            mask_email(to_email),
            tx_count,
        )
        return True

    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = f"DukaanAI — Final Ledger & Transaction Statement for {shop_name}"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        # Build table rows for HTML
        table_rows_html = ""
        plain_tx_lines = []
        for idx, tx in enumerate(transactions, start=1):
            amt = float(tx.get("amount") or 0.0)
            t_type = (tx.get("type") or "credit").lower()
            if t_type == "credit":
                type_badge = "<span style='color: #EF4444; font-weight: bold;'>- Udhaar (उधार)</span>"
                amt_str = f"- ₹{amt:,.2f}"
                plain_type = "- Udhaar"
            else:
                type_badge = "<span style='color: #10B981; font-weight: bold;'>+ Jama (जमा)</span>"
                amt_str = f"+ ₹{amt:,.2f}"
                plain_type = "+ Jama"

            c_name = tx.get("customer_name") or f"Customer #{tx.get('customer_id')}"
            dt_str = str(tx.get("created_at") or "")[:16].replace("T", " ")
            desc = tx.get("description") or "-"

            table_rows_html += f"""
            <tr style="border-bottom: 1px solid #1E232B;">
              <td style="padding: 10px 8px; color: #94A3B8; font-size: 12px; text-align: center;">{idx}</td>
              <td style="padding: 10px 8px; color: #E2E8F0; font-size: 12px;">{dt_str}</td>
              <td style="padding: 10px 8px; color: #FFFFFF; font-weight: 600; font-size: 13px;">{c_name}</td>
              <td style="padding: 10px 8px; font-size: 12px;">{type_badge}</td>
              <td style="padding: 10px 8px; color: #FFFFFF; font-weight: 700; font-size: 13px; text-align: right;">{amt_str}</td>
              <td style="padding: 10px 8px; color: #94A3B8; font-size: 11px;">{desc}</td>
            </tr>"""

            plain_tx_lines.append(f"{idx}. [{dt_str}] {c_name} | {plain_type} | {amt_str} | Note: {desc}")

        if not table_rows_html:
            table_rows_html = "<tr><td colspan='6' style='padding: 16px; text-align: center; color: #94A3B8;'>No transactions on record.</td></tr>"

        plain_text = (
            f"Hello {recipient_name},\n\n"
            f"Your DukaanAI account and store '{shop_name}' have been permanently deleted.\n\n"
            "As requested, here is your final ledger and transaction statement:\n\n"
            f"• Total Transactions: {tx_count}\n"
            f"• Total Udhaar (Credit): Rs {total_credit:,.2f}\n"
            f"• Total Jama (Payments): Rs {total_paid:,.2f}\n"
            f"• Net Outstanding Balance: Rs {outstanding:,.2f}\n\n"
            "Transaction Records:\n"
            + ("\n".join(plain_tx_lines) if plain_tx_lines else "None")
            + "\n\nAll your shop records have been permanently cleared from our servers.\n"
            "Best regards,\nThe DukaanAI Team"
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DukaanAI Final Statement</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090B0E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090B0E; padding: 30px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 640px; background-color: #12161F; border: 1px solid #1E232B; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 24px 32px; background-color: #181E29; border-bottom: 1px solid #1E232B;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF;">
                    Dukaan<span style="color: #FFD026;">AI</span>
                  </h1>
                  <p style="margin: 2px 0 0; font-size: 12px; color: #94A3B8;">Final Store Ledger & Account Closure Statement</p>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #FFFFFF;">
                Store Statement: {shop_name}
              </h2>
              <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.5; color: #CBD5E1;">
                Hello <strong style="color: #FFFFFF;">{recipient_name}</strong>, your DukaanAI account has been permanently closed. Below is the complete archive of your customer ledger transactions:
              </p>

              <!-- Financial Summary Cards -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="25%" style="padding: 12px; background-color: #181E29; border: 1px solid #1E232B; border-radius: 10px 0 0 10px; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #94A3B8; font-weight: 600;">Total Txns</div>
                    <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; margin-top: 4px;">{tx_count}</div>
                  </td>
                  <td width="25%" style="padding: 12px; background-color: #181E29; border-top: 1px solid #1E232B; border-bottom: 1px solid #1E232B; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #EF4444; font-weight: 600;">Udhaar (Credit)</div>
                    <div style="font-size: 16px; font-weight: 800; color: #EF4444; margin-top: 4px;">₹{total_credit:,.2f}</div>
                  </td>
                  <td width="25%" style="padding: 12px; background-color: #181E29; border-top: 1px solid #1E232B; border-bottom: 1px solid #1E232B; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #10B981; font-weight: 600;">Jama (Paid)</div>
                    <div style="font-size: 16px; font-weight: 800; color: #10B981; margin-top: 4px;">₹{total_paid:,.2f}</div>
                  </td>
                  <td width="25%" style="padding: 12px; background-color: #181E29; border: 1px solid #1E232B; border-radius: 0 10px 10px 0; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #FFD026; font-weight: 600;">Outstanding</div>
                    <div style="font-size: 16px; font-weight: 800; color: #FFD026; margin-top: 4px;">₹{outstanding:,.2f}</div>
                  </td>
                </tr>
              </table>

              <!-- Transactions Table -->
              <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #FFFFFF;">
                Transaction Ledger Details
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #1E232B; border-radius: 8px; overflow: hidden; background-color: #0E1219;">
                <thead>
                  <tr style="background-color: #181E29; border-bottom: 1px solid #1E232B;">
                    <th style="padding: 8px; color: #94A3B8; font-size: 11px; text-align: center;">#</th>
                    <th style="padding: 8px; color: #94A3B8; font-size: 11px; text-align: left;">Date</th>
                    <th style="padding: 8px; color: #94A3B8; font-size: 11px; text-align: left;">Customer</th>
                    <th style="padding: 8px; color: #94A3B8; font-size: 11px; text-align: left;">Type</th>
                    <th style="padding: 8px; color: #94A3B8; font-size: 11px; text-align: right;">Amount</th>
                    <th style="padding: 8px; color: #94A3B8; font-size: 11px; text-align: left;">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {table_rows_html}
                </tbody>
              </table>

              <p style="margin: 20px 0 0; font-size: 12px; line-height: 1.5; color: #94A3B8;">
                &#9432; <em>All database records associated with your shop have been permanently removed. A PDF copy of this statement is also attached for your offline records.</em>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #0E1219; border-top: 1px solid #1E232B; text-align: center; font-size: 11px; color: #64748B;">
              &copy; 2026 DukaanAI Technologies • Digital India Initiative
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        body_alt = MIMEMultipart("alternative")
        body_alt.attach(MIMEText(plain_text, "plain"))
        body_alt.attach(MIMEText(html_content, "html"))
        msg.attach(body_alt)

        if pdf_bytes and len(pdf_bytes) > 100:
            part = MIMEApplication(pdf_bytes, _subtype="pdf")
            part.add_header("Content-Disposition", "attachment", filename="DukaanAI_Final_Ledger_Statement.pdf")
            msg.attach(part)

        with smtplib.SMTP(smtp_host, smtp_port, timeout=14) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        logger.info("Successfully sent account deletion statement email with PDF to %s", mask_email(to_email))
        return True
    except Exception as exc:
        logger.error("Failed to send account deletion statement email to %s: %s", mask_email(to_email), exc)
        return False
