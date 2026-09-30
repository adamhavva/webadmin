# Graph Report - docs  (2026-09-29)

## Corpus Check
- Corpus is ~10,314 words - fits in a single context window. You may not need a graph.

## Summary
- 33 nodes · 35 edges · 10 communities (5 shown, 5 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.87)
- Token cost: 15,000 input · 3,200 output

## Community Hubs (Navigation)
- API Integration & DOKU
- Order Data Models & Lifecycle
- Firebase & Real-time Tracking
- Customer Payment Flow
- Barista Stock Management
- Tech Stack
- Barista Stock Docs
- DOKU SNAP Docs
- Payment System Docs
- Prisma Schema Docs

## God Nodes (most connected - your core abstractions)
1. `Order Data Model` - 6 edges
2. `BaristaStock Data Model` - 5 edges
3. `API Documentation` - 4 edges
4. `Payment Processing Flow` - 4 edges
5. `Customer Barista Selection Flow` - 4 edges
6. `Real-time Order Tracking` - 4 edges
7. `Firebase Realtime Database` - 4 edges
8. `Barista App Documentation` - 3 edges
9. `Order Lifecycle State Machine` - 3 edges
10. `DOKU SNAP B2B Payment Gateway` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Barista Stock Management` --conceptually_related_to--> `Real-time Order Tracking`  [INFERRED]
  BARISTA-STOCK.md → customer.md
- `Available Baristas API` --references--> `BaristaStock Data Model`  [EXTRACTED]
  API.md → PRISMA-SCHEMA.md
- `Customer Barista Selection Flow` --references--> `Order Lifecycle State Machine`  [EXTRACTED]
  BARISTA-STOCK.md → API.md
- `Payment Processing Flow` --conceptually_related_to--> `Customer Barista Selection Flow`  [INFERRED]
  PAYMENT.md → BARISTA-STOCK.md
- `Payment Processing Flow` --references--> `DOKU SNAP B2B Payment Gateway`  [EXTRACTED]
  PAYMENT.md → DOKU.md

## Hyperedges (group relationships)
- **Order Processing System** — model_order, model_payment, model_barista_stock, enum_order_status, enum_payment_status, concept_order_lifecycle [EXTRACTED 0.95]
- **Flutter Mobile Apps** — tech_flutter, tech_firebase_auth, tech_firebase_rtdb, concept_order_tracking [EXTRACTED 0.95]
- **DOKU Payment Pipeline** — concept_doku_snap, api_payment_checkout, api_payment_notification, concept_payment_flow, model_payment [EXTRACTED 0.95]

## Communities (10 total, 5 thin omitted)

### Community 0 - "API Integration & DOKU"
Cohesion: 0.40
Nodes (6): Available Baristas API, Orders API Endpoint, Payment Checkout API, Payment Webhook API, DOKU SNAP B2B Payment Gateway, API Documentation

### Community 1 - "Order Data Models & Lifecycle"
Cohesion: 0.33
Nodes (6): Order Lifecycle State Machine, OrderStatus Enum, Order Data Model, Product Data Model, User Data Model, HPP Traceability Rationale

### Community 2 - "Firebase & Real-time Tracking"
Cohesion: 0.53
Nodes (6): Real-time Order Tracking, Barista App Documentation, Customer App Documentation, Firebase Authentication, Firebase Realtime Database, Flutter Mobile Framework

### Community 3 - "Customer Payment Flow"
Cohesion: 0.40
Nodes (5): Customer Barista Selection Flow, Payment Processing Flow, PaymentStatus Enum, Payment Data Model, Customer Selects Barista Rationale

### Community 4 - "Barista Stock Management"
Cohesion: 0.50
Nodes (4): Barista Stock Management, BaristaStock Data Model, FIFO Inventory Tracking Rationale, Stock Reduced on Order Completion Rationale

## Knowledge Gaps
- **10 isolated node(s):** `Barista Stock Documentation`, `DOKU SNAP Payment Integration`, `Payment System Documentation`, `Prisma Schema Documentation`, `OrderStatus Enum` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 14 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Order Data Model` connect `Order Data Models & Lifecycle` to `Firebase & Real-time Tracking`, `Customer Payment Flow`, `Barista Stock Management`?**
  _High betweenness centrality (0.309) - this node is a cross-community bridge._
- **Why does `BaristaStock Data Model` connect `Barista Stock Management` to `API Integration & DOKU`, `Order Data Models & Lifecycle`, `Customer Payment Flow`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `Real-time Order Tracking` connect `Firebase & Real-time Tracking` to `Order Data Models & Lifecycle`, `Barista Stock Management`?**
  _High betweenness centrality (0.226) - this node is a cross-community bridge._
- **What connects `Barista Stock Documentation`, `DOKU SNAP Payment Integration`, `Payment System Documentation` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._