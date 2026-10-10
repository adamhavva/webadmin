# Graph Report - webadmin  (2026-10-11)

## Corpus Check
- 336 files · ~193,112 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .toml 2, .example 1)

## Summary
- 1837 nodes · 4030 edges · 101 communities (81 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a245d0a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- user-list-page.tsx
- .notFound
- recipe-list-page.tsx
- order-list-page.tsx
- doku-checkout.service.ts
- recipe-form.tsx
- barista-movements-page.tsx
- inventory-item.service.ts
- chart.tsx
- .unprocessable
- batches-tab.tsx
- devDependencies
- recipe.service.ts
- prisma
- handleAuth
- compilerOptions
- order-report-page.tsx
- sidebar.tsx
- ReportPage
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
- buttonVariants
- app-sidebar.tsx
- nav-main.tsx
- use-tracking-broadcast.ts
- product-form.tsx
- inventory-batch.service.ts
- FinishedBatchListPage
- dropdown-menu.tsx
- field.tsx
- firebase.ts
- ProductionDetailView
- toast.tsx
- CLAUDE.md
- dashboard.service.ts
- inventory/cost-history/route.ts
- nav-user.tsx
- master-products-tab.tsx
- navigation-menu.tsx
- dependencies
- (dashboard)/layout.tsx
- card.tsx
- app/layout.tsx
- pagination.tsx
- payment.service.ts
- UserDetailView
- RecipeDetailView
- ProfileEditForm
- report-export.ts
- report-page.tsx
- empty.tsx
- UserListPage
- BaristaStockDetailView
- cost-history-page.tsx
- finished-product-detail-view.tsx
- ProductListPage
- RecipeListPage
- SettingListPage
- batch-detail-view.tsx
- BatchListPage
- production-list-page.tsx
- restock-detail-view.tsx
- restock-list-page.tsx
- production-form.tsx
- restock-form.tsx
- poi-layer.tsx
- next-auth.d.ts
- BaristaStockPage
- barista-restock-form.tsx
- ItemListPage
- command.tsx
- proxy.ts
- DokuClient
- use-live-locations.ts
- input-group.tsx
- leaflet-location-picker.tsx
- scripts
- ⚠️ DEPRECATED - DOKU SNAP API Adapters
- seed-kopi.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `buttonVariants` - 96 edges
2. `react` - 69 edges
3. `Button()` - 68 edges
4. `handleAuth()` - 59 edges
5. `ok()` - 59 edges
6. `Card()` - 49 edges
7. `CardContent()` - 49 edges
8. `CardHeader()` - 48 edges
9. `CardTitle()` - 48 edges
10. `Badge()` - 46 edges

## Surprising Connections (you probably didn't know these)
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/calendar.tsx → package.json
- `POILayer()` --references--> `react`  [EXTRACTED]
  src/components/tracking/poi-layer.tsx → package.json
- `ReportFilter()` --references--> `react`  [EXTRACTED]
  src/components/reports/report-filter.tsx → package.json
- `OrderReportFilter()` --references--> `react`  [EXTRACTED]
  src/components/reports/orders/order-report-filter.tsx → package.json
- `OrderReportPage()` --references--> `react`  [EXTRACTED]
  src/components/reports/orders/order-report-page.tsx → package.json

## Import Cycles
- None detected.

## Communities (101 total, 20 thin omitted)

### Community 0 - "user-list-page.tsx"
Cohesion: 0.07
Nodes (26): RoleFilter, TrackingMap, TrackingMapStyles, ACCEPTED_TYPES, ProfileData, Snapshot, Option, PresetKey (+18 more)

### Community 1 - ".notFound"
Cohesion: 0.06
Nodes (42): POST, POST, POST, POST, GET, POST, GET, POST (+34 more)

### Community 2 - "recipe-list-page.tsx"
Cohesion: 0.05
Nodes (46): PageProps, BaristaStockDetail, BaristaStockProduct, DetailError(), DetailResponse, MutationResponse, ListResponse, MutationResponse (+38 more)

### Community 3 - "order-list-page.tsx"
Cohesion: 0.06
Nodes (38): Batch, BatchEmptyState(), ListResponse, MutationResponse, BatchEmptyState(), FinishedBatch, ListResponse, MutationResponse (+30 more)

### Community 4 - "doku-checkout.service.ts"
Cohesion: 0.11
Nodes (22): checkDOKUPaymentStatus(), createDOKUCheckout(), DOKUCheckoutRequest, DOKUCheckoutResult, DOKUConfig, generateSignature(), generateUUID(), getDOKUConfig() (+14 more)

### Community 5 - "recipe-form.tsx"
Cohesion: 0.10
Nodes (20): EditRecipePage(), PageProps, NewRecipePage(), PageProps, emptyRow(), FifoAllocation, formatNumber(), formatRupiah() (+12 more)

### Community 6 - "barista-movements-page.tsx"
Cohesion: 0.17
Nodes (8): BaristaMovementsPage(), formatDateTime(), formatNumber(), ListResponse, Movement, MovementType, typeBadge(), TypeFilter

### Community 7 - "inventory-item.service.ts"
Cohesion: 0.08
Nodes (36): DELETE, GET, PATCH, GET, POST, DELETE, GET, PATCH (+28 more)

### Community 8 - "chart.tsx"
Cohesion: 0.23
Nodes (10): ChartConfig, ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION, THEMES (+2 more)

### Community 9 - ".unprocessable"
Cohesion: 0.09
Nodes (35): GET, PATCH, POST, PATCH, DELETE, GET, PATCH, GET (+27 more)

### Community 10 - "batches-tab.tsx"
Cohesion: 0.33
Nodes (8): BatchesTab(), BatchRow, fmtDateTime(), fmtNum(), fmtRupiah(), ReportData, statusBadge(), TabProps

### Community 11 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, babel-plugin-react-compiler, dotenv, playwright, prisma, @prisma/cli-engine, tailwindcss, @tailwindcss/postcss (+9 more)

### Community 12 - "recipe.service.ts"
Cohesion: 0.10
Nodes (30): PATCH, PATCH, DELETE, GET, PUT, GET, POST, activateRecipe() (+22 more)

### Community 13 - "prisma"
Cohesion: 0.08
Nodes (33): METHODS, GET, POST, GET, POST, POST, previewSchema, adapter (+25 more)

### Community 14 - "handleAuth"
Cohesion: 0.10
Nodes (27): POST, GET, GET, GET, POST, POST, GET, handleAuth() (+19 more)

### Community 15 - "compilerOptions"
Cohesion: 0.06
Nodes (33): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node (+25 more)

### Community 16 - "order-report-page.tsx"
Cohesion: 0.11
Nodes (25): GET, ExportMeta, exportOrderReport(), fmtDateTime(), fmt(), getPreset(), OrderReportFilter(), OrderReportFilterValue (+17 more)

### Community 17 - "sidebar.tsx"
Cohesion: 0.10
Nodes (13): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle(), SidebarContext, SidebarContextProps, SidebarProvider() (+5 more)

### Community 19 - "ApiError"
Cohesion: 0.10
Nodes (25): DELETE, PATCH, GET, POST, ApiError, publicUrlFor(), r2, R2_BUCKET (+17 more)

### Community 20 - "setting.service.ts"
Cohesion: 0.13
Nodes (18): GET, DELETE, GET, PATCH, GET, POST, createSetting(), deleteSetting() (+10 more)

### Community 21 - "(dashboard)/page.tsx"
Cohesion: 0.23
Nodes (8): DashboardPage(), DashboardStats, formatCompactRupiah(), formatDateShort(), formatRelativeTime(), formatRupiah(), StatsResponse, ChartContainer()

### Community 22 - "react"
Cohesion: 0.12
Nodes (17): react, AdminForm(), normalizePhone(), LoginForm(), ActiveOrder, AutoFitBounds(), getOrderIcon(), OrdersLiveMap() (+9 more)

### Community 23 - "api-response.ts"
Cohesion: 0.10
Nodes (29): GET, GET, GET, POST, GET, GET, GET, GET (+21 more)

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
Cohesion: 0.19
Nodes (14): DELETE, GET, PATCH, GET, getFinishedBatchById(), listFinishedBatches(), updateFinishedBatch(), voidFinishedBatch() (+6 more)

### Community 28 - "product-detail-view.tsx"
Cohesion: 0.15
Nodes (14): CostHistory, DetailError(), DetailResponse, formatBytes(), formatDateTime(), formatNumber(), formatRupiah(), ImageItem (+6 more)

### Community 29 - "stock-page.tsx"
Cohesion: 0.15
Nodes (12): finishedStatusBadge(), FinishedStatusFilter, FinishedStockItem, formatNumber(), formatRupiah(), materialStatusBadge(), MaterialStatusFilter, MaterialStockItem (+4 more)

### Community 30 - "stock.service.ts"
Cohesion: 0.20
Nodes (10): GET, FinishedStockItem, getStockSummary(), MaterialStockItem, MaterialStockStatus, StockSummary, LowStockQuery, lowStockQuerySchema (+2 more)

### Community 31 - "buttonVariants"
Cohesion: 0.07
Nodes (30): DetailResponse, EditAdminPage(), NewAdminPage(), RestockBaristaPage(), DetailResponse, EditItemPage(), NewItemPage(), DetailResponse (+22 more)

### Community 32 - "app-sidebar.tsx"
Cohesion: 0.14
Nodes (15): administration, dashboard, inventoryFlow, orders, reports, system, teams, NavProjects() (+7 more)

### Community 33 - "nav-main.tsx"
Cohesion: 0.16
Nodes (14): hasActiveChild(), NavItem, NavItemRenderer(), NavMain(), NavMainProps, SidebarGroup(), SidebarGroupLabel(), SidebarMenuAction() (+6 more)

### Community 34 - "use-tracking-broadcast.ts"
Cohesion: 0.20
Nodes (15): GeoPosition, NavigatorWithBattery, useBattery(), useDeviceInfo(), useGeolocation(), UseGeolocationOptions, UseGeolocationReturn, useTrackingBroadcast() (+7 more)

### Community 35 - "product-form.tsx"
Cohesion: 0.08
Nodes (26): DetailResponse, EditProductPage(), NewProductPage(), Batch, DetailError(), DetailResponse, formatDateTime(), formatNumber() (+18 more)

### Community 36 - "inventory-batch.service.ts"
Cohesion: 0.24
Nodes (10): GET, PATCH, GET, getInventoryBatchById(), listInventoryBatches(), updateInventoryBatch(), ListInventoryBatchQuery, listInventoryBatchQuerySchema (+2 more)

### Community 37 - "FinishedBatchListPage"
Cohesion: 0.29
Nodes (5): FinishedBatchListPage(), formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost()

### Community 38 - "dropdown-menu.tsx"
Cohesion: 0.19
Nodes (5): DropdownMenuGroup(), DropdownMenuLabel(), DropdownMenuSeparator(), DropdownMenuShortcut(), SidebarMenu()

### Community 39 - "field.tsx"
Cohesion: 0.16
Nodes (6): Field(), FieldDescription(), FieldGroup(), FieldLabel(), fieldVariants, Separator()

### Community 40 - "firebase.ts"
Cohesion: 0.25
Nodes (7): timeAgo(), TrackingPage(), useFirebaseLogin(), UseFirebaseLoginReturn, auth, firebaseConfig, rtdb

### Community 41 - "ProductionDetailView"
Cohesion: 0.29
Nodes (5): formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), ProductionDetailView()

### Community 43 - "CLAUDE.md"
Cohesion: 0.07
Nodes (27): API Routes Pattern, Architecture, [ATURAN KETAT / NO OVER-ENGINEERING], Business Logic, Data Flow, Data Source Separation, .env.local, Explore database (list tables, sample data) (+19 more)

### Community 44 - "dashboard.service.ts"
Cohesion: 0.30
Nodes (9): GET, DashboardStats, formatDateOnly(), getDashboardStats(), startOfDay(), startOfDaysAgo(), startOfMonth(), DashboardStatsQuery (+1 more)

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
Cohesion: 0.28
Nodes (5): AppSidebar(), ModeToggle(), NotificationButton(), SidebarInset(), SidebarTrigger()

### Community 54 - "card.tsx"
Cohesion: 0.07
Nodes (36): nextConfig, lucide-react, next, calculateDistance(), CartData, CartItem, Charge, CheckoutPage() (+28 more)

### Community 55 - "app/layout.tsx"
Cohesion: 0.28
Nodes (5): geistMono, geistSans, metadata, AppSessionProvider(), ThemeProvider()

### Community 58 - "payment.service.ts"
Cohesion: 0.05
Nodes (53): zod, handler, logWebhook(), POST, verifyMidtransSignature(), authOptions, SessionUser, adminAuth (+45 more)

### Community 59 - "UserDetailView"
Cohesion: 0.25
Nodes (4): formatDate(), formatDateTime(), getInitials(), UserDetailView()

### Community 61 - "RecipeDetailView"
Cohesion: 0.25
Nodes (6): formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), ItemRow(), RecipeDetailView()

### Community 64 - "ProfileEditForm"
Cohesion: 0.29
Nodes (6): formatDateTime(), getInitials(), isoToDateInput(), normalizePhone(), ProfileEditForm(), snapshotFrom()

### Community 65 - "report-export.ts"
Cohesion: 0.36
Nodes (7): buildSheet(), BuildSheetArgs, ColumnDef, exportProductsReportExcel(), fetchReport(), fmtDateTime(), ReportFilterParams

### Community 66 - "report-page.tsx"
Cohesion: 0.08
Nodes (31): formatDateInput(), formatFilterLabels(), getPresetRange(), PresetKey, ProductOption, ReportFilter(), ReportFilterProps, ReportFilterValue (+23 more)

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
Cohesion: 0.20
Nodes (10): DetailError(), DetailResponse, FinishedBatchDetail, FinishedBatchDetailView(), formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost() (+2 more)

### Community 74 - "ProductListPage"
Cohesion: 0.29
Nodes (5): formatNumber(), formatRupiah(), marginBadgeClass(), ProductListPage(), truncate()

### Community 75 - "RecipeListPage"
Cohesion: 0.29
Nodes (5): formatDateTime(), formatNumber(), formatRupiah(), marginColorClass(), RecipeListPage()

### Community 77 - "batch-detail-view.tsx"
Cohesion: 0.17
Nodes (11): BatchDetail, BatchDetailView(), DetailError(), DetailResponse, formatDateTime(), formatNumber(), formatRupiah(), MutationResponse (+3 more)

### Community 79 - "BatchListPage"
Cohesion: 0.33
Nodes (4): BatchListPage(), formatDateTime(), formatNumber(), formatRupiah()

### Community 80 - "production-list-page.tsx"
Cohesion: 0.23
Nodes (7): formatDateTime(), formatNumber(), formatRupiah(), ListResponse, Production, ProductionEmptyState(), ProductionListPage()

### Community 81 - "restock-detail-view.tsx"
Cohesion: 0.21
Nodes (9): DetailError(), DetailResponse, formatDateTime(), formatNumber(), formatRupiah(), MutationResponse, RestockDetail, RestockDetailView() (+1 more)

### Community 82 - "restock-list-page.tsx"
Cohesion: 0.19
Nodes (9): formatDateTime(), formatNumber(), formatRupiah(), ListResponse, MutationResponse, Restock, RestockEmptyState(), RestockListPage() (+1 more)

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

### Community 87 - "BaristaStockPage"
Cohesion: 0.40
Nodes (3): BaristaStockPage(), formatNumber(), formatRupiah()

### Community 88 - "barista-restock-form.tsx"
Cohesion: 0.21
Nodes (11): AvailableProduct, Barista, BaristaListResponse, BaristaRestockForm(), emptyRow(), formatNumber(), MutationResponse, parseNumber() (+3 more)

### Community 91 - "command.tsx"
Cohesion: 0.16
Nodes (10): Command(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), Popover(), PopoverContent() (+2 more)

### Community 93 - "DokuClient"
Cohesion: 0.07
Nodes (17): DokuClient, DokuConfig, DokuRequestOptions, DokuResponse, getDokuClient(), isSuccessCode(), createEWalletAdapter(), DokuEWalletAdapter (+9 more)

### Community 96 - "use-live-locations.ts"
Cohesion: 0.38
Nodes (6): EnrichedLocation, useLiveLocations(), UseLiveLocationsReturn, computeStatus(), LiveLocation, subscribeToLocations()

### Community 97 - "input-group.tsx"
Cohesion: 0.24
Nodes (6): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, Textarea()

### Community 98 - "leaflet-location-picker.tsx"
Cohesion: 0.25
Nodes (10): leaflet, react, react-leaflet, DraggableMarker(), getKitchenIcon(), getLocationIcon(), LeafletLocationPicker(), LeafletLocationPickerProps (+2 more)

### Community 103 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, postinstall, seed:admin, start, test, test:watch

### Community 107 - "⚠️ DEPRECATED - DOKU SNAP API Adapters"
Cohesion: 0.29
Nodes (6): Current Architecture, Current Payment Flow, ⚠️ DEPRECATED - DOKU SNAP API Adapters, Files in This Folder, To Remove, Why Not Removed?

### Community 109 - "seed-kopi.ts"
Cohesion: 0.50
Nodes (4): dotenv, generateBatchCode(), INVENTORY_ITEMS, main()

## Knowledge Gaps
- **580 isolated node(s):** `PaymentStatus`, `Payment`, `MIDTRANS_METHOD_NAME_MAP`, `CreatePaymentInput`, `paymentMethodsResponseSchema` (+575 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 820 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `prisma` to `.notFound`, `inventory-batch.service.ts`, `inventory-item.service.ts`, `.unprocessable`, `dashboard.service.ts`, `seed-kopi.ts`, `handleAuth`, `inventory/cost-history/route.ts`, `recipe.service.ts`, `order-report-page.tsx`, `ApiError`, `setting.service.ts`, `api-response.ts`, `restock.service.ts`, `payment.service.ts`, `finished-product.service.ts`, `stock.service.ts`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `recipe-form.tsx`, `barista-movements-page.tsx`, `chart.tsx`, `order-report-page.tsx`, `sidebar.tsx`, `ReportPage`, `(dashboard)/page.tsx`, `product-detail-view.tsx`, `stock-page.tsx`, `buttonVariants`, `app-sidebar.tsx`, `nav-main.tsx`, `use-tracking-broadcast.ts`, `product-form.tsx`, `FinishedBatchListPage`, `firebase.ts`, `ProductionDetailView`, `dependencies`, `(dashboard)/layout.tsx`, `UserDetailView`, `RecipeDetailView`, `ProfileEditForm`, `report-page.tsx`, `UserListPage`, `BaristaStockDetailView`, `cost-history-page.tsx`, `finished-product-detail-view.tsx`, `ProductListPage`, `RecipeListPage`, `SettingListPage`, `batch-detail-view.tsx`, `BatchListPage`, `production-list-page.tsx`, `restock-detail-view.tsx`, `restock-list-page.tsx`, `production-form.tsx`, `restock-form.tsx`, `poi-layer.tsx`, `BaristaStockPage`, `barista-restock-form.tsx`, `ItemListPage`, `use-live-locations.ts`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`, `react`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `PaymentStatus`, `Payment`, `MIDTRANS_METHOD_NAME_MAP` to the rest of the system?**
  _580 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `user-list-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07254623044096728 - nodes in this community are weakly interconnected._
- **Should `.notFound` be split into smaller, more focused modules?**
  _Cohesion score 0.06312098188194039 - nodes in this community are weakly interconnected._
- **Should `recipe-list-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.046948356807511735 - nodes in this community are weakly interconnected._