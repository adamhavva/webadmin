# Graph Report - docs  (2026-09-29)

## Corpus Check
- 7 files · ~10,391 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 247 nodes · 240 edges · 12 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53ced53d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Barista App Documentation
- Dokumentasi Lengkap Customer App - ASCEND Flutter
- API Documentation - ASCEND WebAdmin
- Dokumentasi Barista Stock & Order Assignment
- Models
- Payment System Documentation
- Enums
- DOKU SNAP Payment Integration
- 4.1 Endpoint Order untuk Customer
- Key Endpoints
- 9. Checklist Implementasi
- 7.2 Full Map Features - Lacak Posisi Barista

## God Nodes (most connected - your core abstractions)
1. `Models` - 26 edges
2. `Barista App Documentation` - 14 edges
3. `Dokumentasi Lengkap Customer App - ASCEND Flutter` - 14 edges
4. `DOKU SNAP Payment Integration` - 12 edges
5. `Payment System Documentation` - 12 edges
6. `Enums` - 12 edges
7. `API Documentation - ASCEND WebAdmin` - 10 edges
8. `Dokumentasi Barista Stock & Order Assignment` - 10 edges
9. `Prisma Schema Documentation` - 8 edges
10. `9. Checklist Implementasi` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (12 total, 0 thin omitted)

### Community 0 - "Barista App Documentation"
Cohesion: 0.07
Nodes (29): Android, Android (FCM), Auth Errors, Barista App Documentation, BaristaStock, Cloud Messaging (FCM), Data Models, Deployment (+21 more)

### Community 1 - "Dokumentasi Lengkap Customer App - ASCEND Flutter"
Cohesion: 0.07
Nodes (29): 10. Sample Code - Order Provider, 11. Sample Code - Order Creation Screen, 12. Sample Code - Order Tracking Screen, 1.1 Apa itu Customer App?, 1.2 Arsitektur Sistem, 1.3 API Response Format, 1. Overview, 2.1 Prerequisites (+21 more)

### Community 2 - "API Documentation - ASCEND WebAdmin"
Cohesion: 0.07
Nodes (28): API Documentation - ASCEND WebAdmin, Authentication, Barista Stock API, Base URL, Create Checkout Session, Create Order, Error, Get Available Baristas (+20 more)

### Community 3 - "Dokumentasi Barista Stock & Order Assignment"
Cohesion: 0.08
Nodes (25): 1. Browse Barista Terdekat, 2. Pilih Barista, 3. Pilih Produk, 4. Checkout, API Endpoints, Barista Selection UI (Customer App), Barista Stock Validation, Customer Flow (+17 more)

### Community 4 - "Models"
Cohesion: 0.08
Nodes (26): BaristaRestock, BaristaRestockItem, BaristaStock, BaristaStockMovement, FinishedProductBatch, InventoryBatch, InventoryItem, Models (+18 more)

### Community 5 - "Payment System Documentation"
Cohesion: 0.08
Nodes (24): After Successful Payment, API Endpoints, CASH (COD) Flow, Configuration, DOKU (QRIS/VA/e-Wallet) Flow, DOKU Signature, Error Handling, GET /api/payment?orderId= (+16 more)

### Community 6 - "Enums"
Cohesion: 0.08
Nodes (24): BaristaStock Indexes, BaristaStockMovement Indexes, BaristaStockMovementType, Data Flow, Enums, Indexes, Inventory Flow, InventoryUnit (+16 more)

### Community 7 - "DOKU SNAP Payment Integration"
Cohesion: 0.10
Nodes (19): API Endpoints, Asymmetric (for Get Token API), Authentication, B2B2C Token (OVO Account Binding), B2B Token (VA, QRIS), Base URLs, Channel Codes, DOKU SNAP Payment Integration (+11 more)

### Community 8 - "4.1 Endpoint Order untuk Customer"
Cohesion: 0.15
Nodes (13): 4.1 Endpoint Order untuk Customer, 4.2 Endpoint Settings untuk Customer, 4.3 Endpoint Dashboard untuk Customer, 4. API Reference - Endpoint untuk Customer, GET /api/dashboard/stats, GET /api/orders, GET /api/orders/{id}, GET /api/settings/active (+5 more)

### Community 9 - "Key Endpoints"
Cohesion: 0.25
Nodes (8): API Integration, Authentication, Base URL, Get Assigned Orders, Get Barista Stock, Key Endpoints, Request Restock, Update Order Status

### Community 10 - "9. Checklist Implementasi"
Cohesion: 0.25
Nodes (8): 9.1 Setup, 9.2 Authentication, 9.3 Products & Catalog, 9.4 Orders, 9.5 Order Tracking, 9.6 Profile, 9.7 Polish, 9. Checklist Implementasi

### Community 11 - "7.2 Full Map Features - Lacak Posisi Barista"
Cohesion: 0.29
Nodes (7): 7.2.1 Map Features Overview, 7.2.2 Order Tracking Map Screen, 7.2.3 Live Location Updates with ETA, 7.2.4 Route Display with Polyline, 7.2.5 Firebase RTDB Structure untuk Customer Tracking, 7.2.6 Customer Location Setup, 7.2 Full Map Features - Lacak Posisi Barista

## Knowledge Gaps
- **184 isolated node(s):** `Base URL`, `Authentication`, `Success`, `Error`, `HTTP Status Codes` (+179 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Dokumentasi Lengkap Customer App - ASCEND Flutter` connect `Dokumentasi Lengkap Customer App - ASCEND Flutter` to `4.1 Endpoint Order untuk Customer`, `9. Checklist Implementasi`, `7.2 Full Map Features - Lacak Posisi Barista`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Models` connect `Models` to `Enums`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `Prisma Schema Documentation` connect `Enums` to `Models`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `Base URL`, `Authentication`, `Success` to the rest of the system?**
  _184 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Barista App Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Dokumentasi Lengkap Customer App - ASCEND Flutter` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `API Documentation - ASCEND WebAdmin` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._