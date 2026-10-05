# Order API Contract

## Endpoints

### 1. Create Order

```
POST /api/orders
```

**Request:**
```json
{
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "deliveryAddress": "Jl. Braga No. 1, Bandung",
  "deliveryLatitude": -6.9175,
  "deliveryLongitude": 107.6191,
  "deliveryNote": "Pintu merah"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20241004-0001",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "total": "85000"
  }
}
```

---

### 2. Payment Checkout

```
POST /api/payment/checkout
```

**Request:**
```json
{
  "orderId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "snapToken": "token_from_midtrans",
    "redirectUrl": "https://app.midtrans.com/..."
  }
}
```

---

### 3. Payment Notification (Webhook)

```
POST /api/payment/notification
```

Midtrans will POST notification data. WebAdmin verifies signature and processes:

**On SUCCESS:**
1. Update `paymentStatus` = "PAID"
2. Update `status` = "SEARCHING"
3. Call Supabase Edge Function: assign-barista
4. Return 200 to Midtrans

**On PENDING:**
- Order awaiting payment, no action needed

**On EXPIRED/FAILED:**
- Update `paymentStatus` accordingly
- Return 200 to Midtrans

---

### 4. Get Order

```
GET /api/orders/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20241004-0001",
    "status": "ASSIGNED",
    "paymentStatus": "PAID",
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "phone": "081234567890"
    },
    "barista": {
      "id": "uuid",
      "name": "Budi Santoso",
      "phone": "089876543210"
    },
    "items": [...],
    "deliveryAddress": "Jl. Braga No. 1",
    "deliveryLatitude": -6.9175,
    "deliveryLongitude": 107.6191,
    "total": "85000",
    "paymentMethod": "qris",
    "createdAt": "2024-10-04T12:00:00Z"
  }
}
```

---

### 5. List Orders

```
GET /api/orders
```

**Query Params:**
- `status` - Filter by status (PENDING, SEARCHING, ASSIGNED, etc.)
- `baristaId` - Filter by assigned barista
- `customerId` - Filter by customer
- `from` - Start date
- `to` - End date
- `page` - Pagination
- `limit` - Items per page (default 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

### 6. Update Order Status (Barista Action)

```
PATCH /api/orders/:id/status
```

**Request:**
```json
{
  "status": "ACCEPTED"
}
```

**Valid transitions:**
- ASSIGNED → ACCEPTED
- ACCEPTED → DELIVERING
- DELIVERING → ARRIVED
- ARRIVED → COMPLETED

**Any status → CANCELLED** (with reason)

---

### 7. Error Codes

**HTTP Status Codes:**

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | Success | Normal response |
| 201 | Created | New resource created |
| 400 | Bad Request | Invalid request body |
| 401 | Unauthorized | Missing or invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate order number |
| 422 | Unprocessable | Validation error |
| 500 | Internal Error | Server error |

**Error Response Format:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "items", "message": "items must not be empty" }
    ]
  }
}
```

**Error Codes:**

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `DUPLICATE_ORDER` | 409 | Order number already exists |
| `STOCK_INSUFFICIENT` | 422 | Barista stock not enough |
| `INVALID_STATUS_TRANSITION` | 422 | Invalid order status change |
| `PAYMENT_FAILED` | 500 | Payment processing error |
| `ASSIGNMENT_FAILED` | 500 | Barista assignment error |

---

### 8. Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/orders` | 100 requests | 1 minute |
| `POST /api/payment/checkout` | 50 requests | 1 minute |
| `GET /api/orders` | 200 requests | 1 minute |
| `GET /api/orders/:id` | 200 requests | 1 minute |

> **Note:** Webhook endpoints are not rate limited.

---

### 9. Supabase Edge Function: assign-barista

```
POST /functions/v1/assign-barista
```

**Request:**
```json
{
  "orderId": "uuid",
  "customerLat": -6.9175,
  "customerLng": 107.6191
}
```

**Response (200):**
```json
{
  "success": true,
  "baristaId": "uuid",
  "baristaName": "Budi Santoso",
  "baristaPhone": "089876543210",
  "distance": "1.5 km",
  "assignedAt": "2024-10-04T12:05:00Z"
}
```

**Response (404) - No baristas available:**
```json
{
  "success": false,
  "message": "No online baristas available"
}
```

---

## Database Schema

### Order Table (Key Fields)

```sql
-- Customer info
customerId          VARCHAR(255)  -- FK to User
customerName        VARCHAR(255)
customerPhone       VARCHAR(50)

-- Delivery location
deliveryAddress    TEXT
deliveryLatitude    FLOAT
deliveryLongitude   FLOAT
deliveryNote        TEXT

-- Barista assignment
baristaId          VARCHAR(255)  -- FK to User (assigned barista)
status             VARCHAR(50)   -- OrderStatus enum

-- Payment
paymentStatus      VARCHAR(50)   -- PENDING, PAID, FAILED, EXPIRED
paymentProvider    VARCHAR(50)   -- MIDTRANS
paymentMethodCode VARCHAR(50)   -- snapshot: qris, bank_transfer, etc.
paymentMethodName VARCHAR(255)  -- snapshot: QRIS, BCA Virtual Account, etc.

-- Timestamps
assignedAt         TIMESTAMP
acceptedAt         TIMESTAMP
deliveringAt       TIMESTAMP
arrivedAt          TIMESTAMP
completedAt        TIMESTAMP
paidAt             TIMESTAMP
```

### User Table (Barista Fields)

```sql
-- For Haversine calculation
latitude           FLOAT          -- Barista's current location
longitude          FLOAT         -- Barista's current location

-- For status check
status             VARCHAR(20)   -- ACTIVE / INACTIVE
role               VARCHAR(20)  -- BARISTA
```
