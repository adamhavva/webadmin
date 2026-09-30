#!/usr/bin/env python3
import json

data = {"nodes": [], "edges": [], "hyperedges": [], "input_tokens": 0, "output_tokens": 0}

base = '/Users/dandiramdani/Projects/ascend/webadmin/docs'

data['nodes'] = [
  {"id": "docs_api", "label": "API Documentation", "file_type": "document", "source_file": base+"/API.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "docs_barista_stock", "label": "Barista Stock Documentation", "file_type": "document", "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "docs_doku", "label": "DOKU SNAP Payment Integration", "file_type": "document", "source_file": base+"/DOKU.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "docs_payment", "label": "Payment System Documentation", "file_type": "document", "source_file": base+"/PAYMENT.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "docs_prisma_schema", "label": "Prisma Schema Documentation", "file_type": "document", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "docs_barista", "label": "Barista App Documentation", "file_type": "document", "source_file": base+"/barista.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "docs_customer", "label": "Customer App Documentation", "file_type": "document", "source_file": base+"/customer.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "concept_order_lifecycle", "label": "Order Lifecycle State Machine", "file_type": "concept", "source_file": base+"/API.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "concept_payment_flow", "label": "Payment Processing Flow", "file_type": "concept", "source_file": base+"/PAYMENT.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "concept_doku_snap", "label": "DOKU SNAP B2B Payment Gateway", "file_type": "concept", "source_file": base+"/DOKU.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "concept_barista_selection", "label": "Customer Barista Selection Flow", "file_type": "concept", "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "concept_stock_management", "label": "Barista Stock Management", "file_type": "concept", "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "concept_order_tracking", "label": "Real-time Order Tracking", "file_type": "concept", "source_file": base+"/customer.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "enum_order_status", "label": "OrderStatus Enum", "file_type": "concept", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "enum_payment_status", "label": "PaymentStatus Enum", "file_type": "concept", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "model_order", "label": "Order Data Model", "file_type": "concept", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "model_barista_stock", "label": "BaristaStock Data Model", "file_type": "concept", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "model_payment", "label": "Payment Data Model", "file_type": "concept", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "model_product", "label": "Product Data Model", "file_type": "concept", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "model_user", "label": "User Data Model", "file_type": "concept", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "api_orders", "label": "Orders API Endpoint", "file_type": "concept", "source_file": base+"/API.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "api_payment_checkout", "label": "Payment Checkout API", "file_type": "concept", "source_file": base+"/API.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "api_payment_notification", "label": "Payment Webhook API", "file_type": "concept", "source_file": base+"/API.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "api_baristas_available", "label": "Available Baristas API", "file_type": "concept", "source_file": base+"/API.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "tech_nextjs", "label": "Next.js Web Framework", "file_type": "concept", "source_file": base+"/barista.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "tech_flutter", "label": "Flutter Mobile Framework", "file_type": "concept", "source_file": base+"/barista.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "tech_firebase_auth", "label": "Firebase Authentication", "file_type": "concept", "source_file": base+"/barista.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "tech_firebase_rtdb", "label": "Firebase Realtime Database", "file_type": "concept", "source_file": base+"/barista.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "tech_prisma", "label": "Prisma ORM", "file_type": "concept", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "rationale_hpp_traceable", "label": "HPP Traceability Rationale", "file_type": "rationale", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "rationale_fifo_inventory", "label": "FIFO Inventory Tracking Rationale", "file_type": "rationale", "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "rationale_customer_barista_selection", "label": "Customer Selects Barista Rationale", "file_type": "rationale", "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
  {"id": "rationale_stock_reduce_on_complete", "label": "Stock Reduced on Order Completion Rationale", "file_type": "rationale", "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "source_url": None, "captured_at": None, "author": None, "contributor": None},
]

data['edges'] = [
  {"source": "docs_api", "target": "api_orders", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/API.md", "source_location": None, "weight": 1.0},
  {"source": "docs_api", "target": "api_payment_checkout", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/API.md", "source_location": None, "weight": 1.0},
  {"source": "docs_api", "target": "api_payment_notification", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/API.md", "source_location": None, "weight": 1.0},
  {"source": "docs_api", "target": "api_baristas_available", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/API.md", "source_location": None, "weight": 1.0},
  {"source": "concept_order_lifecycle", "target": "model_order", "relation": "implemented_by", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/API.md", "source_location": None, "weight": 1.0},
  {"source": "enum_order_status", "target": "concept_order_lifecycle", "relation": "defines", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "weight": 1.0},
  {"source": "concept_payment_flow", "target": "concept_doku_snap", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PAYMENT.md", "source_location": None, "weight": 1.0},
  {"source": "concept_payment_flow", "target": "model_payment", "relation": "implemented_by", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PAYMENT.md", "source_location": None, "weight": 1.0},
  {"source": "enum_payment_status", "target": "concept_payment_flow", "relation": "defines", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "weight": 1.0},
  {"source": "concept_doku_snap", "target": "api_payment_checkout", "relation": "implements", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/DOKU.md", "source_location": None, "weight": 1.0},
  {"source": "concept_doku_snap", "target": "api_payment_notification", "relation": "implements", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/DOKU.md", "source_location": None, "weight": 1.0},
  {"source": "concept_barista_selection", "target": "concept_order_lifecycle", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "weight": 1.0},
  {"source": "concept_barista_selection", "target": "model_barista_stock", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "weight": 1.0},
  {"source": "api_baristas_available", "target": "model_barista_stock", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/API.md", "source_location": None, "weight": 1.0},
  {"source": "concept_stock_management", "target": "model_barista_stock", "relation": "implemented_by", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "weight": 1.0},
  {"source": "rationale_customer_barista_selection", "target": "concept_barista_selection", "relation": "rationale_for", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "weight": 1.0},
  {"source": "rationale_stock_reduce_on_complete", "target": "concept_stock_management", "relation": "rationale_for", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "weight": 1.0},
  {"source": "concept_order_tracking", "target": "tech_firebase_rtdb", "relation": "uses", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/customer.md", "source_location": None, "weight": 1.0},
  {"source": "concept_order_tracking", "target": "model_order", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/customer.md", "source_location": None, "weight": 1.0},
  {"source": "docs_barista", "target": "tech_flutter", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/barista.md", "source_location": None, "weight": 1.0},
  {"source": "docs_barista", "target": "tech_firebase_auth", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/barista.md", "source_location": None, "weight": 1.0},
  {"source": "docs_barista", "target": "tech_firebase_rtdb", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/barista.md", "source_location": None, "weight": 1.0},
  {"source": "docs_customer", "target": "tech_flutter", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/customer.md", "source_location": None, "weight": 1.0},
  {"source": "docs_customer", "target": "concept_order_tracking", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/customer.md", "source_location": None, "weight": 1.0},
  {"source": "model_order", "target": "model_payment", "relation": "shares_data_with", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "weight": 1.0},
  {"source": "model_order", "target": "model_barista_stock", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "weight": 1.0},
  {"source": "model_order", "target": "model_product", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "weight": 1.0},
  {"source": "model_order", "target": "model_user", "relation": "references", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "weight": 1.0},
  {"source": "rationale_hpp_traceable", "target": "model_product", "relation": "rationale_for", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "weight": 1.0},
  {"source": "rationale_fifo_inventory", "target": "model_barista_stock", "relation": "rationale_for", "confidence": "EXTRACTED", "confidence_score": 1.0, "source_file": base+"/PRISMA-SCHEMA.md", "source_location": None, "weight": 1.0},
  {"source": "concept_payment_flow", "target": "concept_barista_selection", "relation": "conceptually_related_to", "confidence": "INFERRED", "confidence_score": 0.75, "source_file": base+"/PAYMENT.md", "source_location": None, "weight": 1.0},
  {"source": "concept_stock_management", "target": "concept_order_tracking", "relation": "conceptually_related_to", "confidence": "INFERRED", "confidence_score": 0.85, "source_file": base+"/BARISTA-STOCK.md", "source_location": None, "weight": 1.0},
  {"source": "tech_nextjs", "target": "tech_prisma", "relation": "conceptually_related_to", "confidence": "INFERRED", "confidence_score": 0.85, "source_file": base+"/barista.md", "source_location": None, "weight": 1.0},
  {"source": "tech_flutter", "target": "tech_firebase_rtdb", "relation": "conceptually_related_to", "confidence": "INFERRED", "confidence_score": 0.95, "source_file": base+"/barista.md", "source_location": None, "weight": 1.0},
  {"source": "tech_firebase_auth", "target": "tech_firebase_rtdb", "relation": "conceptually_related_to", "confidence": "INFERRED", "confidence_score": 0.95, "source_file": base+"/barista.md", "source_location": None, "weight": 1.0},
]

data['hyperedges'] = [
  {"id": "hyperedge_order_system", "label": "Order Processing System", "nodes": ["model_order", "model_payment", "model_barista_stock", "enum_order_status", "enum_payment_status", "concept_order_lifecycle"], "relation": "participate_in", "confidence": "EXTRACTED", "confidence_score": 0.95, "source_file": base+"/PRISMA-SCHEMA.md"},
  {"id": "hyperedge_mobile_apps", "label": "Flutter Mobile Apps", "nodes": ["tech_flutter", "tech_firebase_auth", "tech_firebase_rtdb", "concept_order_tracking"], "relation": "participate_in", "confidence": "EXTRACTED", "confidence_score": 0.95, "source_file": base+"/barista.md"},
  {"id": "hyperedge_payment_pipeline", "label": "DOKU Payment Pipeline", "nodes": ["concept_doku_snap", "api_payment_checkout", "api_payment_notification", "concept_payment_flow", "model_payment"], "relation": "participate_in", "confidence": "EXTRACTED", "confidence_score": 0.95, "source_file": base+"/DOKU.md"},
]

data['input_tokens'] = 15000
data['output_tokens'] = 3200

with open('/Users/dandiramdani/Projects/ascend/webadmin/docs/graphify-out/.graphify_chunk_01.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Graph generated successfully!")
