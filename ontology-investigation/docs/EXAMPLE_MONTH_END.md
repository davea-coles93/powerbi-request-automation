# Example: Month-End Close in Manufacturing

This document applies the ontology framework to a concrete example: month-end close in a manufacturing business.

---

## Metrics (Starting Point)

What does finance need to know at month-end?

| Metric | Business Question | Relevant Perspectives |
|--------|-------------------|----------------------|
| Cost of Goods Sold | What did it cost to produce what we sold? | Financial |
| Inventory Valuation | What inventory do we hold and at what value? | Financial, Management |
| Gross Margin | What's our production profitability? | Financial |
| Accruals Accuracy | Have we captured all liabilities? | Financial |
| WIP Valuation | What's the value of in-progress production? | Financial |
| Production vs Plan | Did we hit our production targets? | Management |
| Yield Rate | How efficient was our material usage? | Management, Financial |
| Scrap Rate | How much waste did we generate? | Management |
| Machine Utilization | How effectively did we use capacity? | Management |
| Inventory Accuracy | Does system stock match physical stock? | Management, Financial |

---

## Tracing Backwards: Metrics → Measures → Observations

```
METRIC                      MEASURE                           OBSERVATIONS
─────────────────────────────────────────────────────────────────────────────
Cost of Goods Sold    ←──  Material cost consumed       ←──  Goods issues (materials)
                           (qty × std cost)                   Standard costs
                      ←──  Labor cost applied           ←──  Labor time recordings
                           (hours × rate)                     Labor rates
                      ←──  Overhead absorbed            ←──  Machine run hours
                           (hours × overhead rate)            Overhead rates

Inventory Valuation   ←──  Stock quantity × value       ←──  Goods movements
                                                             Standard costs
                                                             Inventory counts

Yield Rate            ←──  Actual output / Input used   ←──  Production confirmations
                           × 100                              Goods issues (materials)

Production vs Plan    ←──  Actual output / Planned      ←──  Production confirmations
                           × 100                              Production order (planned qty)

Inventory Accuracy    ←──  (Counted - System) /         ←──  Inventory count results
                           System × 100                       System stock snapshot

Accruals (GR/IR)      ←──  GR value without matching    ←──  Goods receipts
                           IR                                 Invoice receipts
```

---

## Observations Detail

| Observation | Entity | System | Source Actor | Reliability | Volatility |
|-------------|--------|--------|--------------|-------------|------------|
| Production order created | Production Order | ERP | Production Planner | High | Point-in-time |
| Production confirmations | Production Order | MES | Floor Operator / Auto | High | Accumulating |
| Goods issues (materials) | Material Document | ERP | System (backflush) | High | Accumulating |
| Labor time recordings | Time Entry | Time System | Operator (manual) | Medium | Accumulating |
| Scrap postings | Scrap Record | MES | Floor Operator | Medium | Accumulating |
| Machine run data | Machine Log | SCADA | Equipment (auto) | High | Continuous |
| Inventory count results | Count Document | WMS | Warehouse (manual) | Medium | Point-in-time |
| Goods receipts (inbound) | Goods Receipt | ERP | Receiving Clerk | High | Accumulating |
| Invoice receipts | Invoice | ERP | AP Clerk | High | Accumulating |
| System stock snapshot | Inventory Position | ERP | System | High | Point-in-time |

---

## Entities

### Production Order

```
Entity: Production Order
├── Core Attributes
│   ├── ID
│   ├── Created Date
│   ├── Product (Material ID)
│   ├── Planned Quantity
│   └── Status
│
├── Operational Lens
│   ├── Interpretation: "Work instruction to be executed"
│   ├── BOM (Bill of Materials)
│   ├── Routing (operations, work centers)
│   ├── Actual Quantity Produced
│   └── Completion Date
│
├── Management Lens
│   ├── Interpretation: "Unit of performance measurement"
│   ├── Yield % (actual / planned after scrap)
│   ├── On-Time Status
│   └── Cycle Time vs Standard
│
└── Financial Lens
    ├── Interpretation: "Cost collector"
    ├── Planned Cost
    ├── Actual Cost (materials + labor + overhead)
    ├── Variance (planned - actual)
    └── Settlement Target (cost center, asset, etc.)
```

### Material

```
Entity: Material
├── Core Attributes
│   ├── ID
│   ├── Description
│   ├── Unit of Measure
│   └── Material Type
│
├── Operational Lens
│   ├── Interpretation: "Physical item to handle"
│   ├── Storage Location
│   ├── Batch/Lot tracking
│   └── Shelf Life
│
├── Management Lens
│   ├── Interpretation: "Item to track consumption of"
│   ├── Consumption Rate
│   ├── Reorder Point
│   └── Safety Stock
│
└── Financial Lens
    ├── Interpretation: "Valued inventory item"
    ├── Standard Cost
    ├── Moving Average Price
    ├── Inventory Value
    └── Valuation Class
```

### Invoice

```
Entity: Invoice
├── Core Attributes
│   ├── ID
│   ├── Vendor
│   ├── Invoice Date
│   └── Total Amount
│
├── Operational Lens
│   ├── Interpretation: "Document to process"
│   ├── Receipt Date
│   ├── Line Items
│   └── Matched to PO/GR
│
├── Management Lens
│   ├── Interpretation: "Item in processing queue"
│   ├── Days Since Receipt
│   ├── Approval Status
│   └── Exception Flag
│
└── Financial Lens
    ├── Interpretation: "Liability to record/pay"
    ├── Due Date
    ├── Payment Terms
    ├── GL Account
    └── Accrual Status
```

---

## Systems

| System | Type | Vendor | Reliability Default | Integration Status |
|--------|------|--------|--------------------|--------------------|
| ERP | ERP | SAP / D365 / Oracle | High | Connected |
| MES | MES | Various | High | Connected |
| WMS | WMS | Various | High | Connected |
| SCADA | MES | Various | High | Connected |
| Time System | Other | Various | Medium | Manual Extract |
| Excel Tracking | Spreadsheet | Microsoft | Low | Manual Extract |

---

## Month-End Close Process

### Process Overview

```
MONTH-END CLOSE
├── Purpose: Close financial period and report accurate position
├── Duration: Typically Day 1-5 of following month
└── Cross-functional: Operations → Management → Finance
```

### Process Steps

**Step 1: Production Cutoff**
```
├── Sequence: 1
├── Perspective: Operational
├── Actor: Production Manager
├── Action: Confirm all completed production orders, no further confirmations for prior period
├── Consumes Observations: Production confirmations (review)
├── Produces Observations: None (cutoff is a control, not data creation)
├── Uses Metrics: None
├── Crystallizes: [Production confirmations, Production goods movements]
├── Depends On: []
└── Deadline: Day 1
```

**Step 2: Inventory Cutoff**
```
├── Sequence: 2
├── Perspective: Operational
├── Actor: Warehouse Manager
├── Action: Complete all goods movements, freeze stock for counting
├── Consumes Observations: Goods movements (review)
├── Produces Observations: System stock snapshot
├── Uses Metrics: None
├── Crystallizes: [Goods movements]
├── Depends On: [Step 1]
└── Deadline: Day 1
```

**Step 3: Physical Count**
```
├── Sequence: 3
├── Perspective: Operational
├── Actor: Warehouse Team
├── Action: Count physical inventory
├── Consumes Observations: System stock snapshot
├── Produces Observations: Inventory count results
├── Uses Metrics: None
├── Crystallizes: []
├── Depends On: [Step 2]
└── Deadline: Day 2
```

**Step 4: Count Reconciliation**
```
├── Sequence: 4
├── Perspective: Management
├── Actor: Inventory Controller
├── Action: Compare counts to system, investigate variances, post adjustments
├── Consumes Observations: Inventory count results, System stock snapshot
├── Produces Observations: Inventory adjustments
├── Uses Metrics: Inventory Accuracy
├── Crystallizes: [Inventory count results]
├── Depends On: [Step 3]
└── Deadline: Day 2
```

**Step 5: GR/IR Reconciliation**
```
├── Sequence: 5
├── Perspective: Financial
├── Actor: AP Accountant
├── Action: Match goods receipts to invoices, identify unmatched, post accruals
├── Consumes Observations: Goods receipts, Invoice receipts
├── Produces Observations: Accrual postings
├── Uses Metrics: Accruals (GR/IR)
├── Crystallizes: [Goods receipts, Invoice receipts]
├── Depends On: [Step 2]
└── Deadline: Day 3
```

**Step 6: WIP Valuation**
```
├── Sequence: 6
├── Perspective: Financial
├── Actor: Cost Accountant
├── Action: Value work in progress orders, post variances
├── Consumes Observations: Production confirmations, Goods issues, Labor time
├── Produces Observations: WIP valuation postings
├── Uses Metrics: WIP Valuation
├── Crystallizes: []
├── Depends On: [Step 1, Step 4]
└── Deadline: Day 3
```

**Step 7: Inventory Valuation**
```
├── Sequence: 7
├── Perspective: Financial
├── Actor: Cost Accountant
├── Action: Run inventory valuation, post to GL
├── Consumes Observations: All goods movements, Inventory adjustments
├── Produces Observations: Inventory valuation postings
├── Uses Metrics: Inventory Valuation, COGS
├── Crystallizes: [Inventory adjustments]
├── Depends On: [Step 4, Step 6]
└── Deadline: Day 4
```

**Step 8: Production Order Settlement**
```
├── Sequence: 8
├── Perspective: Financial
├── Actor: Cost Accountant
├── Action: Settle completed production orders to receivers
├── Consumes Observations: Production confirmations, All cost postings
├── Produces Observations: Settlement postings
├── Uses Metrics: Production variances
├── Crystallizes: []
├── Depends On: [Step 7]
└── Deadline: Day 4
```

**Step 9: Close Review**
```
├── Sequence: 9
├── Perspective: Financial
├── Actor: Finance Manager
├── Action: Review all metrics, approve period close
├── Consumes Observations: All valuation postings
├── Produces Observations: Period close confirmation
├── Uses Metrics: [All financial metrics]
├── Crystallizes: [All observations for period]
├── Depends On: [Step 5, Step 7, Step 8]
└── Deadline: Day 5
```

---

## Process Flow Visualization

```
Day 1                    Day 2                 Day 3                 Day 4              Day 5
─────────────────────────────────────────────────────────────────────────────────────────────

[1. Production    ]
[   Cutoff        ]──┐
                     │
[2. Inventory     ]  │
[   Cutoff        ]──┼──[3. Physical  ]──[4. Count         ]
                     │  [   Count     ]  [   Reconciliation]──┐
                     │                                        │
                     └──────────────────[5. GR/IR         ]   │
                                        [   Reconciliation]───┼──┐
                                                              │  │
                                        [6. WIP           ]───┘  │
                                        [   Valuation     ]──────┼──[7. Inventory ]──[8. Settlement]──[9. Close  ]
                                                                 │  [   Valuation]                     [   Review ]
                                                                 │       │
                                                                 └───────┘

Legend:
[Operational] [Management] [Financial]
```

---

## Perspective Views

### Operational View of Month-End

"What do I need to do and confirm?"

| My Action | By When | What I'm Confirming |
|-----------|---------|---------------------|
| Confirm all production orders | Day 1 | All completed work is recorded |
| Complete all goods movements | Day 1 | All material moves are in system |
| Freeze inventory | Day 1 | No more movements until count done |
| Count physical stock | Day 2 | Actual quantities on hand |

### Management View of Month-End

"How did we perform this period?"

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Production vs Plan | 95% | 98% | ✓ |
| Yield Rate | 97% | 96.5% | ⚠ |
| Inventory Accuracy | 99% | 99.2% | ✓ |
| Scrap Rate | <2% | 1.8% | ✓ |

### Financial View of Month-End

"What is the financial position?"

| Metric | Value | vs Prior | Notes |
|--------|-------|----------|-------|
| COGS | £1.2M | +3% | Volume driven |
| Inventory Value | £2.8M | -2% | Reduced WIP |
| Gross Margin | 34% | Flat | |
| GR/IR Accrual | £45K | -£12K | Improved matching |
| Production Variances | £8K unfav | | Labor efficiency |

---

## Gap Analysis Example

If mapping this ontology to an actual customer's semantic model:

| Ontology Element | Type | Semantic Model | Status |
|------------------|------|----------------|--------|
| Production Order | Entity | FactProductionOrders | ✓ Mapped |
| Material | Entity | DimMaterial | ✓ Mapped |
| Invoice | Entity | FactAPInvoices | ✓ Mapped |
| Production confirmations | Observation | FactProductionOrders[ConfirmedQty] | ✓ Mapped |
| Labor time recordings | Observation | *None* | ⚠ Gap - data in separate system |
| Machine run data | Observation | *None* | ⚠ Gap - SCADA not integrated |
| COGS | Metric | [Total COGS] | ✓ Mapped |
| Yield Rate | Metric | *None* | ⚠ Gap - measure needed |
| Inventory Accuracy | Metric | *None* | ⚠ Gap - no count data |

This gap analysis drives requirements: "To support month-end close properly, you need to integrate labor time system and add Yield Rate measure."
