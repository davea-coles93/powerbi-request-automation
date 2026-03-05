# Retail Dynamics Ltd - Retail Performance Model Context

## Client Overview
Retail Dynamics Ltd operates a chain of ~350 retail stores across multiple districts. Their analytics team uses two PowerBI models: "Retail Performance" (retail-analysis) for district-level performance management and "Store Sales Dashboard" (store-sales) for individual store tracking with clustering. Both models share the same underlying star schema.

## Business Purpose
These models support:
- District and store performance benchmarking
- Product category and item-level sales analysis
- Time period trending (monthly/quarterly/yearly)
- Store clustering and segmentation (store-sales model)
- Inventory and margin analysis

## Key Tables and Relationships (shared across both models)
- **Sales** - Fact table containing transactional sales data
  - Links to Store (LocationID → Store.LocationID)
  - Links to Item (ItemID → Item.ItemID)
  - Links to Time (ReportingPeriodID → Time.ReportingPeriodID)
- **Store** - Store dimension with location and operational data
  - Links to District (DistrictID → District.DistrictID)
  - Has OpenDate column for store age analysis
- **District** - Geographic district dimension for regional rollups
- **Item** - Product/item dimension with category hierarchy
- **Time** - Time/reporting period dimension with Month column

## Store Sales Dashboard (store-sales) Additional Tables
- **ClusterMappingTable 2** - Store clustering/segmentation assignments

## Key Columns
### Sales
- Standard transactional columns (quantity, amount, cost)
- LocationID, ItemID, ReportingPeriodID as foreign keys

### Store
- LocationID (PK), DistrictID (FK)
- OpenDate - Store opening date
- Store operational attributes

### Item
- ItemID (PK)
- Product category hierarchy columns

### Time
- ReportingPeriodID (PK)
- Month - Calendar month
- Period hierarchy columns

## Existing Measures
Currently minimal explicit measures defined in TMDL — most analysis uses implicit aggregations on Sales columns. This is an opportunity to add proper DAX measures.

## Naming Conventions
- Use clear, business-friendly names (e.g., "Total Sales", "Sales YTD")
- Table names are singular (Store, Item, Sales — not Stores, Items)
- Time intelligence measures should reference the Time table (not a Date table)
- Note: Time table uses ReportingPeriodID and Month — NOT a standard Date table with daily grain

## Display Folder Organization
- **Sales Metrics** - Revenue, quantity, average transaction
- **Store Performance** - Per-store metrics, comp sales
- **Product Analysis** - Category-level measures
- **Time Intelligence** - YoY, MTD, QTD, YTD measures

## Format Strings
- Currency: `$#,##0.00` or `$#,##0`
- Percentages: `0.00%` or `0.0%`
- Whole numbers: `#,##0`
- Decimals: `#,##0.00`

## Business Rules
- Sales Amount is the primary revenue metric
- District is the primary geographic hierarchy for management reporting
- Store OpenDate determines store age and comp store eligibility
- Comp store = store open for at least 12 full months
- Time table uses monthly grain (ReportingPeriodID), not daily — standard SAMEPERIODLASTYEAR may need adaptation
- The ClusterMappingTable in store-sales groups stores by performance profile

## Important Notes for Change Requests
- The Time table is NOT a standard Date table — it uses ReportingPeriodID and Month columns. Time intelligence functions like SAMEPERIODLASTYEAR require a contiguous date column. Check if Month can serve this purpose, or flag that time intelligence may need a helper date table.
- Both models (retail-analysis and store-sales) share the same base schema. Changes to one should be considered for the other.
