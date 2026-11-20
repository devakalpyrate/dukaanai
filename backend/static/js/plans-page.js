/**
 * DukaanAI Plans & Pricing Configuration
 * =====================================
 * This file cleanly separates all pricing plans, features, and descriptions.
 * Modify this file to update prices, add new features, or change plan details.
 */

window.DukaanPlansConfig = {
  // -------------------------------------------------------------
  // 1. FREE PLAN (Currently Active)
  // -------------------------------------------------------------
  free: {
    id: "free",
    name: "Free Plan",
    badge: "Free Plan",
    statusBadge: "Active Now",
    price: "₹0",
    period: "Free forever",
    description: "All the essential features to run your store digitally with voice commands.",
    voiceLimit: "25 commands / day",
    features: [
      "25 Sarvam AI Voice Commands / Day",
      "22+ Indian Languages Voice Recognition",
      "Customer Khata & Balance Tracking",
      "Daily & Monthly Sales Summary Reports",
      "Live Mandi Rates & Prices",
      "Secure Cloud Backup & Safety"
    ],
    buttonText: "Current Plan",
    buttonDisabled: true,
    isCurrentPlan: true
  },

  // -------------------------------------------------------------
  // 2. QUARTERLY PLAN (Coming Soon)
  // -------------------------------------------------------------
  quarterly: {
    id: "quarterly",
    name: "Quarterly Plan",
    badge: "Quarterly Plan",
    duration: "3 Months",
    durationDays: 90,
    price: "₹349",
    period: "/ 3 Months",
    description: "For growing shops needing automated customer reminders and staff sync.",
    voiceLimit: "150 commands / day",
    features: [
      "Everything in Free, plus:",
      "150 Sarvam AI Voice Commands / Day",
      "Automated WhatsApp Payment Links",
      "Multi-Device Staff Sync (Up to 3 Devices)",
      "Priority Mandi Rates & Price Alerts",
      "Priority WhatsApp Support"
    ],
    buttonText: "Coming Soon",
    buttonDisabled: true,
    isCurrentPlan: false
  },

  // -------------------------------------------------------------
  // 3. YEARLY PLAN (Coming Soon) - Best Value
  // -------------------------------------------------------------
  yearly: {
    id: "yearly",
    name: "Yearly Plan",
    badge: "Best Value",
    duration: "365 Days",
    durationDays: 365,
    price: "₹999",
    period: "/ 365 Days",
    description: "For wholesale & retail businesses needing complete peace of mind.",
    voiceLimit: "Infinite (Fair-use applies)",
    features: [
      "Everything in Free, plus:",
      "Unlimited Sarvam AI Voice Commands (Fair-use applies)",
      "Unlimited Staff & Counter Accounts",
      "Custom Shop Logo & QR Bill Invoices",
      "Full Accounting & Tax Report Export",
      "Priority Customer Support"
    ],
    buttonText: "Coming Soon",
    buttonDisabled: true,
    isCurrentPlan: false
  }
};
