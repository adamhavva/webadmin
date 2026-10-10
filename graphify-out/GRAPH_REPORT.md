# Graph Report - webadmin  (2026-10-11)

## Corpus Check
- 319 files · ~162,613 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .toml 2, .example 1)

## Summary
- 2166 nodes · 5804 edges · 120 communities (100 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e319510a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Firebase RTDB Setup
- registry.ts
- types.ts
- Quick Links
- index.ts
- checkout/page.tsx
- Non-SNAP Format (DOKU Checkout)
- DokuClient
- ASCEND Development Tasks
- ASCEND Seed Scripts
- doku-checkout.service.ts
- ASCEND Tasks - Simulation Checklist
- ASCEND Development Plan - Order System + Real-time Features
- Detailed Implementation
- API Contracts
- client.ts
- PHASE 2: Real-time Location Tracking
- PHASE 4: Barista-Customer Chat
- Features Checklist
- Implementation Order
- Fake Order Test Script
- radio-group.tsx
- Database Schema Updates
- developers_doku_com_accept-payments_direct-api_non-snap.md
- components.json
- order-report.service.ts
- map/page.tsx
- buttonVariants
- package.json
- dependencies
- devDependencies
- scripts
- Plan: DOKU Payment Flow & Product Pages
- postcss.config.mjs
- seed-admin.ts
- Public Static Assets Directory
- File Icon SVG
- Globe Icon SVG
- Next.js Logo SVG
- Vercel Logo SVG
- Window Icon SVG
- Integration Guide | API Reference
- Notification | API Reference
- db.ts
- Order Simulation Page
- Simulation Page Final State Screenshot
- Simulation Page Screenshot
- Simulation Page State Screenshot
- Simulation Test Screenshot
- next-auth
- .notFound
- barista-stock.service.ts
- ok
- zod
- inventory-batch.service.ts
- finished-product.service.ts
- inventory-item.service.ts
- production.service.ts
- product-image.service.ts
- ApiError
- product.service.ts
- .unprocessable
- restock.service.ts
- order.service.ts
- notification/route.ts
- setting.service.ts
- stock.service.ts
- CardDescription
- user-detail-view.tsx
- user-list-page.tsx
- BaristaStockDetailView
- barista-movements-page.tsx
- barista-stock-page.tsx
- batch-detail-view.tsx
- batch-list-page.tsx
- cost-history-page.tsx
- finished-product-detail-view.tsx
- FinishedBatchListPage
- Button
- item-list-page.tsx
- production-detail-view.tsx
- production-list-page.tsx
- product-detail-view.tsx
- product-list-page.tsx
- recipe-detail-view.tsx
- recipe-list-page.tsx
- DialogDescription
- DialogTitle
- stock-page.tsx
- field.tsx
- Badge
- order-list-page.tsx
- react
- (dashboard)/page.tsx
- CardContent
- profile-edit-form.tsx
- Dialog
- setting-list-page.tsx
- tracking/page.tsx
- app/layout.tsx
- app-sidebar.tsx
- Card
- production-form.tsx
- ProductForm
- recipe-form.tsx
- restock-form.tsx
- dropdown-menu.tsx
- @base-ui/react
- command.tsx
- DialogContent
- navigation-menu.tsx
- pagination.tsx
- select.tsx
- sidebar.tsx
- toast.tsx
- order.assignment.service.ts
- doku.service.ts
- DOKU SNAP API Adapters (Deprecated)
- compilerOptions

## God Nodes (most connected - your core abstractions)
1. `Button()` - 155 edges
2. `ok()` - 141 edges
3. `buttonVariants` - 97 edges
4. `Card()` - 93 edges
5. `CardContent()` - 93 edges
6. `react` - 92 edges
7. `CardHeader()` - 91 edges
8. `CardTitle()` - 89 edges
9. `Badge()` - 88 edges
10. `lucide-react` - 84 edges

## Surprising Connections (you probably didn't know these)
- `✅ DONE - WebAdmin (Next.js)` --references--> `ok()`  [INFERRED]
  TASKS.md → src/lib/api-response.ts
- `✅ DONE - WebAdmin (Next.js)` --references--> `created()`  [INFERRED]
  TASKS.md → src/lib/api-response.ts
- `GET` --calls--> `ok()`  [EXTRACTED]
  src/app/api/orders/simulation/baristas/route.ts → src/lib/api-response.ts
- `GET` --calls--> `ok()`  [EXTRACTED]
  src/app/api/products/route.ts → src/lib/api-response.ts
- `getStockBadge()` --calls--> `Badge()`  [EXTRACTED]
  src/components/inventory/items/item-list-page.tsx → src/components/ui/badge.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Next.js Static Asset Files** — public_file_svg, public_globe_svg, public_next_svg, public_vercel_svg, public_window_svg [EXTRACTED 1.00]
- **Order Simulation Page Screenshots** — simulation_page_final_png, simulation_page_state_png, simulation_page_png, simulation_test_png [INFERRED 0.75]

## Communities (120 total, 20 thin omitted)

### Community 0 - "Firebase RTDB Setup"
Cohesion: 0.06
Nodes (33): Checklist Firebase Data, Current Status, Edge Function Secrets (Required), Firebase Credentials, Firebase RTDB Setup, Firebase RTDB Structure, JWT Token Generation, Last Updated (+25 more)

### Community 1 - "registry.ts"
Cohesion: 0.11
Nodes (21): getDokuClient(), EWALLET_CHANNEL_CODES, EWalletChannel, createVAAdapter(), DokuVAAdapter, DOKUVARequest, VA_CHANNEL_CODES, VAChannel (+13 more)

### Community 2 - "types.ts"
Cohesion: 0.17
Nodes (11): createEWalletAdapter(), DokuEWalletAdapter, DokuQRISAdapter, CreatePaymentRequest, CreatePaymentResponse, Payment, PaymentGroupOption, PaymentMethodOption (+3 more)

### Community 3 - "Quick Links"
Cohesion: 0.10
Nodes (20): API Routes Summary, ASCEND System Documentation, Barista App (Flutter), Barista App (Flutter), Change Log, Current Status, Customer App (Flutter), Customer App (Flutter) (+12 more)

### Community 4 - "index.ts"
Cohesion: 0.20
Nodes (17): calculateFee(), calculateTotalWithFee(), FeeBreakdown, FeeCalculation, formatCurrency(), getMethodFee(), convertToPayment(), createPayment() (+9 more)

### Community 5 - "checkout/page.tsx"
Cohesion: 0.13
Nodes (16): calculateDistance(), CartData, CartItem, Charge, CheckoutPage(), handlePayment(), CreateOrderResponse, CreatePaymentResponse (+8 more)

### Community 6 - "Non-SNAP Format (DOKU Checkout)"
Cohesion: 0.11
Nodes (17): HTTP Notification Sample for SNAP | API Reference, Key Differences: SNAP vs Non-SNAP, Non-SNAP E-Wallet (Shopeepay), Non-SNAP Format (DOKU Checkout), Non-SNAP QRIS Notification, Non-SNAP Transaction Status Values, Non-SNAP Virtual Account Notification, Notes (+9 more)

### Community 8 - "ASCEND Development Tasks"
Cohesion: 0.11
Nodes (17): ASCEND Development Tasks, Database Grants Verification, Docs Index, ✅ DONE - Database Grants, ✅ DONE - Supabase Edge Functions, Edge Function, Edge Function Test Results, Firebase JWT Signing (Priority: HIGH) (+9 more)

### Community 9 - "ASCEND Seed Scripts"
Cohesion: 0.13
Nodes (14): ASCEND Seed Scripts, Creates, Default Credentials, explore-db.ts, Firebase Auth, Firebase Data Structure, Firebase RTDB, Last Updated (+6 more)

### Community 10 - "doku-checkout.service.ts"
Cohesion: 0.22
Nodes (12): checkDOKUPaymentStatus(), createDOKUCheckout(), DOKUCheckoutRequest, DOKUCheckoutResult, DOKUConfig, generateSignature(), generateUUID(), getDOKUConfig() (+4 more)

### Community 11 - "ASCEND Tasks - Simulation Checklist"
Cohesion: 0.14
Nodes (13): API Test, ASCEND Tasks - Simulation Checklist, Created, Done ✅, Edge Function, Expected Response, Firebase RTDB, In Progress (+5 more)

### Community 12 - "ASCEND Development Plan - Order System + Real-time Features"
Cohesion: 0.17
Nodes (11): ascend_barista (Flutter), ASCEND Development Plan - Order System + Real-time Features, File Structure, Integration Tests, Notes, Overview, Status, Technology Stack (+3 more)

### Community 13 - "Detailed Implementation"
Cohesion: 0.20
Nodes (10): 1.1 Existing Implementation ✅, 1.2 Order Accept Page (Barista App) 🔲, 1.3 Decline Order Logic ✅ DONE, 3.1 Firebase RTDB Structure, 3.2 Barista Updates During Delivery, 3.3 Customer Watches Live Tracking, 3.4 Sync to Supabase on Completion, Detailed Implementation (+2 more)

### Community 14 - "API Contracts"
Cohesion: 0.29
Nodes (7): API Contracts, Chat Endpoints, Get Messages, Get Tracking (Customer), Order Tracking Endpoints, Send Message, Update Tracking (Barista)

### Community 15 - "client.ts"
Cohesion: 0.29
Nodes (4): DokuConfig, DokuRequestOptions, DokuResponse, isSuccessCode()

### Community 16 - "PHASE 2: Real-time Location Tracking"
Cohesion: 0.33
Nodes (6): 2.1 Firebase RTDB Structure, 2.2 Barista Location Sync (Flutter), 2.3 Customer Location Sync (Flutter - Customer App), 2.4 WebAdmin: Barista Map, 2.5 Updated Edge Function, PHASE 2: Real-time Location Tracking

### Community 17 - "PHASE 4: Barista-Customer Chat"
Cohesion: 0.33
Nodes (6): 4.1 Firebase RTDB Structure, 4.2 Send Message API (WebAdmin), 4.3 Subscribe to Messages (Flutter), 4.4 Chat UI, 4.5 WhatsApp Deep Link (Quick Solution), PHASE 4: Barista-Customer Chat

### Community 18 - "Features Checklist"
Cohesion: 0.33
Nodes (6): Features Checklist, Phase 1: Order Assignment Flow ✅ COMPLETE, Phase 2: Real-time Location Tracking 🔲 PARTIAL, Phase 3: Order Status Tracking 🔲 PARTIAL, Phase 4: Barista-Customer Chat 🔲 PENDING, Phase 5: Integration & Testing ✅ COMPLETE

### Community 19 - "Implementation Order"
Cohesion: 0.33
Nodes (6): Implementation Order, Week 1: Order Accept Page, Week 2: Location Tracking, Week 3: Order Tracking, Week 4: Chat, Week 5: Integration & Polish

### Community 20 - "Fake Order Test Script"
Cohesion: 0.50
Nodes (4): Fake Order Test Script, Features, Location, Usage

### Community 21 - "radio-group.tsx"
Cohesion: 0.50
Nodes (3): @radix-ui/react-radio-group, RadioGroup, RadioGroupItem

### Community 22 - "Database Schema Updates"
Cohesion: 0.67
Nodes (3): Database Schema Updates, New Model: ChatMessage, Prisma Schema (webadmin/prisma/schema.prisma)

### Community 47 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 99 - "order-report.service.ts"
Cohesion: 0.11
Nodes (23): exceljs, GET, ExportMeta, exportOrderReport(), fmtDateTime(), handleExport(), buildSheet(), BuildSheetArgs (+15 more)

### Community 102 - "map/page.tsx"
Cohesion: 0.06
Nodes (33): leaflet, react-leaflet, ActiveOrder, fmtRupiah(), ListResponse, OrdersLiveMap, OrdersLiveMapStyles, OrdersMapPage() (+25 more)

### Community 106 - "buttonVariants"
Cohesion: 0.07
Nodes (44): nextConfig, lucide-react, next, DetailResponse, EditAdminPage(), EditSkeleton(), NewAdminPage(), RestockBaristaPage() (+36 more)

### Community 109 - "package.json"
Cohesion: 0.07
Nodes (27): name, private, type, version, @anthropic-ai/claude-code, babel-plugin-react-compiler, cmdk, date-fns (+19 more)

### Community 110 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/claude-code, @aws-sdk/client-s3, @base-ui/react, class-variance-authority, cmdk, cn, date-fns (+23 more)

### Community 140 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, babel-plugin-react-compiler, dotenv, playwright, prisma, @prisma/cli-engine, tailwindcss, @tailwindcss/postcss (+7 more)

### Community 157 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, postinstall, seed:admin, start

### Community 171 - "seed-admin.ts"
Cohesion: 0.21
Nodes (9): dotenv, prisma, main(), syncDatabaseUser(), syncFirebaseUser(), USERS, generateBatchCode(), INVENTORY_ITEMS (+1 more)

### Community 206 - "db.ts"
Cohesion: 0.09
Nodes (15): @prisma/adapter-pg, METHODS, GET, GET, GET, GET, adapter, prisma (+7 more)

### Community 217 - "next-auth"
Cohesion: 0.13
Nodes (12): next-auth, handler, authOptions, SessionUser, adminAuth, serviceAccount, config, JWT (+4 more)

### Community 219 - ".notFound"
Cohesion: 0.10
Nodes (34): GET, PATCH, POST, PATCH, DELETE, GET, PATCH, GET (+26 more)

### Community 228 - "barista-stock.service.ts"
Cohesion: 0.11
Nodes (26): POST, GET, GET, GET, POST, POST, GET, adjustBaristaStock() (+18 more)

### Community 242 - "ok"
Cohesion: 0.11
Nodes (34): GET, DELETE, GET, PUT, GET, GET, GET, GET (+26 more)

### Community 244 - "zod"
Cohesion: 0.28
Nodes (10): zod, GET, DashboardStats, formatDateOnly(), getDashboardStats(), startOfDay(), startOfDaysAgo(), startOfMonth() (+2 more)

### Community 246 - "inventory-batch.service.ts"
Cohesion: 0.27
Nodes (10): GET, PATCH, GET, getInventoryBatchById(), listInventoryBatches(), updateInventoryBatch(), ListInventoryBatchQuery, listInventoryBatchQuerySchema (+2 more)

### Community 255 - "finished-product.service.ts"
Cohesion: 0.22
Nodes (14): DELETE, GET, PATCH, GET, getFinishedBatchById(), listFinishedBatches(), updateFinishedBatch(), voidFinishedBatch() (+6 more)

### Community 261 - "inventory-item.service.ts"
Cohesion: 0.18
Nodes (18): DELETE, GET, PATCH, GET, POST, createInventoryItem(), deactivateInventoryItem(), getInventoryItemById() (+10 more)

### Community 268 - "production.service.ts"
Cohesion: 0.09
Nodes (32): GET, GET, POST, GET, POST, POST, previewSchema, computeFifoForItem() (+24 more)

### Community 277 - "product-image.service.ts"
Cohesion: 0.13
Nodes (22): @aws-sdk/client-s3, sharp, DELETE, PATCH, publicUrlFor(), r2, R2_BUCKET, R2_PUBLIC_BASE (+14 more)

### Community 280 - "ApiError"
Cohesion: 0.15
Nodes (11): GET, POST, GET, POST, GET, ApiError, created(), listProductImages() (+3 more)

### Community 283 - "product.service.ts"
Cohesion: 0.15
Nodes (20): DELETE, GET, PATCH, GET, POST, calculateEstimatedHpp(), createProduct(), deactivateProduct() (+12 more)

### Community 290 - ".unprocessable"
Cohesion: 0.12
Nodes (27): PATCH, PATCH, GET, POST, activateRecipe(), computeMargin(), createRecipe(), deactivateRecipe() (+19 more)

### Community 304 - "restock.service.ts"
Cohesion: 0.17
Nodes (18): DELETE, GET, GET, POST, createRestock(), generateBatchCode(), getRestockById(), listRestocks() (+10 more)

### Community 312 - "order.service.ts"
Cohesion: 0.09
Nodes (38): POST, POST, POST, POST, POST, POST, GET, POST (+30 more)

### Community 331 - "notification/route.ts"
Cohesion: 0.17
Nodes (14): logWebhook(), POST, verifyDokuSignature(), CreatePaymentInput, createPaymentSchema, DOKU_STATUS_MAP, DokuNonSnapNotification, dokuNonSnapNotificationSchema (+6 more)

### Community 347 - "setting.service.ts"
Cohesion: 0.16
Nodes (18): GET, DELETE, GET, PATCH, GET, POST, createSetting(), deleteSetting() (+10 more)

### Community 365 - "stock.service.ts"
Cohesion: 0.21
Nodes (12): GET, GET, FinishedStockItem, getLowStockItems(), getStockSummary(), MaterialStockItem, MaterialStockStatus, StockSummary (+4 more)

### Community 376 - "CardDescription"
Cohesion: 0.12
Nodes (22): Page(), ItemDetailPage(), Batch, DetailError(), DetailResponse, DetailSkeleton(), formatDateTime(), formatNumber() (+14 more)

### Community 382 - "user-detail-view.tsx"
Cohesion: 0.15
Nodes (14): AdminDetailPage(), UserDetailPage(), DetailError(), DetailResponse, DetailSkeleton(), formatDate(), formatDateTime(), getInitials() (+6 more)

### Community 386 - "user-list-page.tsx"
Cohesion: 0.14
Nodes (14): AdminsPage(), UsersPage(), formatDate(), getInitials(), ListResponse, MutationResponse, Props, Role (+6 more)

### Community 388 - "BaristaStockDetailView"
Cohesion: 0.15
Nodes (7): BaristaStockDetailPage(), PageProps, BaristaStockDetailView(), DetailSkeleton(), formatDateTime(), formatNumber(), formatRupiah()

### Community 391 - "barista-movements-page.tsx"
Cohesion: 0.19
Nodes (12): BaristaMovementsRoutePage(), BaristaMovementsPage(), formatDateTime(), formatNumber(), ListResponse, Movement, MovementsEmptyState(), MovementsErrorState() (+4 more)

### Community 393 - "barista-stock-page.tsx"
Cohesion: 0.22
Nodes (10): BaristaStockRoutePage(), BaristaStockItem, BaristaStockPage(), BaristaStockProduct, formatNumber(), formatRupiah(), ListResponse, StockEmptyState() (+2 more)

### Community 397 - "batch-detail-view.tsx"
Cohesion: 0.16
Nodes (14): BatchDetailPage(), BatchDetail, BatchDetailView(), handleEdit(), DetailError(), DetailResponse, DetailSkeleton(), formatDateTime() (+6 more)

### Community 399 - "batch-list-page.tsx"
Cohesion: 0.17
Nodes (12): BatchesPage(), Batch, BatchEmptyState(), BatchErrorState(), BatchListPage(), handleEdit(), BatchSkeleton(), formatDateTime() (+4 more)

### Community 401 - "cost-history-page.tsx"
Cohesion: 0.17
Nodes (14): CostHistoryRoutePage(), CostEntry, CostHistoryEmptyState(), CostHistoryErrorState(), CostHistoryPage(), CostHistorySkeleton(), formatDateTime(), formatNumber() (+6 more)

### Community 403 - "finished-product-detail-view.tsx"
Cohesion: 0.14
Nodes (12): FinishedBatchDetailPage(), DetailError(), DetailResponse, DetailSkeleton(), FinishedBatchDetail, FinishedBatchDetailView(), formatDateTime(), formatNumber() (+4 more)

### Community 405 - "FinishedBatchListPage"
Cohesion: 0.14
Nodes (7): FinishedBatchesPage(), BatchSkeleton(), FinishedBatchListPage(), formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost()

### Community 407 - "Button"
Cohesion: 0.20
Nodes (12): react-day-picker, DetailResponse, EditItemPage(), EditSkeleton(), ItemForm(), ItemFormData, Props, Unit (+4 more)

### Community 415 - "item-list-page.tsx"
Cohesion: 0.16
Nodes (14): ItemsPage(), formatNumber(), Item, ItemEmptyState(), ItemErrorState(), ItemListPage(), getStockBadge(), ItemSkeleton() (+6 more)

### Community 417 - "production-detail-view.tsx"
Cohesion: 0.26
Nodes (11): ProductionDetailPage(), DetailError(), DetailResponse, DetailSkeleton(), formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost() (+3 more)

### Community 421 - "production-list-page.tsx"
Cohesion: 0.26
Nodes (10): ProductionsPage(), formatDateTime(), formatNumber(), formatRupiah(), ListResponse, Production, ProductionEmptyState(), ProductionErrorState() (+2 more)

### Community 426 - "product-detail-view.tsx"
Cohesion: 0.13
Nodes (16): ProductDetailPage(), CostHistory, DetailError(), DetailResponse, DetailSkeleton(), formatBytes(), formatDateTime(), formatNumber() (+8 more)

### Community 430 - "product-list-page.tsx"
Cohesion: 0.18
Nodes (13): ProductsPage(), formatNumber(), formatRupiah(), ListResponse, marginBadgeClass(), MutationResponse, Product, ProductEmptyState() (+5 more)

### Community 435 - "recipe-detail-view.tsx"
Cohesion: 0.16
Nodes (14): RecipeDetailPage(), DetailError(), DetailResponse, DetailSkeleton(), FifoAllocation, formatDateTime(), formatNumber(), formatRupiah() (+6 more)

### Community 440 - "recipe-list-page.tsx"
Cohesion: 0.10
Nodes (14): RecipesPage(), formatDateTime(), formatNumber(), formatRupiah(), ListResponse, marginColorClass(), MutationResponse, Recipe (+6 more)

### Community 442 - "DialogDescription"
Cohesion: 0.18
Nodes (12): RestockDetailPage(), DetailError(), DetailResponse, DetailSkeleton(), formatDateTime(), formatNumber(), formatRupiah(), MutationResponse (+4 more)

### Community 446 - "DialogTitle"
Cohesion: 0.17
Nodes (7): RestocksPage(), formatDateTime(), formatNumber(), formatRupiah(), RestockListPage(), RestockSkeleton(), DialogTitle()

### Community 448 - "stock-page.tsx"
Cohesion: 0.16
Nodes (15): StockRoutePage(), finishedStatusBadge(), FinishedStatusFilter, FinishedStockItem, formatNumber(), formatRupiah(), materialStatusBadge(), MaterialStatusFilter (+7 more)

### Community 450 - "field.tsx"
Cohesion: 0.16
Nodes (11): DashboardLayout(), ModeToggle(), NotificationButton(), Field(), FieldSeparator(), fieldVariants, Separator(), SidebarInset() (+3 more)

### Community 452 - "Badge"
Cohesion: 0.10
Nodes (24): OrderDetailPage(), PageProps, ReportsOrdersPage(), canCancel(), DetailError(), DetailResponse, DetailSkeleton(), fmtDateTime() (+16 more)

### Community 463 - "order-list-page.tsx"
Cohesion: 0.12
Nodes (17): OrdersPage(), canCancel(), ChannelFilter, fmtDateTime(), fmtRupiah(), ListResponse, MutationResponse, Order (+9 more)

### Community 465 - "react"
Cohesion: 0.06
Nodes (48): react, CartItem, fmtRupiah(), OrderSimulationPage(), PreviewData, ProductItem, fmtRupiah(), Product (+40 more)

### Community 473 - "(dashboard)/page.tsx"
Cohesion: 0.13
Nodes (22): recharts, DashboardError(), DashboardPage(), DashboardSkeleton(), DashboardStats, formatCompactRupiah(), formatDateShort(), formatRelativeTime() (+14 more)

### Community 482 - "CardContent"
Cohesion: 0.08
Nodes (46): StatCard(), ReportFilterValue, TabKey, TabMeta, TABS, BatchesTab(), BatchRow, fmtDateTime() (+38 more)

### Community 484 - "profile-edit-form.tsx"
Cohesion: 0.23
Nodes (14): ProfileEditPage(), ACCEPTED_TYPES, formatDateTime(), getInitials(), isoToDateInput(), normalizePhone(), ProfileData, ProfileEditForm() (+6 more)

### Community 488 - "Dialog"
Cohesion: 0.31
Nodes (7): ReportsProductsPage(), formatFilterLabels(), ReportPage(), handleExport(), CommandDialog(), Dialog(), DialogHeader()

### Community 490 - "setting-list-page.tsx"
Cohesion: 0.11
Nodes (12): SettingsRoutePage(), formatValue(), ListResponse, MutationResponse, Setting, SettingEmptyState(), SettingErrorState(), SettingListPage() (+4 more)

### Community 492 - "tracking/page.tsx"
Cohesion: 0.08
Nodes (37): firebase, RoleFilter, timeAgo(), TrackingMap, TrackingMapStyles, TrackingPage(), AutoFitBounds(), getMarkerIcon() (+29 more)

### Community 508 - "app/layout.tsx"
Cohesion: 0.25
Nodes (7): next-themes, geistMono, geistSans, metadata, RootLayout(), AppSessionProvider(), ThemeProvider()

### Community 518 - "app-sidebar.tsx"
Cohesion: 0.14
Nodes (22): administration, AppSidebar(), dashboard, inventoryFlow, orders, reports, system, teams (+14 more)

### Community 540 - "Card"
Cohesion: 0.18
Nodes (17): AvailableProduct, Barista, BaristaListResponse, BaristaRestockForm(), addRow(), handleProductChange(), handleSubmit(), updateRow() (+9 more)

### Community 680 - "production-form.tsx"
Cohesion: 0.19
Nodes (13): FifoAllocation, formatNumber(), formatRupiah(), formatUnitCost(), MutationResponse, parseNumber(), PreviewItem, PreviewResponse (+5 more)

### Community 722 - "ProductForm"
Cohesion: 0.13
Nodes (9): formatBytes(), formatDigits(), formatRupiah(), nextUid(), ProductForm(), addFiles(), addMetadataRow(), handleDrop() (+1 more)

### Community 760 - "recipe-form.tsx"
Cohesion: 0.13
Nodes (18): emptyRow(), FifoAllocation, formatNumber(), formatRupiah(), formatUnitCost(), FormError(), FormSkeleton(), MutationResponse (+10 more)

### Community 804 - "restock-form.tsx"
Cohesion: 0.18
Nodes (12): BulkResponse, emptyRow(), formatDigits(), formatRupiahDisplay(), InventoryItem, ItemsResponse, parseNumber(), RestockForm() (+4 more)

### Community 854 - "dropdown-menu.tsx"
Cohesion: 0.19
Nodes (21): NavProjects(), getInitials(), NavUser(), TeamSwitcher(), Avatar(), AvatarFallback(), AvatarImage(), DropdownMenu() (+13 more)

### Community 1087 - "command.tsx"
Cohesion: 0.12
Nodes (19): Command(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), InputGroup(), InputGroupAddon() (+11 more)

### Community 1097 - "DialogContent"
Cohesion: 0.47
Nodes (3): DialogContent(), DialogOverlay(), DialogPortal()

### Community 1124 - "navigation-menu.tsx"
Cohesion: 0.12
Nodes (7): class-variance-authority, EmptyMedia(), emptyMediaVariants, NavigationMenu(), NavigationMenuPositioner(), NavigationMenuTrigger(), navigationMenuTriggerStyle

### Community 1167 - "pagination.tsx"
Cohesion: 0.28
Nodes (4): PaginationLink(), PaginationLinkProps, PaginationNext(), PaginationPrevious()

### Community 1187 - "select.tsx"
Cohesion: 0.24
Nodes (3): SelectContent(), SelectScrollDownButton(), SelectScrollUpButton()

### Community 1199 - "sidebar.tsx"
Cohesion: 0.11
Nodes (19): cn, Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle() (+11 more)

### Community 1253 - "toast.tsx"
Cohesion: 0.28
Nodes (12): toast, ToastAction(), ToastClose(), ToastContent(), ToastDescription(), Toaster(), ToastIcon(), ToastList() (+4 more)

### Community 1356 - "order.assignment.service.ts"
Cohesion: 0.28
Nodes (8): adminDatabase, BaristaCandidate, BaristaLocation, BroadcastOrderInput, FindBaristasInput, findNearestBaristasWithStock(), getActiveBaristasFromFirebase(), haversine()

### Community 1512 - "doku.service.ts"
Cohesion: 0.24
Nodes (10): createDOKUCheckout(), DOKUCheckoutRequest, DOKUCheckoutResult, DOKUConfig, DOKUPaymentMethod, dokuRequest(), generateCheckoutSignature(), generateSnapSignature() (+2 more)

### Community 1719 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, incremental, isolatedModules, jsx, lib (+13 more)

## Knowledge Gaps
- **597 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+592 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 824 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `buttonVariants` to `user-list-page.tsx`, `checkout/page.tsx`, `app-sidebar.tsx`, `barista-movements-page.tsx`, `barista-stock-page.tsx`, `batch-detail-view.tsx`, `batch-list-page.tsx`, `cost-history-page.tsx`, `finished-product-detail-view.tsx`, `Button`, `Card`, `item-list-page.tsx`, `production-detail-view.tsx`, `restock-form.tsx`, `production-list-page.tsx`, `production-form.tsx`, `product-detail-view.tsx`, `product-list-page.tsx`, `recipe-detail-view.tsx`, `recipe-list-page.tsx`, `DialogDescription`, `stock-page.tsx`, `Badge`, `order-list-page.tsx`, `react`, `dropdown-menu.tsx`, `(dashboard)/page.tsx`, `next-auth`, `CardContent`, `profile-edit-form.tsx`, `map/page.tsx`, `tracking/page.tsx`, `package.json`, `recipe-form.tsx`, `ok`, `CardDescription`, `app/layout.tsx`, `user-detail-view.tsx`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `user-list-page.tsx`, `checkout/page.tsx`, `app-sidebar.tsx`, `barista-movements-page.tsx`, `barista-stock-page.tsx`, `batch-detail-view.tsx`, `@base-ui/react`, `batch-list-page.tsx`, `pagination.tsx`, `cost-history-page.tsx`, `finished-product-detail-view.tsx`, `radio-group.tsx`, `Button`, `Card`, `item-list-page.tsx`, `production-detail-view.tsx`, `select.tsx`, `restock-form.tsx`, `production-list-page.tsx`, `production-form.tsx`, `product-detail-view.tsx`, `product-list-page.tsx`, `sidebar.tsx`, `recipe-detail-view.tsx`, `recipe-list-page.tsx`, `DialogDescription`, `command.tsx`, `stock-page.tsx`, `field.tsx`, `Badge`, `DialogContent`, `order-list-page.tsx`, `dropdown-menu.tsx`, `(dashboard)/page.tsx`, `table.tsx`, `CardContent`, `profile-edit-form.tsx`, `toast.tsx`, `map/page.tsx`, `buttonVariants`, `setting-list-page.tsx`, `tracking/page.tsx`, `package.json`, `recipe-form.tsx`, `CardDescription`, `app/layout.tsx`, `user-detail-view.tsx`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `Button()` connect `Button` to `user-list-page.tsx`, `BaristaStockDetailView`, `checkout/page.tsx`, `barista-movements-page.tsx`, `barista-stock-page.tsx`, `batch-detail-view.tsx`, `batch-list-page.tsx`, `pagination.tsx`, `cost-history-page.tsx`, `finished-product-detail-view.tsx`, `FinishedBatchListPage`, `Card`, `item-list-page.tsx`, `production-detail-view.tsx`, `restock-form.tsx`, `production-list-page.tsx`, `production-form.tsx`, `product-detail-view.tsx`, `product-list-page.tsx`, `sidebar.tsx`, `recipe-detail-view.tsx`, `recipe-list-page.tsx`, `DialogDescription`, `DialogTitle`, `command.tsx`, `stock-page.tsx`, `field.tsx`, `Badge`, `DialogContent`, `order-list-page.tsx`, `react`, `ProductForm`, `(dashboard)/page.tsx`, `CardContent`, `profile-edit-form.tsx`, `toast.tsx`, `map/page.tsx`, `Dialog`, `buttonVariants`, `setting-list-page.tsx`, `tracking/page.tsx`, `recipe-form.tsx`, `CardDescription`, `user-detail-view.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _597 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Firebase RTDB Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10582010582010581 - nodes in this community are weakly interconnected._
- **Should `Quick Links` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._