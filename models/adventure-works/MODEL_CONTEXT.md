# Adventure Works Sales Model - Context

## Business Purpose
This model tracks reseller sales data for the Adventure Works bicycle company. It's used for sales performance analysis, territory management, and product profitability tracking.

## Key Tables and Relationships
- **Sales** - Fact table containing sales transactions
  - Links to Date (OrderDateKey, DueDateKey, ShipDateKey)
  - Links to Customer, Product, Reseller, Sales Territory
- **Date** - Date dimension with calendar hierarchy
- **Customer** - Customer master data
- **Product** - Product catalog
- **Reseller** - Reseller/partner information
- **Sales Territory** - Geographic territories

## Existing Measures
- **Sales Amount by Due Date** - Sales calculated using due date relationship instead of order date

## Naming Conventions
- Use clear, business-friendly names (e.g., "Sales YoY %", not "SalesYoYPct")
- Time intelligence measures should reference the base measure name
- Use proper spacing and capitalization

## Display Folder Organization
- **Time Intelligence** - YoY, MTD, YTD, QTD measures
- **Profitability** - Margin, cost, profit measures
- **Returns** - Return-related calculations
- Base measures typically stay at root level

## Common Patterns
- Use CALCULATE for context modifications
- Use DIVIDE for safe division (avoids divide-by-zero)
- Handle blanks gracefully with ISBLANK or BLANK() returns
- Use SAMEPERIODLASTYEAR, DATEADD for time intelligence
- Reference existing measures in new calculations when possible

## Format Strings
- Currency: `$#,##0.00` or `$#,##0`
- Percentages: `0.00%` or `0.0%`
- Whole numbers: `#,##0`
- Decimals: `#,##0.00`

## Business Rules
- Sales Amount is the primary revenue metric
- Extended Amount = Order Quantity × Unit Price
- Total Product Cost is the cost basis
- Gross Profit = Sales Amount - Total Product Cost
