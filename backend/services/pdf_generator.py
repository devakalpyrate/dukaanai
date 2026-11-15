import io
from decimal import Decimal
from typing import Any, Dict, List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

def generate_customer_ledger_pdf(
    shop_data: Dict[str, Any],
    customer_data: Dict[str, Any],
    balance_info: Dict[str, Any],
    transactions: List[Dict[str, Any]],
    store_upi_id: Optional[str] = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ShopTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#18181B"),
    )
    subtitle_style = ParagraphStyle(
        "ShopSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#71717A"),
    )
    badge_style = ParagraphStyle(
        "Badge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        alignment=2,
        textColor=colors.HexColor("#E11D48"),
    )
    section_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#27272A"),
    )
    cell_style = ParagraphStyle(
        "CellText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#3F3F46"),
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#18181B"),
    )

    story = []

    shop_name = shop_data.get("shop_name") or shop_data.get("name") or "Meri Dukaan"
    shop_address = shop_data.get("address") or "Store Ledger & Udhaar Khata"
    cust_name = customer_data.get("name", "Customer")
    cust_phone = customer_data.get("phone") or "N/A"
    outstanding = float(balance_info.get("balance") or 0.0)
    total_credit = float(balance_info.get("total_credit") or 0.0)
    total_paid = float(balance_info.get("total_paid") or 0.0)

    header_table_data = [
        [
            Paragraph(f"<b>{shop_name}</b>", title_style),
            Paragraph(f"<b>KHATA INVOICE</b>", badge_style),
        ],
        [
            Paragraph(f"{shop_address}", subtitle_style),
            Paragraph(f"Date: <i>Today</i>", subtitle_style),
        ],
    ]
    header_table = Table(header_table_data, colWidths=[110 * mm, 70 * mm])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#E4E4E7"), spaceBefore=1, spaceAfter=8))

    cust_box_data = [
        [
            Paragraph("<b>CUSTOMER DETAILS</b>", section_title),
            Paragraph("<b>LEDGER SUMMARY</b>", section_title),
        ],
        [
            Paragraph(f"Name: <b>{cust_name}</b><br/>Phone: {cust_phone}", cell_style),
            Paragraph(
                f"Outstanding Udhaar: <font color='#E11D48'><b>₹{outstanding:,.2f}</b></font><br/>"
                f"Total Credit: ₹{total_credit:,.2f} | Total Paid: ₹{total_paid:,.2f}",
                cell_style,
            ),
        ],
    ]
    cust_box_table = Table(cust_box_data, colWidths=[90 * mm, 90 * mm])
    cust_box_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAFAFA")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E4E4E7")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(cust_box_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("<b>TRANSACTION HISTORY</b>", section_title))
    story.append(Spacer(1, 4))

    table_rows = [
        [
            Paragraph("<b>#</b>", cell_bold),
            Paragraph("<b>Date & Time</b>", cell_bold),
            Paragraph("<b>Description</b>", cell_bold),
            Paragraph("<b>Type</b>", cell_bold),
            Paragraph("<b>Amount</b>", cell_bold),
        ]
    ]

    for idx, tx in enumerate(transactions[:35], start=1):
        amt = float(tx.get("amount") or 0.0)
        t_type = (tx.get("type") or tx.get("transaction_type") or "credit").lower()
        type_str = "Udhaar (+)" if t_type == "credit" else "Jama (-)"
        type_color = "#E11D48" if t_type == "credit" else "#10B981"
        created = str(tx.get("created_at") or tx.get("date") or "")[:16]
        desc = tx.get("description") or ("Store Credit" if t_type == "credit" else "Cash Payment")

        table_rows.append([
            Paragraph(str(idx), cell_style),
            Paragraph(created, cell_style),
            Paragraph(desc[:30], cell_style),
            Paragraph(f"<font color='{type_color}'><b>{type_str}</b></font>", cell_style),
            Paragraph(f"<b>₹{amt:,.2f}</b>", cell_bold),
        ])

    if len(transactions) == 0:
        table_rows.append([
            Paragraph("1", cell_style),
            Paragraph("-", cell_style),
            Paragraph("Opening Balance", cell_style),
            Paragraph("Opening", cell_style),
            Paragraph(f"₹{outstanding:,.2f}", cell_bold),
        ])

    tx_table = Table(table_rows, colWidths=[10 * mm, 42 * mm, 60 * mm, 34 * mm, 34 * mm])
    tx_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F4F5")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(tx_table)
    story.append(Spacer(1, 14))

    if store_upi_id:
        upi_info_data = [
            [
                Paragraph("<b>HOW TO PAY VIA UPI:</b>", cell_bold),
            ],
            [
                Paragraph(
                    f"Merchant UPI ID: <b>{store_upi_id}</b><br/>"
                    f"Scan & Pay using Google Pay, PhonePe, Paytm, or BHIM UPI.<br/>"
                    f"Link: <i>upi://pay?pa={store_upi_id}&pn={shop_name}&am={outstanding}&cu=INR</i>",
                    cell_style,
                ),
            ],
        ]
        upi_table = Table(upi_info_data, colWidths=[180 * mm])
        upi_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#F59E0B")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(upi_table)
        story.append(Spacer(1, 10))

    footer_text = Paragraph(
        "<font color='#A1A1AA'>Generated automatically by DukaanAI Smart Khata • Digital India Initiative</font>",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, alignment=1),
    )
    story.append(footer_text)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
