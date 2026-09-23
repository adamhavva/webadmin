@AGENTS.md
# ASCEND — Dokumentasi Flow Inventory → Recipe → Production → Finished Product

Dokumentasi ini mengikuti struktur sumber project, tetapi **menggunakan flow baru yang sudah kita sepakati**: **Product bukan InventoryItem**, Product tetap satu master meskipun mempunyai banyak batch produk jadi. Flow lama yang menjadikan Production menghasilkan `InventoryBatch` untuk Product tidak dipakai lagi. Blueprint menetapkan bahwa Product bukan sumber stok inventory dan HPP harus dapat ditelusuri sampai item, batch, recipe, production, dan production component.  

---

# 1. MASTER FLOW

Flow utama ASCEND:

```text
                    ┌─────────────────┐
                    │ Inventory Item  │
                    │   Bahan/Material │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Restock     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Inventory Batch │
                    │ Qty + Unit Cost │
                    └────────┬────────┘
                             │
                             │
                             │ digunakan Recipe
                             ▼
┌──────────────┐      ┌──────────────┐
│   Product    │─────▶│    Recipe    │
│  Kopi Susu   │      │  Composition │
└──────┬───────┘      └──────┬───────┘
       │                     │
       │                     ▼
       │              ┌──────────────┐
       └─────────────▶│  Production  │
                      └──────┬───────┘
                             │
                   ┌─────────┴─────────┐
                   │                   │
                   ▼                   ▼
          Consume Inventory      Calculate HPP
                   │                   │
                   ▼                   ▼
          ProductionComponent   ProductCostHistory
                   │
                   ▼
        ┌────────────────────────┐
        │ FinishedProductBatch   │
        │ Product Jadi / Stock   │
        └────────────────────────┘
```

Intinya:

```text
InventoryItem
    ↓
Restock
    ↓
InventoryBatch
    ↓
Recipe
    ↓
Production
    ↓
FIFO Consumption
    ↓
ProductionComponent
    ↓
Actual HPP
    ↓
FinishedProductBatch
    ↓
Produk Jadi
```

---

# 2. KONSEP MASTER VS BATCH

Ini bagian paling penting.

## Master

```text
InventoryItem
Product
ProductRecipe
RecipeItem
```

Master adalah identitas/definisi.

## Batch / transaksi stok

```text
InventoryBatch
FinishedProductBatch
Restock
Production
ProductionComponent
```

Batch menyimpan kejadian dan kondisi stok/cost pada waktu tertentu.

---

# 3. INVENTORY ITEM

## Tujuan

`InventoryItem` adalah master bahan/material yang digunakan dalam proses bisnis.

Contoh:

```text
Milk
Coffee
Creamer
Ice
Cup
Lid
Straw
```

InventoryItem **bukan Product**.

---

## Input

Admin membuat Inventory Item:

```json
{
  "name": "Milk",
  "unit": "ML",
  "isActive": true
}
```

### Field

| Field      | Required | Keterangan   |
| ---------- | -------: | ------------ |
| `name`     |       Ya | Nama bahan   |
| `unit`     |       Ya | `ML` / `PCS` |
| `isActive` |       Ya | Status aktif |

---

## Output

```json
{
  "id": "inv_milk",
  "name": "Milk",
  "unit": "ML",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

# 4. RESTOCK

Restock adalah proses memasukkan bahan ke inventory.

Flow:

```text
Admin
 ↓
Pilih InventoryItem
 ↓
Masukkan quantity
 ↓
Masukkan unit cost / total cost
 ↓
Restock
 ↓
InventoryBatch baru
```

Setiap Restock menghasilkan **batch baru**. Sumber project juga menetapkan bahwa setiap restock menghasilkan batch baru dan perubahan harga tidak mengubah batch lama. 

---

# 5. INPUT RESTOCK

Contoh:

```json
{
  "inventoryItemId": "inv_milk",
  "quantity": 2000,
  "unitCost": 15,
  "totalCost": 30000,
  "supplierName": "Supplier A"
}
```

Backend menghitung/validasi:

```text
quantity   = 2.000 ML
unitCost   = Rp15 / ML
totalCost  = Rp30.000
```

Validasi:

```text
quantity > 0
unitCost >= 0
totalCost >= 0
InventoryItem harus aktif
```

---

# 6. OUTPUT RESTOCK

Backend membuat:

### Restock

```text
RESTOCK-001
Milk
2.000 ML
Rp30.000
```

### InventoryBatch

```text
MILK-001

InventoryItem:
Milk

Quantity:
2.000 ML

Remaining:
2.000 ML

Unit Cost:
Rp15 / ML

Total Cost:
Rp30.000
```

Relasi:

```text
Restock
   │
   └── InventoryBatch
          │
          └── InventoryItem
```

---

# 7. KENAPA BATCH DIPISAH?

Karena harga bahan dapat berubah.

Contoh:

```text
20 Sep
MILK-001
2.000 ML
Rp15 / ML
```

Kemudian harga naik:

```text
25 Sep
MILK-002
2.000 ML
Rp18 / ML
```

Inventory menjadi:

```text
Milk

MILK-001
2.000 ML @ Rp15

MILK-002
2.000 ML @ Rp18
```

**MILK-001 tidak boleh diubah menjadi Rp18.**

Historical cost harus tetap.

---

# 8. PRODUCT

Product adalah **master produk yang dijual**.

Contoh:

```text
Kopi Susu
```

Product hanya satu:

```text
Product
id = product_kopi_susu
name = Kopi Susu
sellingPrice = Rp25.000
```

Walaupun diproduksi berkali-kali:

```text
Product
└── Kopi Susu
     ├── FinishedProductBatch #001
     ├── FinishedProductBatch #002
     └── FinishedProductBatch #003
```

Jadi:

```text
Product = MASTER
FinishedProductBatch = STOCK
```

---

# 9. INPUT PRODUCT

```json
{
  "name": "Kopi Susu",
  "sellingPrice": 25000,
  "isActive": true
}
```

Output:

```json
{
  "id": "product_kopi_susu",
  "name": "Kopi Susu",
  "sellingPrice": "25000",
  "isActive": true
}
```

Product **tidak menerima**:

```text
inventoryItemId
outputInventoryId
batchId
stock
```

Karena Product bukan InventoryItem.

---

# 10. RECIPE

Recipe menentukan:

> Untuk membuat 1 unit Product, material apa yang diperlukan dan berapa jumlahnya?

Contoh:

```text
Product:
Kopi Susu
```

Recipe:

```text
Espresso   35 ML
Milk       100 ML
Creamer    20 ML
Ice        150 ML
Cup        1 PCS
```

Recipe hanya menentukan formula.

Recipe **tidak**:

* memilih batch;
* mengurangi stock;
* menjalankan FIFO;
* menghitung HPP final;
* membuat production;
* membuat finished batch.

Ini memang dipisahkan dari tanggung jawab Production dalam dokumentasi modul Recipe. 

---

# 11. INPUT RECIPE

Pertama:

```json
{
  "productId": "product_kopi_susu",
  "version": 1,
  "isActive": true
}
```

Kemudian Recipe Items:

```json
[
  {
    "inventoryItemId": "inv_espresso",
    "quantity": 35
  },
  {
    "inventoryItemId": "inv_milk",
    "quantity": 100
  },
  {
    "inventoryItemId": "inv_creamer",
    "quantity": 20
  },
  {
    "inventoryItemId": "inv_ice",
    "quantity": 150
  },
  {
    "inventoryItemId": "inv_cup",
    "quantity": 1
  }
]
```

---

# 12. OUTPUT RECIPE

```text
Product
└── Kopi Susu
    │
    └── Recipe v1
        │
        ├── Espresso → 35 ML
        ├── Milk → 100 ML
        ├── Creamer → 20 ML
        ├── Ice → 150 ML
        └── Cup → 1 PCS
```

---

# 13. RECIPE VERSIONING

Misalnya Recipe v1:

```text
Milk = 100 ML
```

Kemudian berubah:

```text
Milk = 120 ML
```

Jangan mengubah histori Production lama.

Buat:

```text
Recipe v1
Milk = 100 ML

Recipe v2
Milk = 120 ML
```

Kemudian v2 menjadi active.

```text
Product
└── Kopi Susu
    ├── Recipe v1
    │   └── inactive
    │
    └── Recipe v2
        └── active
```

Production baru menggunakan active recipe.

---

# 14. PRODUCTION

Production adalah proses nyata untuk membuat Product.

Input sederhana dari user:

```json
{
  "productId": "product_kopi_susu",
  "outputQuantity": 10
}
```

User **tidak memilih batch bahan secara manual**.

User juga tidak memilih:

```text
Milk batch
Espresso batch
Creamer batch
```

Backend yang menentukan FIFO.

---

# 15. PRODUCTION FLOW LENGKAP

```text
POST Production
      │
      ▼
productId
      │
      ▼
Load Product
      │
      ▼
Load Active Recipe
      │
      ▼
outputQuantity = 10
      │
      ▼
Hitung kebutuhan material
      │
      ├── Espresso = 35 × 10 = 350 ML
      ├── Milk     = 100 × 10 = 1.000 ML
      ├── Creamer  = 20 × 10 = 200 ML
      ├── Ice      = 150 × 10 = 1.500 ML
      └── Cup      = 1 × 10 = 10 PCS
      │
      ▼
Cari InventoryBatch FIFO
      │
      ▼
Validasi seluruh kebutuhan
      │
      ├── Tidak cukup
      │      ↓
      │   ROLLBACK
      │
      └── Cukup
             ↓
          Transaction
             │
             ├── Consume Batch
             ├── ProductionComponent
             ├── Calculate Total Cost
             ├── Calculate Unit HPP
             ├── FinishedProductBatch
             └── ProductCostHistory
                    ↓
                 COMMIT
```

Flow Production seperti ini memang menjadi tanggung jawab backend: membaca recipe, menghitung kebutuhan, memilih FIFO, memastikan stok cukup, mengurangi stok secara transactional, mencatat component consumption, menghitung HPP, dan membuat output batch. 

---

# 16. PRODUCTION INPUT

Minimal:

```json
{
  "productId": "product_kopi_susu",
  "outputQuantity": 10
}
```

### User tidak mengirim

```json
{
  "inventoryBatchId": "..."
}
```

Karena batch ditentukan backend berdasarkan FIFO.

---

# 17. PRODUCTION PREVIEW

Sebelum benar-benar melakukan Production, backend dapat menyediakan preview.

Input:

```json
{
  "productId": "product_kopi_susu",
  "outputQuantity": 10
}
```

Backend menghitung:

```text
Kebutuhan:

Espresso
35 × 10
= 350 ML

Milk
100 × 10
= 1.000 ML

Creamer
20 × 10
= 200 ML

Ice
150 × 10
= 1.500 ML

Cup
1 × 10
= 10 PCS
```

---

# 18. PREVIEW FIFO

Misalnya Milk:

```text
MILK-001
500 ML @ Rp15

MILK-002
2.000 ML @ Rp18
```

Production membutuhkan:

```text
1.000 ML
```

FIFO:

```text
MILK-001
500 ML @ Rp15

MILK-002
500 ML @ Rp18
```

Preview:

```json
{
  "inventoryItem": {
    "id": "inv_milk",
    "name": "Milk",
    "unit": "ML"
  },
  "requiredQuantity": 1000,
  "allocations": [
    {
      "batchId": "milk_001",
      "batchCode": "MILK-001",
      "quantity": 500,
      "unitCost": 15,
      "totalCost": 7500
    },
    {
      "batchId": "milk_002",
      "batchCode": "MILK-002",
      "quantity": 500,
      "unitCost": 18,
      "totalCost": 9000
    }
  ],
  "totalCost": 16500
}
```

---

# 19. VALIDASI STOK

Backend harus memvalidasi **semua material terlebih dahulu**.

Misalnya:

```text
Espresso
required = 350
available = 500
OK

Milk
required = 1.000
available = 2.500
OK

Creamer
required = 200
available = 50
GAGAL
```

Maka:

```text
Production = FAILED
```

Tidak boleh:

```text
Espresso dikurangi
Milk dikurangi
Creamer gagal
```

Karena itu akan menghasilkan partial mutation.

Yang benar:

```text
VALIDATE ALL
     ↓
semua cukup?
     │
   YES
     ↓
TRANSACTION
     ↓
consume semuanya
```

Kalau tidak cukup:

```text
Tidak ada stock yang berubah.
Tidak ada Production.
Tidak ada FinishedProductBatch.
```

Dokumentasi project secara eksplisit menetapkan behavior tersebut. 

---

# 20. FIFO

FIFO berarti batch paling lama dikonsumsi terlebih dahulu.

Misalnya:

```text
Milk

MILK-001
createdAt 20 Sep
remaining 500 ML
cost Rp15

MILK-002
createdAt 22 Sep
remaining 1.000 ML
cost Rp18

MILK-003
createdAt 25 Sep
remaining 2.000 ML
cost Rp20
```

Kebutuhan:

```text
1.200 ML
```

Allocation:

```text
MILK-001
500 ML

MILK-002
700 ML
```

MILK-003 tidak disentuh.

---

# 21. SATU RECIPE ITEM BISA MENGGUNAKAN BANYAK BATCH

Ini penting.

Recipe:

```text
Milk = 1.200 ML
```

Inventory:

```text
MILK-001 = 500 ML
MILK-002 = 1.000 ML
```

Production:

```text
MILK-001 → 500
MILK-002 → 700
```

Maka satu kebutuhan RecipeItem menghasilkan dua `ProductionComponent`.

Project source juga menegaskan satu kebutuhan dapat mengambil beberapa batch dan inventory tidak boleh negatif. 

---

# 22. PRODUCTION COMPONENT

ProductionComponent adalah bukti material mana yang benar-benar dikonsumsi.

Contoh:

```text
Production #001
Kopi Susu
10 PCS
```

Components:

```text
1.
InventoryItem:
Milk

Batch:
MILK-001

Quantity:
500 ML

Unit Cost:
Rp15

Total:
Rp7.500
```

```text
2.
InventoryItem:
Milk

Batch:
MILK-002

Quantity:
500 ML

Unit Cost:
Rp18

Total:
Rp9.000
```

Dengan demikian kita bisa menjawab:

> Production ini memakai batch mana?

Dan:

> Berapa cost sebenarnya?

---

# 23. INVENTORY UPDATE

Sebelum Production:

```text
MILK-001
Quantity = 500
Remaining = 500
```

Setelah menggunakan 500:

```text
MILK-001
Quantity = 500
Remaining = 0
```

Batch tidak dihapus.

History tetap ada.

---

# 24. HPP PRODUCTION

Misalnya Production 10 Kopi Susu:

```text
Espresso
350 ML × Rp1.000
= Rp350.000

Milk
500 ML × Rp15
= Rp7.500

Milk
500 ML × Rp18
= Rp9.000

Creamer
200 ML × Rp20
= Rp4.000

Ice
1.500 ML × Rp2
= Rp3.000

Cup
10 PCS × Rp1.000
= Rp10.000
```

Total:

```text
Rp383.500
```

Output:

```text
10 PCS
```

Unit HPP:

```text
Rp383.500 / 10
= Rp38.350
```

---

# 25. OUTPUT PRODUCTION

Production menghasilkan:

```json
{
  "id": "production_001",
  "productId": "product_kopi_susu",
  "outputQuantity": 10,
  "totalCost": 383500,
  "unitCost": 38350
}
```

Kemudian:

```text
FinishedProductBatch
```

dibuat:

```json
{
  "productId": "product_kopi_susu",
  "productionId": "production_001",
  "batchCode": "KOPI-SUSU-001",
  "quantity": 10,
  "remainingQuantity": 10,
  "unitCost": 38350,
  "totalCost": 383500
}
```

---

# 26. FINISHED PRODUCT BATCH

Ini adalah **stok produk jadi**.

Contoh:

```text
Product
Kopi Susu
```

memiliki:

```text
FinishedProductBatch #001
10 PCS
HPP Rp38.350
```

Kemudian produksi lagi:

```text
FinishedProductBatch #002
20 PCS
HPP Rp41.000
```

Product tetap:

```text
Kopi Susu
```

Bukan:

```text
Kopi Susu #001
Kopi Susu #002
```

---

# 27. PRODUCT → FINISHED BATCH

Relasinya:

```text
Product
└── Kopi Susu
     │
     ├── FinishedProductBatch #001
     │   ├── 10 PCS
     │   ├── Remaining 10
     │   └── HPP 38.350
     │
     ├── FinishedProductBatch #002
     │   ├── 20 PCS
     │   ├── Remaining 20
     │   └── HPP 41.000
     │
     └── FinishedProductBatch #003
         ├── 15 PCS
         ├── Remaining 15
         └── HPP 43.000
```

---

# 28. PRODUCT STOCK

Kita **tidak membuat**:

```prisma
model Product {
  stock Decimal
}
```

Karena itu akan menjadi source of truth kedua.

Stock Product dihitung dari:

```text
SUM(FinishedProductBatch.remainingQuantity)
```

Contoh:

```text
Batch #001 = 3
Batch #002 = 20
Batch #003 = 15
```

Maka:

```text
Kopi Susu stock = 38 PCS
```

Product sendiri tetap master.

---

# 29. PRODUCT COST HISTORY

Setiap Production menghasilkan actual HPP.

Misalnya:

```text
20 Sep
Production #001
HPP = Rp38.350
```

Maka:

```text
ProductCostHistory
Kopi Susu
HPP = Rp38.350
```

Kemudian harga bahan naik.

Production berikutnya:

```text
25 Sep
Production #002
HPP = Rp41.000
```

Maka:

```text
ProductCostHistory

20 Sep → Rp38.350
25 Sep → Rp41.000
```

HPP lama **tidak di-update**.

Historical cost memang harus dipertahankan. 

---

# 30. SELLING PRICE VS HPP

Selling price dan HPP adalah dua hal berbeda.

Contoh:

```text
Product
Kopi Susu

Selling Price:
Rp50.000
```

Production #001:

```text
HPP:
Rp38.350
```

Production #002:

```text
HPP:
Rp41.000
```

Selling price tetap:

```text
Rp50.000
```

Perubahan cost bahan **tidak otomatis mengubah selling price**. 

---

# 31. CONTOH FULL DARI AWAL SAMPAI AKHIR

## STEP 1 — Inventory Item

Input:

```json
{
  "name": "Milk",
  "unit": "ML"
}
```

Output:

```text
InventoryItem
Milk
```

---

## STEP 2 — Restock pertama

Input:

```json
{
  "inventoryItemId": "milk",
  "quantity": 1000,
  "unitCost": 15,
  "totalCost": 15000
}
```

Output:

```text
MILK-001
1.000 ML
Remaining: 1.000 ML
Cost: Rp15/ML
```

---

## STEP 3 — Restock kedua

Input:

```json
{
  "inventoryItemId": "milk",
  "quantity": 2000,
  "unitCost": 18,
  "totalCost": 36000
}
```

Output:

```text
MILK-002
2.000 ML
Remaining: 2.000 ML
Cost: Rp18/ML
```

---

## STEP 4 — Product

Input:

```json
{
  "name": "Kopi Susu",
  "sellingPrice": 50000
}
```

Output:

```text
Product
Kopi Susu
```

---

## STEP 5 — Recipe

Input:

```text
Kopi Susu

Milk
100 ML

Espresso
35 ML

Creamer
20 ML

Cup
1 PCS
```

---

## STEP 6 — Production

Input:

```json
{
  "productId": "kopi-susu",
  "outputQuantity": 10
}
```

Backend menghitung:

```text
Milk
100 × 10
= 1.000 ML
```

---

## STEP 7 — FIFO

Inventory:

```text
MILK-001
1.000 ML @ Rp15

MILK-002
2.000 ML @ Rp18
```

Kebutuhan:

```text
1.000 ML
```

Allocation:

```text
MILK-001
1.000 ML
```

---

## STEP 8 — Consume

```text
MILK-001

Before:
1.000 ML

After:
0 ML
```

MILK-002 tetap:

```text
2.000 ML
```

---

## STEP 9 — Production Component

```text
Production #001

Milk
Batch: MILK-001
Quantity: 1.000 ML
Unit Cost: Rp15
Total: Rp15.000
```

---

## STEP 10 — Calculate HPP

Semua component dijumlah:

```text
Milk       Rp15.000
Espresso   Rp...
Creamer    Rp...
Cup        Rp...
------------------
Total HPP  Rp...
```

---

## STEP 11 — Finished Product Batch

```text
KOPI-SUSU-001

Product:
Kopi Susu

Quantity:
10 PCS

Remaining:
10 PCS

Unit HPP:
Rp...
```

---

## STEP 12 — Product Cost History

```text
Kopi Susu

Production #001
HPP = Rp...
```

---

# 32. KETIKA HARGA BAHAN NAIK

Misalnya Milk:

```text
Batch lama:
MILK-001
Rp15/ML
```

Batch baru:

```text
MILK-002
Rp18/ML
```

Jangan update:

```text
MILK-001 → Rp18
```

Tetap:

```text
MILK-001 → Rp15
MILK-002 → Rp18
```

Production menggunakan FIFO.

---

# 33. PRODUCTION KEDUA

Misalnya MILK-001 tersisa:

```text
200 ML
```

Production membutuhkan:

```text
1.000 ML
```

FIFO:

```text
MILK-001
200 ML @ Rp15

MILK-002
800 ML @ Rp18
```

Cost:

```text
200 × 15 = 3.000
800 × 18 = 14.400

Total Milk Cost:
17.400
```

Jadi HPP Production kedua memang dapat lebih tinggi.

---

# 34. DOKUMENTASI INPUT/OUTPUT SETIAP MODUL

| Modul                  | Input               | Backend Process             | Output                                                 |
| ---------------------- | ------------------- | --------------------------- | ------------------------------------------------------ |
| Inventory Item         | name, unit, active  | Validasi master             | InventoryItem                                          |
| Restock                | item, qty, cost     | Create batch                | Restock + InventoryBatch                               |
| Product                | name, price, active | Create master               | Product                                                |
| Recipe                 | product, version    | Create formula              | ProductRecipe                                          |
| Recipe Item            | item, quantity      | Attach material             | RecipeItem                                             |
| Production Preview     | product, output qty | Recipe + FIFO simulation    | Requirement + allocation + cost estimate               |
| Production             | product, output qty | Recipe + FIFO + transaction | Production + components + finished batch + HPP history |
| Production Component   | generated backend   | Record consumed batch       | Traceability                                           |
| Finished Product Batch | generated backend   | Store finished stock        | Finished stock                                         |
| Product Cost History   | generated backend   | Store actual HPP            | Historical HPP                                         |

---

# 35. DATA YANG BOLEH DIINPUT USER VS BACKEND

## User/Admin boleh menentukan

```text
InventoryItem
├── name
└── unit

Restock
├── inventoryItemId
├── quantity
├── unitCost / totalCost
└── supplierName

Product
├── name
├── sellingPrice
└── isActive

Recipe
├── productId
├── version
└── items

Production
├── productId
└── outputQuantity
```

## Backend yang menentukan

```text
Production
├── activeRecipe
├── required quantities
├── FIFO batches
├── batch allocation
├── stock validation
├── consumption
├── ProductionComponent
├── total HPP
├── unit HPP
├── FinishedProductBatch
└── ProductCostHistory
```

Ini penting agar FE tidak menjadi authority atas stock/cost. Backend tetap menjadi authority untuk business operation, sesuai arsitektur project. 

---

# 36. ATOMIC TRANSACTION

Production harus atomic.

```text
BEGIN TRANSACTION

1. Load Product
2. Load active Recipe
3. Calculate requirement
4. Load FIFO batches
5. Validate availability

6. Update InventoryBatch
   remainingQuantity -= consumed

7. Create Production

8. Create ProductionComponent

9. Calculate totalCost

10. Calculate unitCost

11. Create FinishedProductBatch

12. Create ProductCostHistory

COMMIT
```

Jika salah satu gagal:

```text
ROLLBACK
```

Hasil:

```text
Inventory tidak berubah
Production tidak ada
Component tidak ada
Finished batch tidak ada
Cost history tidak ada
```

---

# 37. SOURCE OF TRUTH

## Inventory material

```text
InventoryBatch.remainingQuantity
```

## Product master

```text
Product
```

## Recipe

```text
ProductRecipe
+
RecipeItem
```

## Production history

```text
Production
+
ProductionComponent
```

## Finished product stock

```text
FinishedProductBatch.remainingQuantity
```

## Historical HPP

```text
FinishedProductBatch.unitCost
+
ProductCostHistory.hpp
```

---

# 38. YANG TIDAK BOLEH DILAKUKAN

### Jangan

```text
Product → InventoryItem
```

### Jangan

```text
Product.stock
```

sebagai source of truth.

### Jangan

```text
RecipeItem → InventoryBatch
```

Recipe hanya menunjuk InventoryItem.

### Jangan

```text
User memilih batch saat Production
```

Backend menjalankan FIFO.

### Jangan

```text
Production → outputInventoryId
```

Product bukan InventoryItem.

### Jangan

```text
Update batch lama ketika harga berubah
```

Buat batch baru.

### Jangan

```text
Production berhasil sebagian
```

Production harus atomic.

### Jangan

```text
Inventory menjadi negatif
```

Backend harus menolak Production jika material tidak cukup.

---

# 39. FINAL ENTITY RELATIONSHIP

```text
                           ┌───────────────┐
                           │    Product    │
                           │  Kopi Susu    │
                           └───────┬───────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                         ▼                   ▼
                  ProductRecipe        Production
                         │                   │
                         ▼                   │
                    RecipeItem              │
                         │                   │
                         ▼                   │
                  InventoryItem              │
                         │                   │
                         ▼                   │
                  InventoryBatch ◀──────────┤
                         │                   │
                         │                   ▼
                         │          ProductionComponent
                         │                   │
                         │                   │
                         │                   ▼
                         │          Actual HPP
                         │                   │
                         │                   ▼
                         │       FinishedProductBatch
                         │                   │
                         │                   │
                         └───────────────────┘
```

Dengan struktur final:

```text
MASTER
├── Product
├── InventoryItem
└── ProductRecipe / RecipeItem

MATERIAL STOCK
├── Restock
└── InventoryBatch

PRODUCTION
├── Production
└── ProductionComponent

FINISHED PRODUCT STOCK
└── FinishedProductBatch

COST HISTORY
└── ProductCostHistory
```

**Ini adalah flow yang harus menjadi acuan BE, FE WebAdmin, dan nantinya laporan HPP/stok.** Yang berubah dari baseline lama adalah terutama pemisahan tegas antara **Product** dan **InventoryItem**: Product tetap satu master, sedangkan hasil setiap production disimpan sebagai `FinishedProductBatch` yang mengarah kembali ke Product. Source project juga menempatkan urutan bisnis sebagai bahan baku → pengadaan → batch bahan → resep → produksi → produk jadi. 
