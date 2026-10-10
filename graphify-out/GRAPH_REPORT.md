# Graph Report - webadmin  (2026-10-11)

## Corpus Check
- 336 files · ~195,640 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .toml 2, .example 1)

## Summary
- 1835 nodes · 4039 edges · 115 communities (99 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0c518088`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- button.tsx
- order.validator.ts
- order-detail-view.tsx
- order-list-page.tsx
- doku-checkout.service.ts
- recipe-form.tsx
- barista-movements-page.tsx
- product.service.ts
- prisma
- .notFound
- batches-tab.tsx
- devDependencies
- recipe.service.ts
- production.service.ts
- barista-stock.service.ts
- compilerOptions
- order-report-page.tsx
- sidebar.tsx
- buttonVariants
- ApiError
- setting.service.ts
- (dashboard)/page.tsx
- react
- api-response.ts
- components.json
- restock.service.ts
- package.json
- finished-product.service.ts
- product-detail-view.tsx
- stock-page.tsx
- stock.service.ts
- user-form.tsx
- app-sidebar.tsx
- nav-main.tsx
- use-tracking-broadcast.ts
- item-detail-view.tsx
- inventory-batch.service.ts
- finished-product-list-page.tsx
- dropdown-menu.tsx
- login-form.tsx
- firebase.ts
- ProductionDetailView
- toast.tsx
- CLAUDE.md
- dashboard.service.ts
- products/[id]/edit/page.tsx
- setting-list-page.tsx
- inventory/cost-history/route.ts
- nav-user.tsx
- master-products-tab.tsx
- navigation-menu.tsx
- dependencies
- (dashboard)/layout.tsx
- Card
- app/layout.tsx
- pagination.tsx
- index.ts
- UserDetailView
- items/[id]/edit/page.tsx
- RecipeDetailView
- inventory-item.service.ts
- ewallet.ts
- profile-edit-form.tsx
- report-export.ts
- card.tsx
- tracking-map.tsx
- empty.tsx
- UserListPage
- BaristaStockDetailView
- cost-history-page.tsx
- finished-product-detail-view.tsx
- ProductListPage
- RecipeListPage
- SettingListPage
- Badge
- BatchDetailView
- batch-list-page.tsx
- ProductionListPage
- RestockDetailView
- RestockListPage
- production-form.tsx
- restock-form.tsx
- poi-layer.tsx
- next-auth.d.ts
- barista-stock-page.tsx
- utils.ts
- ItemListPage
- command.tsx
- proxy.ts
- DokuClient
- payment.service.ts
- va.ts
- tracking/page.tsx
- input-group.tsx
- leaflet-location-picker.tsx
- include
- src_lib_db
- order.assignment.service.ts
- reject/route.ts
- scripts
- order.charge.service.ts
- cancel/route.ts
- order.service.ts
- ⚠️ DEPRECATED - DOKU SNAP API Adapters
- registry.ts
- seed-kopi.ts
- lib
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `buttonVariants` - 96 edges
2. `react` - 69 edges
3. `Button()` - 68 edges
4. `handleAuth()` - 59 edges
5. `ok()` - 58 edges
6. `Card()` - 49 edges
7. `CardContent()` - 49 edges
8. `CardHeader()` - 48 edges
9. `CardTitle()` - 48 edges
10. `Badge()` - 46 edges

## Surprising Connections (you probably didn't know these)
- `POILayer()` --references--> `react`  [EXTRACTED]
  src/components/tracking/poi-layer.tsx → package.json
- `AutoFitBounds()` --references--> `react`  [EXTRACTED]
  src/components/tracking/tracking-map.tsx → package.json
- `TrackingMapStyles()` --references--> `react`  [EXTRACTED]
  src/components/tracking/tracking-map.tsx → package.json
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/calendar.tsx → package.json
- `SidebarMenuSkeleton()` --references--> `react`  [EXTRACTED]
  src/components/ui/sidebar.tsx → package.json

## Import Cycles
- None detected.

## Communities (115 total, 16 thin omitted)

### Community 0 - "button.tsx"
Cohesion: 0.07
Nodes (39): AdminFormData, Props, BaristaStockDetail, BaristaStockProduct, DetailResponse, MutationResponse, Props, Unit (+31 more)

### Community 1 - "order.validator.ts"
Cohesion: 0.12
Nodes (16): POST, GET, POST, listOrders(), CancelOrderInput, CompleteOrderInput, completeOrderSchema, CreateOrderInput (+8 more)

### Community 2 - "order-detail-view.tsx"
Cohesion: 0.10
Nodes (19): PageProps, DetailResponse, FifoAllocation, MutationResponse, RecipeDetail, RecipeItem, canCancel(), DetailError() (+11 more)

### Community 3 - "order-list-page.tsx"
Cohesion: 0.05
Nodes (49): Item, ListResponse, MutationResponse, StatusFilter, StockFilter, Unit, ListResponse, MutationResponse (+41 more)

### Community 4 - "doku-checkout.service.ts"
Cohesion: 0.11
Nodes (22): checkDOKUPaymentStatus(), createDOKUCheckout(), DOKUCheckoutRequest, DOKUCheckoutResult, DOKUConfig, generateSignature(), generateUUID(), getDOKUConfig() (+14 more)

### Community 5 - "recipe-form.tsx"
Cohesion: 0.10
Nodes (20): EditRecipePage(), PageProps, NewRecipePage(), PageProps, emptyRow(), FifoAllocation, formatNumber(), formatRupiah() (+12 more)

### Community 6 - "barista-movements-page.tsx"
Cohesion: 0.17
Nodes (8): BaristaMovementsPage(), formatDateTime(), formatNumber(), ListResponse, Movement, MovementType, typeBadge(), TypeFilter

### Community 7 - "product.service.ts"
Cohesion: 0.13
Nodes (19): DELETE, GET, PATCH, GET, POST, createInventoryItem(), createProduct(), deactivateProduct() (+11 more)

### Community 8 - "prisma"
Cohesion: 0.12
Nodes (17): handler, POST, previewSchema, authOptions, SessionUser, adapter, prisma, adminAuth (+9 more)

### Community 9 - ".notFound"
Cohesion: 0.08
Nodes (44): GET, PATCH, POST, PATCH, DELETE, GET, PATCH, GET (+36 more)

### Community 10 - "batches-tab.tsx"
Cohesion: 0.33
Nodes (8): BatchesTab(), BatchRow, fmtDateTime(), fmtNum(), fmtRupiah(), ReportData, statusBadge(), TabProps

### Community 11 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, babel-plugin-react-compiler, dotenv, playwright, prisma, @prisma/cli-engine, tailwindcss, @tailwindcss/postcss (+9 more)

### Community 12 - "recipe.service.ts"
Cohesion: 0.11
Nodes (30): DELETE, GET, PUT, GET, POST, computeFifoForRequests(), getTotalStockMap(), buildProductionPreview() (+22 more)

### Community 13 - "production.service.ts"
Cohesion: 0.13
Nodes (19): GET, POST, GET, POST, createProduction(), generateFinishedBatchCode(), getProductionById(), getProductionOptions() (+11 more)

### Community 14 - "barista-stock.service.ts"
Cohesion: 0.12
Nodes (20): POST, GET, POST, POST, GET, created(), getAvailableProducts(), listBaristaStocks() (+12 more)

### Community 15 - "compilerOptions"
Cohesion: 0.10
Nodes (20): node, prisma, compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, incremental, isolatedModules (+12 more)

### Community 16 - "order-report-page.tsx"
Cohesion: 0.11
Nodes (27): ExportMeta, exportOrderReport(), fmtDateTime(), fmt(), getPreset(), Option, OrderReportFilter(), OrderReportFilterValue (+19 more)

### Community 17 - "sidebar.tsx"
Cohesion: 0.09
Nodes (14): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle(), SidebarContext, SidebarContextProps, SidebarMenuSkeleton() (+6 more)

### Community 18 - "buttonVariants"
Cohesion: 0.10
Nodes (20): NewProductPage(), DetailError(), DetailError(), BatchEmptyState(), DetailError(), BatchEmptyState(), ItemEmptyState(), DetailError() (+12 more)

### Community 19 - "ApiError"
Cohesion: 0.09
Nodes (25): DELETE, PATCH, GET, POST, ApiError, publicUrlFor(), r2, R2_BUCKET (+17 more)

### Community 20 - "setting.service.ts"
Cohesion: 0.13
Nodes (18): GET, DELETE, GET, PATCH, GET, POST, createSetting(), deleteSetting() (+10 more)

### Community 21 - "(dashboard)/page.tsx"
Cohesion: 0.12
Nodes (18): DashboardPage(), DashboardStats, formatCompactRupiah(), formatDateShort(), formatRelativeTime(), formatRupiah(), StatsResponse, ChartConfig (+10 more)

### Community 22 - "react"
Cohesion: 0.18
Nodes (11): react, AdminForm(), normalizePhone(), ActiveOrder, AutoFitBounds(), getOrderIcon(), OrdersLiveMap(), OrdersLiveMapProps (+3 more)

### Community 23 - "api-response.ts"
Cohesion: 0.09
Nodes (33): GET, GET, GET, PATCH, PATCH, POST, GET, GET (+25 more)

### Community 24 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 25 - "restock.service.ts"
Cohesion: 0.16
Nodes (17): DELETE, GET, GET, POST, createRestock(), generateBatchCode(), getRestockById(), listRestocks() (+9 more)

### Community 26 - "package.json"
Cohesion: 0.04
Nodes (46): description, name, private, type, version, @anthropic-ai/claude-code, @aws-sdk/client-s3, babel-plugin-react-compiler (+38 more)

### Community 27 - "finished-product.service.ts"
Cohesion: 0.21
Nodes (12): DELETE, GET, PATCH, GET, getFinishedBatchById(), listFinishedBatches(), ListFinishedBatchQuery, listFinishedBatchQuerySchema (+4 more)

### Community 28 - "product-detail-view.tsx"
Cohesion: 0.16
Nodes (13): CostHistory, DetailResponse, formatBytes(), formatDateTime(), formatNumber(), formatRupiah(), ImageItem, marginTextClass() (+5 more)

### Community 29 - "stock-page.tsx"
Cohesion: 0.15
Nodes (12): finishedStatusBadge(), FinishedStatusFilter, FinishedStockItem, formatNumber(), formatRupiah(), materialStatusBadge(), MaterialStatusFilter, MaterialStockItem (+4 more)

### Community 30 - "stock.service.ts"
Cohesion: 0.20
Nodes (10): GET, FinishedStockItem, getStockSummary(), MaterialStockItem, MaterialStockStatus, StockSummary, LowStockQuery, lowStockQuerySchema (+2 more)

### Community 31 - "user-form.tsx"
Cohesion: 0.14
Nodes (13): DetailResponse, EditAdminPage(), NewAdminPage(), DetailResponse, EditUserPage(), NewUserPage(), isoToDateInput(), normalizePhone() (+5 more)

### Community 32 - "app-sidebar.tsx"
Cohesion: 0.14
Nodes (15): administration, dashboard, inventoryFlow, orders, reports, system, teams, NavProjects() (+7 more)

### Community 33 - "nav-main.tsx"
Cohesion: 0.16
Nodes (14): hasActiveChild(), NavItem, NavItemRenderer(), NavMain(), NavMainProps, SidebarGroup(), SidebarGroupLabel(), SidebarMenuAction() (+6 more)

### Community 34 - "use-tracking-broadcast.ts"
Cohesion: 0.18
Nodes (16): GeoPosition, NavigatorWithBattery, useBattery(), useDeviceInfo(), useGeolocation(), UseGeolocationOptions, UseGeolocationReturn, useTrackingBroadcast() (+8 more)

### Community 35 - "item-detail-view.tsx"
Cohesion: 0.17
Nodes (11): Batch, DetailError(), DetailResponse, formatDateTime(), formatNumber(), formatRupiah(), ItemDetail, ItemDetailView() (+3 more)

### Community 36 - "inventory-batch.service.ts"
Cohesion: 0.26
Nodes (9): GET, PATCH, GET, getInventoryBatchById(), listInventoryBatches(), ListInventoryBatchQuery, listInventoryBatchQuerySchema, UpdateInventoryBatchInput (+1 more)

### Community 37 - "finished-product-list-page.tsx"
Cohesion: 0.20
Nodes (9): FinishedBatch, FinishedBatchListPage(), formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), ListResponse, MutationResponse (+1 more)

### Community 38 - "dropdown-menu.tsx"
Cohesion: 0.19
Nodes (5): DropdownMenuGroup(), DropdownMenuLabel(), DropdownMenuSeparator(), DropdownMenuShortcut(), SidebarMenu()

### Community 39 - "login-form.tsx"
Cohesion: 0.15
Nodes (7): Feedback, LoginForm(), Field(), FieldDescription(), FieldGroup(), FieldLabel(), fieldVariants

### Community 40 - "firebase.ts"
Cohesion: 0.40
Nodes (4): UseFirebaseLoginReturn, auth, firebaseConfig, rtdb

### Community 41 - "ProductionDetailView"
Cohesion: 0.29
Nodes (5): formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), ProductionDetailView()

### Community 43 - "CLAUDE.md"
Cohesion: 0.07
Nodes (27): API Routes Pattern, Architecture, [ATURAN KETAT / NO OVER-ENGINEERING], Business Logic, Data Flow, Data Source Separation, .env.local, Explore database (list tables, sample data) (+19 more)

### Community 44 - "dashboard.service.ts"
Cohesion: 0.30
Nodes (9): GET, DashboardStats, formatDateOnly(), getDashboardStats(), startOfDay(), startOfDaysAgo(), startOfMonth(), DashboardStatsQuery (+1 more)

### Community 45 - "products/[id]/edit/page.tsx"
Cohesion: 0.22
Nodes (8): DetailResponse, EditProductPage(), formatBytes(), formatDigits(), formatRupiah(), ProductForm(), ProductFormData, stripNonDigits()

### Community 46 - "setting-list-page.tsx"
Cohesion: 0.18
Nodes (6): ListResponse, MutationResponse, Setting, SettingType, StatusFilter, TypeFilter

### Community 47 - "inventory/cost-history/route.ts"
Cohesion: 0.31
Nodes (6): GET, GET, getCostHistorySummary(), listCostHistories(), ListCostHistoryQuery, listCostHistoryQuerySchema

### Community 48 - "nav-user.tsx"
Cohesion: 0.29
Nodes (5): getInitials(), NavUser(), Avatar(), AvatarFallback(), AvatarImage()

### Community 49 - "master-products-tab.tsx"
Cohesion: 0.31
Nodes (9): fmtDateTime(), fmtNum(), fmtPct(), fmtRupiah(), marginClass(), MasterProductsTab(), MasterRow, ReportData (+1 more)

### Community 52 - "dependencies"
Cohesion: 0.06
Nodes (34): dependencies, @anthropic-ai/claude-code, @aws-sdk/client-s3, @base-ui/react, class-variance-authority, cmdk, cn, date-fns (+26 more)

### Community 53 - "(dashboard)/layout.tsx"
Cohesion: 0.24
Nodes (6): AppSidebar(), ModeToggle(), NotificationButton(), Separator(), SidebarInset(), SidebarTrigger()

### Community 54 - "Card"
Cohesion: 0.08
Nodes (28): nextConfig, lucide-react, next, react, calculateDistance(), CartData, CartItem, Charge (+20 more)

### Community 55 - "app/layout.tsx"
Cohesion: 0.28
Nodes (5): geistMono, geistSans, metadata, AppSessionProvider(), ThemeProvider()

### Community 58 - "index.ts"
Cohesion: 0.11
Nodes (14): zod, calculateFee(), calculateTotalWithFee(), FeeBreakdown, FeeCalculation, formatCurrency(), getMethodFee(), CreatePaymentInput (+6 more)

### Community 59 - "UserDetailView"
Cohesion: 0.25
Nodes (4): formatDate(), formatDateTime(), getInitials(), UserDetailView()

### Community 60 - "items/[id]/edit/page.tsx"
Cohesion: 0.25
Nodes (5): DetailResponse, EditItemPage(), NewItemPage(), ItemForm(), ItemFormData

### Community 61 - "RecipeDetailView"
Cohesion: 0.25
Nodes (6): formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), ItemRow(), RecipeDetailView()

### Community 62 - "inventory-item.service.ts"
Cohesion: 0.17
Nodes (17): DELETE, GET, PATCH, GET, POST, deactivateInventoryItem(), getInventoryItemById(), getStockMap() (+9 more)

### Community 63 - "ewallet.ts"
Cohesion: 0.18
Nodes (8): createEWalletAdapter(), DokuEWalletAdapter, EWALLET_CHANNEL_CODES, EWalletChannel, DokuQRISAdapter, PaymentNotification, PaymentProviderAdapter, PaymentStatus

### Community 64 - "profile-edit-form.tsx"
Cohesion: 0.22
Nodes (9): ACCEPTED_TYPES, formatDateTime(), getInitials(), isoToDateInput(), normalizePhone(), ProfileData, ProfileEditForm(), Snapshot (+1 more)

### Community 65 - "report-export.ts"
Cohesion: 0.36
Nodes (7): buildSheet(), BuildSheetArgs, ColumnDef, exportProductsReportExcel(), fetchReport(), fmtDateTime(), ReportFilterParams

### Community 66 - "card.tsx"
Cohesion: 0.09
Nodes (21): DetailResponse, ProductionComponent, ProductionDetail, ListResponse, Production, CostHistoryTab(), CostRow, fmtDateTime() (+13 more)

### Community 67 - "tracking-map.tsx"
Cohesion: 0.29
Nodes (7): AutoFitBounds(), getMarkerIcon(), MarkerVariant, TrackingMap(), TrackingMapProps, TrackingMapStyles(), EnrichedLocation

### Community 70 - "UserListPage"
Cohesion: 0.29
Nodes (3): formatDate(), getInitials(), UserListPage()

### Community 71 - "BaristaStockDetailView"
Cohesion: 0.29
Nodes (5): PageProps, BaristaStockDetailView(), formatDateTime(), formatNumber(), formatRupiah()

### Community 72 - "cost-history-page.tsx"
Cohesion: 0.17
Nodes (11): CostEntry, CostHistoryEmptyState(), CostHistoryPage(), formatDateTime(), formatNumber(), formatRupiah(), ListResponse, marginTextClass() (+3 more)

### Community 73 - "finished-product-detail-view.tsx"
Cohesion: 0.22
Nodes (9): DetailResponse, FinishedBatchDetail, FinishedBatchDetailView(), formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), MutationResponse (+1 more)

### Community 74 - "ProductListPage"
Cohesion: 0.29
Nodes (5): formatNumber(), formatRupiah(), marginBadgeClass(), ProductListPage(), truncate()

### Community 75 - "RecipeListPage"
Cohesion: 0.29
Nodes (5): formatDateTime(), formatNumber(), formatRupiah(), marginColorClass(), RecipeListPage()

### Community 77 - "Badge"
Cohesion: 0.14
Nodes (15): BatchDetail, DetailResponse, MutationResponse, ProductionComponent, RestockInfo, SourceType, categoryBadge(), fmtRupiah() (+7 more)

### Community 78 - "BatchDetailView"
Cohesion: 0.33
Nodes (4): BatchDetailView(), formatDateTime(), formatNumber(), formatRupiah()

### Community 79 - "batch-list-page.tsx"
Cohesion: 0.23
Nodes (7): Batch, BatchListPage(), formatDateTime(), formatNumber(), formatRupiah(), ListResponse, MutationResponse

### Community 80 - "ProductionListPage"
Cohesion: 0.33
Nodes (4): formatDateTime(), formatNumber(), formatRupiah(), ProductionListPage()

### Community 81 - "RestockDetailView"
Cohesion: 0.33
Nodes (4): formatDateTime(), formatNumber(), formatRupiah(), RestockDetailView()

### Community 82 - "RestockListPage"
Cohesion: 0.33
Nodes (4): formatDateTime(), formatNumber(), formatRupiah(), RestockListPage()

### Community 83 - "production-form.tsx"
Cohesion: 0.19
Nodes (12): NewProductionPage(), FifoAllocation, formatNumber(), formatRupiah(), formatUnitCost(), MutationResponse, parseNumber(), PreviewItem (+4 more)

### Community 84 - "restock-form.tsx"
Cohesion: 0.23
Nodes (11): NewRestockPage(), BulkResponse, emptyRow(), formatDigits(), formatRupiahDisplay(), InventoryItem, ItemsResponse, parseNumber() (+3 more)

### Community 85 - "poi-layer.tsx"
Cohesion: 0.33
Nodes (5): AMENITY_LIST, POI_ICONS, POILayer(), POILayerProps, SHOP_LIST

### Community 86 - "next-auth.d.ts"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 87 - "barista-stock-page.tsx"
Cohesion: 0.19
Nodes (7): BaristaStockItem, BaristaStockPage(), BaristaStockProduct, formatNumber(), formatRupiah(), ListResponse, StockEmptyState()

### Community 88 - "utils.ts"
Cohesion: 0.13
Nodes (12): RestockBaristaPage(), AvailableProduct, Barista, BaristaListResponse, BaristaRestockForm(), emptyRow(), formatNumber(), MutationResponse (+4 more)

### Community 91 - "command.tsx"
Cohesion: 0.16
Nodes (10): Command(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), Popover(), PopoverContent() (+2 more)

### Community 94 - "payment.service.ts"
Cohesion: 0.14
Nodes (7): convertToPayment(), createPayment(), CreatePaymentInput, MIDTRANS_METHOD_NAME_MAP, Payment, PaymentStatus, updatePaymentFromDOKUResponse()

### Community 95 - "va.ts"
Cohesion: 0.22
Nodes (8): createVAAdapter(), DokuVAAdapter, DOKUVARequest, VA_CHANNEL_CODES, VAChannel, VACreateRequest, CreatePaymentRequest, CreatePaymentResponse

### Community 96 - "tracking/page.tsx"
Cohesion: 0.26
Nodes (10): RoleFilter, timeAgo(), TrackingMap, TrackingMapStyles, TrackingPage(), useLiveLocations(), UseLiveLocationsReturn, useFirebaseLogin() (+2 more)

### Community 97 - "input-group.tsx"
Cohesion: 0.24
Nodes (6): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, Textarea()

### Community 98 - "leaflet-location-picker.tsx"
Cohesion: 0.29
Nodes (9): leaflet, react-leaflet, DraggableMarker(), getKitchenIcon(), getLocationIcon(), LeafletLocationPicker(), LeafletLocationPickerProps, MapClickHandler() (+1 more)

### Community 99 - "include"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, tsx, exclude (+1 more)

### Community 100 - "src_lib_db"
Cohesion: 0.22
Nodes (5): METHODS, DokuConfig, DokuRequestOptions, DokuResponse, getDokuClient()

### Community 101 - "order.assignment.service.ts"
Cohesion: 0.27
Nodes (9): BaristaCandidate, BaristaLocation, BroadcastOrderInput, broadcastOrderToBaristas(), FindBaristasInput, findNearestBaristasWithStock(), getActiveBaristasFromFirebase(), haversine() (+1 more)

### Community 102 - "reject/route.ts"
Cohesion: 0.22
Nodes (6): POST, POST, rejectOrder(), updateOrderStatus(), rejectOrderSchema, updateOrderStatusSchema

### Community 103 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, postinstall, seed:admin, start, test, test:watch

### Community 104 - "order.charge.service.ts"
Cohesion: 0.25
Nodes (3): ComputedCharge, ComputedCharges, ComputedPaymentFee

### Community 105 - "cancel/route.ts"
Cohesion: 0.29
Nodes (7): POST, removeOrderFromAllPools(), updateOrderTrackingFirebase(), acceptOrder(), cancelOrder(), completeOrder(), cancelOrderSchema

### Community 106 - "order.service.ts"
Cohesion: 0.43
Nodes (6): computeCharges(), generateOrderNumber(), createOrder(), getOrderById(), previewOrder(), validateAndComputeItems()

### Community 107 - "⚠️ DEPRECATED - DOKU SNAP API Adapters"
Cohesion: 0.29
Nodes (6): Current Architecture, Current Payment Flow, ⚠️ DEPRECATED - DOKU SNAP API Adapters, Files in This Folder, To Remove, Why Not Removed?

### Community 108 - "registry.ts"
Cohesion: 0.53
Nodes (5): CachedProvider, clearExpiredCache(), getActivePaymentMethods(), getCached(), setCache()

### Community 109 - "seed-kopi.ts"
Cohesion: 0.50
Nodes (4): dotenv, generateBatchCode(), INVENTORY_ITEMS, main()

### Community 110 - "lib"
Cohesion: 0.50
Nodes (4): dom, dom.iterable, esnext, lib

## Knowledge Gaps
- **578 isolated node(s):** `STRICT BOUNDARY:`, `Teknologi Stack`, `WebAdmin Navigation (Simplified)`, `WebAdmin Commands`, `Data Source Separation` (+573 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 827 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `prisma` to `product.service.ts`, `.notFound`, `recipe.service.ts`, `production.service.ts`, `barista-stock.service.ts`, `order-report-page.tsx`, `ApiError`, `setting.service.ts`, `api-response.ts`, `restock.service.ts`, `finished-product.service.ts`, `stock.service.ts`, `inventory-batch.service.ts`, `dashboard.service.ts`, `inventory/cost-history/route.ts`, `index.ts`, `inventory-item.service.ts`, `payment.service.ts`, `src_lib_db`, `order.assignment.service.ts`, `order.charge.service.ts`, `order.service.ts`, `seed-kopi.ts`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `Button()` connect `button.tsx` to `order-detail-view.tsx`, `order-list-page.tsx`, `recipe-form.tsx`, `barista-movements-page.tsx`, `batches-tab.tsx`, `order-report-page.tsx`, `sidebar.tsx`, `buttonVariants`, `(dashboard)/page.tsx`, `product-detail-view.tsx`, `stock-page.tsx`, `user-form.tsx`, `item-detail-view.tsx`, `finished-product-list-page.tsx`, `login-form.tsx`, `toast.tsx`, `products/[id]/edit/page.tsx`, `setting-list-page.tsx`, `master-products-tab.tsx`, `(dashboard)/layout.tsx`, `Card`, `pagination.tsx`, `items/[id]/edit/page.tsx`, `profile-edit-form.tsx`, `card.tsx`, `cost-history-page.tsx`, `finished-product-detail-view.tsx`, `Badge`, `batch-list-page.tsx`, `production-form.tsx`, `restock-form.tsx`, `barista-stock-page.tsx`, `utils.ts`, `tracking/page.tsx`, `input-group.tsx`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `button.tsx`, `recipe-form.tsx`, `barista-movements-page.tsx`, `order-report-page.tsx`, `sidebar.tsx`, `buttonVariants`, `(dashboard)/page.tsx`, `product-detail-view.tsx`, `stock-page.tsx`, `user-form.tsx`, `app-sidebar.tsx`, `nav-main.tsx`, `use-tracking-broadcast.ts`, `item-detail-view.tsx`, `finished-product-list-page.tsx`, `login-form.tsx`, `ProductionDetailView`, `products/[id]/edit/page.tsx`, `dependencies`, `(dashboard)/layout.tsx`, `UserDetailView`, `items/[id]/edit/page.tsx`, `RecipeDetailView`, `profile-edit-form.tsx`, `tracking-map.tsx`, `UserListPage`, `BaristaStockDetailView`, `cost-history-page.tsx`, `finished-product-detail-view.tsx`, `ProductListPage`, `RecipeListPage`, `SettingListPage`, `BatchDetailView`, `batch-list-page.tsx`, `ProductionListPage`, `RestockDetailView`, `RestockListPage`, `production-form.tsx`, `restock-form.tsx`, `poi-layer.tsx`, `barista-stock-page.tsx`, `utils.ts`, `ItemListPage`, `tracking/page.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `STRICT BOUNDARY:`, `Teknologi Stack`, `WebAdmin Navigation (Simplified)` to the rest of the system?**
  _578 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `button.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06568832983927324 - nodes in this community are weakly interconnected._
- **Should `order.validator.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `order-detail-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._