# Graph Report - raw  (2026-09-29)

## Corpus Check
- 1 files · ~309 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1684 nodes · 3727 edges · 124 communities (91 shown, 33 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 1,797 input · 3,242 output

## Community Hubs (Navigation)
- Admin UI Components
- Order Lifecycle API
- Barista Stock
- Production Batches
- Admin Seeding
- Recipe Editor
- Order Tracking
- Items API
- Payment Setup
- User Management
- Reports
- Project Config
- Recipe Activation
- Production API
- Barista API
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119

## God Nodes (most connected - your core abstractions)
1. `buttonVariants` - 97 edges
2. `react` - 74 edges
3. `Button()` - 63 edges
4. `handleAuth()` - 63 edges
5. `ok()` - 60 edges
6. `Card()` - 45 edges
7. `CardContent()` - 45 edges
8. `CardHeader()` - 43 edges
9. `CardTitle()` - 43 edges
10. `Badge()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `POILayer()` --references--> `react`  [EXTRACTED]
  src/components/tracking/poi-layer.tsx → package.json
- `AutoFitBounds()` --references--> `react`  [EXTRACTED]
  src/components/tracking/tracking-map.tsx → package.json
- `TrackingMapStyles()` --references--> `react`  [EXTRACTED]
  src/components/tracking/tracking-map.tsx → package.json
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/calendar.tsx → package.json
- `EditAdminPage()` --references--> `react`  [EXTRACTED]
  src/app/(dashboard)/admins/[id]/edit/page.tsx → package.json

## Import Cycles
- None detected.

## Communities (124 total, 33 thin omitted)

### Community 0 - "Admin UI Components"
Cohesion: 0.06
Nodes (48): AdminFormData, Props, AvailableProduct, Barista, BaristaListResponse, MutationResponse, ProductsResponse, Row (+40 more)

### Community 1 - "Order Lifecycle API"
Cohesion: 0.06
Nodes (47): GET, POST, POST, POST, POST, GET, POST, POST (+39 more)

### Community 2 - "Barista Stock"
Cohesion: 0.06
Nodes (37): BaristaStockDetail, BaristaStockProduct, DetailResponse, MutationResponse, BatchDetail, DetailResponse, MutationResponse, ProductionComponent (+29 more)

### Community 3 - "Production Batches"
Cohesion: 0.06
Nodes (31): Batch, ListResponse, MutationResponse, Item, ListResponse, MutationResponse, StatusFilter, StockFilter (+23 more)

### Community 4 - "Admin Seeding"
Cohesion: 0.06
Nodes (39): main(), syncDatabaseUser(), syncFirebaseUser(), USERS, handler, POST(), authOptions, SessionUser (+31 more)

### Community 5 - "Recipe Editor"
Cohesion: 0.06
Nodes (33): EditRecipePage(), PageProps, NewRecipePage(), PageProps, emptyRow(), FifoAllocation, formatNumber(), formatRupiah() (+25 more)

### Community 6 - "Order Tracking"
Cohesion: 0.06
Nodes (23): RoleFilter, TrackingMap, TrackingMapStyles, ListResponse, Movement, MovementType, TypeFilter, BaristaStockItem (+15 more)

### Community 7 - "Items API"
Cohesion: 0.08
Nodes (36): DELETE, GET, PATCH, GET, POST, DELETE, GET, PATCH (+28 more)

### Community 8 - "Payment Setup"
Cohesion: 0.08
Nodes (27): METHODS, GET, GET, POST, POST, previewSchema, POST, GET (+19 more)

### Community 9 - "User Management"
Cohesion: 0.09
Nodes (34): GET, PATCH, POST, PATCH, DELETE, GET, PATCH, GET (+26 more)

### Community 10 - "Reports"
Cohesion: 0.08
Nodes (32): formatDateInput(), formatFilterLabels(), getPresetRange(), PresetKey, ProductOption, ReportFilter(), ReportFilterProps, ReportFilterValue (+24 more)

### Community 11 - "Project Config"
Cohesion: 0.05
Nodes (39): babel-plugin-react-compiler, dotenv, devDependencies, babel-plugin-react-compiler, dotenv, playwright, prisma, @prisma/cli-engine (+31 more)

### Community 12 - "Recipe Activation"
Cohesion: 0.10
Nodes (31): PATCH, PATCH, DELETE, GET, PUT, GET, POST, planFifoConsumption() (+23 more)

### Community 13 - "Production API"
Cohesion: 0.09
Nodes (30): GET, GET, POST, GET, POST, computeFifoForItem(), computeFifoForRequests(), fetchFifoBatches() (+22 more)

### Community 14 - "Barista API"
Cohesion: 0.10
Nodes (26): POST, GET, GET, GET, POST, POST, GET, adjustBaristaStock() (+18 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (33): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node (+25 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (22): GET, ExportMeta, exportOrderReport(), fmtDateTime(), OrderReportFilterValue, fmtDateTime(), fmtNumber(), fmtRupiah() (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (13): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle(), SidebarContext, SidebarContextProps, SidebarProvider() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (23): RestockBaristaPage(), NewProductionPage(), NewRestockPage(), DetailError(), StockEmptyState(), DetailError(), BatchEmptyState(), CostHistoryEmptyState() (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (20): DELETE, PATCH, publicUrlFor(), r2, R2_BUCKET, R2_PUBLIC_BASE, buildKey(), compressImage() (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (18): GET, DELETE, GET, PATCH, GET, POST, createSetting(), deleteSetting() (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (18): DashboardPage(), DashboardStats, formatCompactRupiah(), formatDateShort(), formatRelativeTime(), formatRupiah(), StatsResponse, ChartConfig (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (18): react, react, timeAgo(), TrackingPage(), AdminForm(), normalizePhone(), LoginForm(), ActiveOrder (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.21
Nodes (16): GET, GET, GET, GET, GET, handleAuth(), ok(), buildDateWhere() (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (17): DELETE, GET, GET, POST, createRestock(), generateBatchCode(), getRestockById(), listRestocks() (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (13): canCancel(), ChannelFilter, fmtDateTime(), fmtRupiah(), ListResponse, MutationResponse, Order, OrderListPage() (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (14): DELETE, GET, PATCH, GET, getFinishedBatchById(), listFinishedBatches(), updateFinishedBatch(), voidFinishedBatch() (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (14): CostHistory, DetailError(), DetailResponse, formatBytes(), formatDateTime(), formatNumber(), formatRupiah(), ImageItem (+6 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (12): finishedStatusBadge(), FinishedStatusFilter, FinishedStockItem, formatNumber(), formatRupiah(), materialStatusBadge(), MaterialStatusFilter, MaterialStockItem (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (12): GET, GET, FinishedStockItem, getLowStockItems(), getStockSummary(), MaterialStockItem, MaterialStockStatus, StockSummary (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (10): DetailResponse, EditAdminPage(), NewAdminPage(), DetailResponse, EditUserPage(), NewUserPage(), isoToDateInput(), normalizePhone() (+2 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (15): administration, dashboard, inventoryFlow, orders, reports, system, teams, NavProjects() (+7 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (14): hasActiveChild(), NavItem, NavItemRenderer(), NavMain(), NavMainProps, SidebarGroup(), SidebarGroupLabel(), SidebarMenuAction() (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (14): GeoPosition, NavigatorWithBattery, useBattery(), useDeviceInfo(), useGeolocation(), UseGeolocationOptions, UseGeolocationReturn, useTrackingBroadcast() (+6 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (11): Batch, DetailError(), DetailResponse, formatDateTime(), formatNumber(), formatRupiah(), ItemDetail, ItemDetailView() (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (10): GET, PATCH, GET, getInventoryBatchById(), listInventoryBatches(), updateInventoryBatch(), ListInventoryBatchQuery, listInventoryBatchQuerySchema (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (9): FinishedBatch, FinishedBatchListPage(), formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), ListResponse, MutationResponse (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.19
Nodes (5): DropdownMenuGroup(), DropdownMenuLabel(), DropdownMenuSeparator(), DropdownMenuShortcut(), SidebarMenu()

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (6): Field(), FieldDescription(), FieldGroup(), FieldLabel(), fieldVariants, Separator()

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (10): useLiveLocations(), UseLiveLocationsReturn, UseFirebaseLoginReturn, auth, firebaseConfig, computeStatus(), LiveLocation, subscribeToLocations() (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (9): DetailError(), DetailResponse, formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), ProductionComponent, ProductionDetail (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (12): Accept Payments, API Reference, Backend Integration, Checkout Page, DOKU Checkout, Frontend Integration, DOKU Checkout Integration Guide, Integration Steps (+4 more)

### Community 44 - "Community 44"
Cohesion: 0.30
Nodes (9): GET, DashboardStats, formatDateOnly(), getDashboardStats(), startOfDay(), startOfDaysAgo(), startOfMonth(), DashboardStatsQuery (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (9): DetailResponse, EditProductPage(), NewProductPage(), formatBytes(), formatDigits(), formatRupiah(), ProductForm(), ProductFormData (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (6): ListResponse, MutationResponse, Setting, SettingType, StatusFilter, TypeFilter

### Community 47 - "Community 47"
Cohesion: 0.31
Nodes (6): GET, GET, getCostHistorySummary(), listCostHistories(), ListCostHistoryQuery, listCostHistoryQuerySchema

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (5): getInitials(), NavUser(), Avatar(), AvatarFallback(), AvatarImage()

### Community 49 - "Community 49"
Cohesion: 0.31
Nodes (9): fmtDateTime(), fmtNum(), fmtPct(), fmtRupiah(), marginClass(), MasterProductsTab(), MasterRow, ReportData (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (9): @anthropic-ai/claude-code, leaflet, lucide-react, dependencies, @anthropic-ai/claude-code, leaflet, lucide-react, @prisma/adapter-pg (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.28
Nodes (5): AppSidebar(), ModeToggle(), NotificationButton(), SidebarInset(), SidebarTrigger()

### Community 54 - "Community 54"
Cohesion: 0.28
Nodes (8): Barista, CartItem, getPaymentIcon(), PaymentMethod, PaymentResult, Product, SimulationPage(), formatRupiah()

### Community 55 - "Community 55"
Cohesion: 0.28
Nodes (5): geistMono, geistSans, metadata, AppSessionProvider(), ThemeProvider()

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (6): ListResponse, MutationResponse, Props, Role, User, UserStatus

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (4): formatDate(), formatDateTime(), getInitials(), UserDetailView()

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (5): DetailResponse, EditItemPage(), NewItemPage(), ItemForm(), ItemFormData

### Community 61 - "Community 61"
Cohesion: 0.25
Nodes (6): formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost(), ItemRow(), RecipeDetailView()

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (6): PageProps, canCancel(), fmtDateTime(), fmtRupiah(), OrderDetailView(), statusBadge()

### Community 63 - "Community 63"
Cohesion: 0.32
Nodes (7): ActiveOrder, fmtRupiah(), ListResponse, OrdersLiveMap, OrdersLiveMapStyles, OrdersMapPage(), statusBadge()

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (6): formatDateTime(), getInitials(), isoToDateInput(), normalizePhone(), ProfileEditForm(), snapshotFrom()

### Community 65 - "Community 65"
Cohesion: 0.36
Nodes (7): buildSheet(), BuildSheetArgs, ColumnDef, exportProductsReportExcel(), fetchReport(), fmtDateTime(), ReportFilterParams

### Community 66 - "Community 66"
Cohesion: 0.36
Nodes (7): fmtDateTime(), fmtNum(), fmtRupiah(), ProductionRow, ProductionsTab(), ReportData, TabProps

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (7): AutoFitBounds(), getMarkerIcon(), MarkerVariant, TrackingMap(), TrackingMapProps, TrackingMapStyles(), EnrichedLocation

### Community 70 - "Community 70"
Cohesion: 0.29
Nodes (3): formatDate(), getInitials(), UserListPage()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (5): PageProps, BaristaStockDetailView(), formatDateTime(), formatNumber(), formatRupiah()

### Community 72 - "Community 72"
Cohesion: 0.29
Nodes (5): CostHistoryPage(), formatDateTime(), formatNumber(), formatRupiah(), marginTextClass()

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (5): FinishedBatchDetailView(), formatDateTime(), formatNumber(), formatRupiah(), formatUnitCost()

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (5): formatNumber(), formatRupiah(), marginBadgeClass(), ProductListPage(), truncate()

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (5): formatDateTime(), formatNumber(), formatRupiah(), marginColorClass(), RecipeListPage()

### Community 76 - "Community 76"
Cohesion: 0.29
Nodes (5): formatFee(), getMethodIcon(), PaymentMethodListPage(), formatValue(), SettingListPage()

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (4): BaristaMovementsPage(), formatDateTime(), formatNumber(), typeBadge()

### Community 78 - "Community 78"
Cohesion: 0.33
Nodes (4): BatchDetailView(), formatDateTime(), formatNumber(), formatRupiah()

### Community 79 - "Community 79"
Cohesion: 0.33
Nodes (4): BatchListPage(), formatDateTime(), formatNumber(), formatRupiah()

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (4): formatDateTime(), formatNumber(), formatRupiah(), ProductionListPage()

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (4): formatDateTime(), formatNumber(), formatRupiah(), RestockDetailView()

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (4): formatDateTime(), formatNumber(), formatRupiah(), RestockListPage()

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (6): formatNumber(), formatRupiah(), formatUnitCost(), parseNumber(), ProductionForm(), stripNonDigits()

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (6): emptyRow(), formatDigits(), formatRupiahDisplay(), parseNumber(), RestockForm(), stripNonDigits()

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (5): AMENITY_LIST, POI_ICONS, POILayer(), POILayerProps, SHOP_LIST

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 87 - "Community 87"
Cohesion: 0.40
Nodes (3): BaristaStockPage(), formatNumber(), formatRupiah()

### Community 88 - "Community 88"
Cohesion: 0.40
Nodes (5): BaristaRestockForm(), emptyRow(), formatNumber(), parseNumber(), stripNonDigits()

### Community 91 - "Community 91"
Cohesion: 0.67
Nodes (3): API Keys, Client ID, Secret Key

## Knowledge Gaps
- **513 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+508 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 22` to `Recipe Editor`, `Reports`, `Community 16`, `Community 17`, `Community 18`, `Community 21`, `Community 26`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 37`, `Community 40`, `Community 41`, `Community 45`, `Community 52`, `Community 53`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 67`, `Community 70`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 82`, `Community 83`, `Community 84`, `Community 85`, `Community 87`, `Community 88`, `Community 89`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `prisma` connect `Payment Setup` to `Order Lifecycle API`, `Admin Seeding`, `Community 36`, `Items API`, `User Management`, `Community 44`, `Production API`, `Barista API`, `Community 47`, `Recipe Activation`, `Community 16`, `Community 19`, `Community 20`, `Community 23`, `Community 25`, `Community 27`, `Community 30`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 52` to `Project Config`, `Community 22`, `Community 93`, `Community 94`, `Community 95`, `Community 96`, `Community 97`, `Community 98`, `Community 100`, `Community 101`, `Community 102`, `Community 103`, `Community 104`, `Community 106`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 111`, `Community 112`, `Community 113`, `Community 114`, `Community 115`, `Community 116`, `Community 117`, `Community 118`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _513 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05879692446856626 - nodes in this community are weakly interconnected._
- **Should `Order Lifecycle API` be split into smaller, more focused modules?**
  _Cohesion score 0.06345848757271286 - nodes in this community are weakly interconnected._
- **Should `Barista Stock` be split into smaller, more focused modules?**
  _Cohesion score 0.06140350877192982 - nodes in this community are weakly interconnected._