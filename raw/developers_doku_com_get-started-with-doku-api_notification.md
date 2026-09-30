---
source_url: "https://developers.doku.com/get-started-with-doku-api/notification"
type: webpage
title: "Notification | API Reference"
captured_at: 2026-09-29T11:22:10.553697+00:00
contributor: "user"
---

# Notification | API Reference

Source: https://developers.doku.com/get-started-with-doku-api/notification

---

Notification | API Reference API Reference ⌘ Ctrl k DOKU Docs Changelog DOKU Github More API Reference Get Started with DOKU API User Registration Idempotency Request Notification Setup Notification URL HTTP Notification Sample for SNAP HTTP Notification Sample - Non SNAP Best Practice Retry Notification Override Notification URL Signature Component Response Code Check Status API Retrieve Payment Credential Accept Payments DOKU Checkout Direct API DOKU MCP Server Finance and Settlement Test on DOKU Demo Site DOKU Payment Simulator Developer Kit Postman Collection Libraries and SDK AI Agent Toolkit Wallet As A Service Sub Account Embedded Wallet Partnership Partner API Payout Kirim DOKU Payout Link FLEXIBILL Account Billing DOKU Biller PAYCHAT API Send WhatsApp Message Archive Non-SNAP SNAP Powered by GitBook On this page For the complete documentation index, see llms.txt . This page is also available as Markdown . Copy On this page Get Started with DOKU API Notification DOKU uses HTTP Notification to notify your application when an event happens in your account. HTTP Notification particularly useful for asychronous events such as when your customer completes the payment process for Virtual Account or etc. Not all DOKU integration require HTTP Notification. Keep reading to learn more about what HTTP Notification is and when you should use them. What is HTTP Notification ? HTTP Notification is a notification that DOKU send to notify your application for certain events. Basically, you need to setup an endpoint on your side to receive the notification, which could be written in Java, PHP, Python, Node.js, or anything. The HTTP Notification endpoint has an associated URL (e.g., https://your-domain.com/notifications/payments ). DOKU will send the notification body in JSON format, therefore you can parse it with JSON parser. Please mind that DOKU might add new fields in the notification body in order to cover new use cases in our notification service, you are suggested to parse it in non strict format. This prevents the parser from throwing an error or exception for new fields. When to use HTTP Notification ? These are various cases that DOKU will send notification to you: Virtual Account Payment Convenience Store Payment Credit Card Payment E-Money Payment Direct Debit Payment Paylater Payment QR Payment Internet Banking Payment Previous Idempotency Request Next Setup Notification URL Last updated 2 years ago What is HTTP Notification ? When to use HTTP Notification ?
