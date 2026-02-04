# Business Ontology Framework

## The Problem

Most tools solve one piece in isolation:
- **Process mapping** (Visio, Lucidchart) - no data lineage
- **Data modeling** (ER diagrams, Power BI model view) - no business context
- **BI dashboards** (Power BI) - no process context
- **Data lineage** (Purview, dbt) - technical, not business-oriented

**Nobody connects**: "This person on the floor does this action → which creates this data → which feeds this metric → which answers this business question → which is used in this financial process"

## The Niche

Connect the full value chain from operational data creation through to financial analysis. Bridge the gap between "where data is born" and "where decisions are made" - currently filled by tribal knowledge, spreadsheets, and hope.

---

## Core Concepts

### The Fundamental Flow

```
Data Generation Layer          Measurement Layer           Analysis Layer
(where work happens)           (what gets captured)        (what it means)

Manufacturing Floor    →    Production Metrics    →    Financial Analysis
Warehouse Operations   →    Inventory Metrics     →    Working Capital View
Sales Team            →    Revenue Metrics       →    P&L Analysis
```

**Key insight**: Data flows upward from operations, but requirements flow downward from finance. The ontology captures both directions.

### The Framework Logic

1. **Define what needs to be measured** (Finance says "I need to understand cost per unit")
2. **Define where it's generated** (That comes from production data + procurement data)
3. **Define the semantics** (Here's how we model and calculate it)
4. **Iterate** (Does this actually answer the business question? No? Refine.)

Financial processes then overlay as consumers of this measurement framework.

---

## Perspectives

### What Perspectives Are

Perspectives are **modes of thinking** about the same underlying reality, not organizational layers.

| Perspective | Concern Type | Question Pattern |
|-------------|--------------|------------------|
| Operational | Execution | "What happened? What's the status?" |
| Management | Performance | "How well did it happen? Are we on track?" |
| Financial | Value | "What does it mean in money terms? What's the position?" |

### Key Insight: Management as Measurement

Management isn't a separate organizational layer - it's the **measurement function** that exists within each operational area. A Production Manager operates in both Operational (checking order status) and Management (reviewing yield rates) perspectives.

### Implementation Approach

- **UI/Navigation**: Present three clean perspective views users can switch between
- **Underlying Schema**: Metrics and Measures are tagged with relevant perspectives, not owned by them

This gives users a clean mental model while accurately representing that a Metric can be relevant to multiple perspectives.

### Perspective Properties

```
PERSPECTIVE
├── ID
├── Name
├── Purpose (why this view exists)
├── Primary Concern (what questions it answers)
├── Typical Actors []
├── Typical Entities [] (which entities are most relevant here)
├── Consumes From Perspectives []
└── Feeds Perspectives []
```

### The Three Perspectives Defined

**Operational**
```
Purpose: Execute and record business activities
Primary Concern: "What work is being done? What happened?"
Typical Actors: Production Operator, Warehouse Operative, Machine/Equipment, Receiving Clerk
Typical Entities: Production Order, Material Document, Time Entry, Machine Log
Consumes From: [] (this is where data is born)
Feeds: [Management, Financial]
```

**Management**
```
Purpose: Monitor performance against targets and plans
Primary Concern: "How are we performing? Are we on track?"
Typical Actors: Production Manager, Warehouse Manager, Inventory Controller, Plant Manager
Typical Entities: Production Order (as performance unit), Work Center, Production Plan
Consumes From: [Operational]
Feeds: [Financial]
```

**Financial**
```
Purpose: Understand business value and state
Primary Concern: "What is the financial position? What does it mean?"
Typical Actors: Cost Accountant, AP/AR Accountant, Finance Manager, CFO
Typical Entities: Production Order (as cost collector), Invoice, GL Account, Cost Center
Consumes From: [Operational, Management]
Feeds: [] (external reporting, decisions)
```

---

## Entities

### The Entity Challenge

The same business object (e.g., Production Order) means different things to different perspectives:
- **Operational**: Work instruction with BOM, routing, quantities
- **Management**: Performance unit (yield, timing)
- **Financial**: Cost collector (labor, materials, overhead)

### Solution: One Entity with Perspective Lenses

```
ENTITY
├── ID
├── Name
├── Core Attributes [] (shared facts)
└── Lenses []
    ├── Perspective
    ├── Interpretation (what this entity means in this perspective)
    └── Derived Attributes []
```

**Example:**
```
Entity: Production Order
├── Core Attributes
│   ├── ID
│   ├── Created Date
│   ├── Product
│   └── Quantity
│
├── Operational Lens
│   ├── Interpretation: "Work to be executed"
│   ├── BOM explosion
│   └── Routing steps
│
├── Management Lens
│   ├── Interpretation: "Performance unit"
│   ├── Yield %
│   └── On-time status
│
└── Financial Lens
    ├── Interpretation: "Cost collector"
    ├── Cost variance
    └── Settlement postings
```

---

## Terminology

### The Chain

```
Observation (data born) → Measure (calculation) → Metric (business KPI)
```

**Example:**
"Labor hours recorded" → "Total labor cost / units produced" → "Cost per Unit"

### Definitions

**Observation**: Raw data that is captured/born at a point of activity
- What gets recorded when work happens
- Has a source (who/what creates it) and a system (where it lives)

**Measure**: A calculation applied to observations (and other measures)
- The derived calculation that transforms data into insight
- Has a defined logic/formula

**Metric**: A business KPI that answers a business question
- The anchor point - requirements start here
- Used by specific perspectives and consumed by processes

### Why This Terminology

Standard BI terminology uses "metric" and "measure" almost interchangeably. We distinguish them because:
- **Metrics justify everything else** - we capture observations and build measures *because* we need metrics
- **Measures are reusable** - one measure might feed multiple metrics
- **Observations are facts** - measures interpret them, metrics give them business meaning

---

## Systems

### Why Systems Matter

The system where an observation lives tells you:
- Integration planning (what do we need to connect to?)
- Data quality assessment (ERP vs Excel vs manual)
- Gap analysis (is this captured anywhere, or just in someone's head?)
- Automation potential (can we pull this automatically?)

### System as First-Class Entity

```
SYSTEM
├── ID
├── Name
├── Type: ERP | MES | WMS | Spreadsheet | Manual | BI | Other
├── Vendor (optional): SAP | Microsoft | Oracle | Custom | N/A
├── Reliability Default: High | Medium | Low
├── Integration Status: Connected | Planned | Manual Extract | None
└── Notes
```

Systems attach to Observations, not Entities. The same Entity (Production Order) might have observations from multiple systems (ERP for creation, MES for progress).

---

## Observations

### Properties

```
OBSERVATION
├── ID
├── Name
├── Entity (what it describes)
├── System (where it lives)
├── Source Actor (who/what creates it)
├── Reliability: High | Medium | Low (can override system default)
├── Volatility: Point-in-time | Accumulating | Continuous
└── Notes
```

### Data Quality Dimensions

| Dimension | Description | Examples |
|-----------|-------------|----------|
| **Reliability** | How trustworthy is this data? | Machine log (high) vs manual entry (low) |
| **Volatility** | How does this data change over time? | Stock count (point-in-time) vs open orders (accumulating) |

### Volatility Types

- **Point-in-time**: Snapshot value, replaced by next observation (inventory count)
- **Accumulating**: Grows through period, fixed at close (labor hours for month)
- **Continuous**: Constantly changing, no natural close (current stock level)

---

## Measures

### Properties

```
MEASURE
├── ID
├── Name
├── Input Observations []
├── Input Measures [] (measures can feed other measures)
├── Logic (description of calculation)
├── Delivers Metrics []
└── Relevant To Perspectives []
```

### Design Principle

Metrics are the anchor. When defining measures, start from "what metric does this deliver?" and work backwards.

---

## Metrics

### Properties

```
METRIC
├── ID
├── Name
├── Business Question (what it answers)
├── Calculated By Measures []
└── Relevant To Perspectives []
```

### Starting from Metrics

The ontology is navigated **backwards from metrics**:
1. "I need to know Gross Margin" (Metric)
2. "What measures calculate it?" (Measures)
3. "What observations feed those?" (Observations)
4. "Where does that data come from?" (Systems, Actors)

This is the **requirements flow**. The data flow is the reverse.

---

## Processes

### Cross-Perspective Nature

Processes span perspectives. Month-end close isn't purely a finance process - it's cross-functional coordination:
1. Operations must close production orders
2. Warehouse must complete counts
3. Procurement must complete GR/IR matching
4. Finance consolidates and reports

### Properties

```
PROCESS
├── ID
├── Name
├── Steps []
    ├── Sequence
    ├── Name
    ├── Perspective (where this step executes)
    ├── Actor (who/what performs it)
    ├── Consumes Observations []
    ├── Produces Observations []
    ├── Uses Metrics []
    ├── Crystallizes Observations []
    └── Depends On Steps []
```

### Crystallization

Observations don't inherently crystallize - they crystallize **because of process steps**.

"Production confirmations" become frozen facts when "Production Cutoff" step executes. The same observation type might crystallize at different times for different processes (monthly close vs weekly flash).

```
Process Step: Production Cutoff
├── Crystallizes: [Production Confirmations, Production Goods Movements]
└── After this step, these observations are frozen for this period
```

---

## Mapping Layer

### Purpose

The ontology describes **what the business needs** (the "should be").
The mapping layer describes **how it's currently implemented** (the "is").

Keeping these separate supports:
- Gap analysis (what's missing?)
- Technology agnosticism (could map to Power BI, Fabric, Tableau)
- Requirements building (ontology defines need, mapping assesses current state)

### Structure

```
MAPPING LAYER
├── Semantic Model Mappings
│   ├── Entity → Table
│   ├── Observation → Column
│   └── Measure → DAX Measure
│
├── Power Automate Mappings
│   ├── Process Step → Flow
│   └── Trigger → Event
│
└── Gap Analysis
    ├── Unmapped entities
    ├── Missing measures
    └── Process steps without automation
```

---

## Complete Schema

```
PERSPECTIVE
├── ID
├── Name
├── Purpose
├── Primary Concern
├── Typical Actors []
├── Typical Entities []
├── Consumes From Perspectives []
└── Feeds Perspectives []

ENTITY
├── ID
├── Name
├── Core Attributes []
└── Lenses []
    ├── Perspective
    ├── Interpretation
    └── Derived Attributes []

SYSTEM
├── ID
├── Name
├── Type: ERP | MES | WMS | Spreadsheet | Manual | BI | Other
├── Vendor: SAP | Microsoft | Oracle | Custom | N/A
├── Reliability Default: High | Medium | Low
├── Integration Status: Connected | Planned | Manual Extract | None
└── Notes

OBSERVATION
├── ID
├── Name
├── Entity
├── System
├── Source Actor
├── Reliability: High | Medium | Low
├── Volatility: Point-in-time | Accumulating | Continuous
└── Notes

MEASURE
├── ID
├── Name
├── Input Observations []
├── Input Measures []
├── Logic
├── Delivers Metrics []
└── Relevant To Perspectives []

METRIC
├── ID
├── Name
├── Business Question
├── Calculated By Measures []
└── Relevant To Perspectives []

PROCESS
├── ID
├── Name
└── Steps []
    ├── Sequence
    ├── Name
    ├── Perspective
    ├── Actor
    ├── Consumes Observations []
    ├── Produces Observations []
    ├── Uses Metrics []
    ├── Crystallizes Observations []
    └── Depends On Steps []

MAPPING (separate layer)
├── Entity Mappings []
│   ├── Entity ID
│   ├── Semantic Table
│   └── Status: Mapped | Partial | Gap
├── Observation Mappings []
│   ├── Observation ID
│   ├── Semantic Column
│   └── Status
├── Measure Mappings []
│   ├── Measure ID
│   ├── DAX Measure
│   └── Status
└── Process Mappings []
    ├── Step ID
    ├── Power Automate Flow
    └── Status
```

---

## Roadmap Vision

### Phase 1: Documentation
"Here's how our finance function works and what data supports it"
- Visual ontology navigation
- Three perspective views
- Entity/observation/measure/metric relationships

### Phase 2: Requirements Builder
"Customer X has these processes, they need these metrics, therefore they need this semantic model structure"
- Reference ontology (best practice)
- Customer-specific mapping
- Gap identification

### Phase 3: AI-Assisted Optimization
"Based on patterns across customers, here's the recommended to-be state"
- Cross-customer pattern analysis
- Automated recommendations
- Target state generation

---

## Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entity modeling | One entity with perspective lenses | Single source of truth, avoids redundancy |
| Perspectives in schema | Tags on measures/metrics, not structural | Accurate representation while supporting clean UI |
| System tracking | First-class entity | Supports integration planning and gap analysis |
| Metric as anchor | Requirements flow backwards from metrics | Matches how business actually thinks |
| Crystallization | Property of process step, not observation | Same observation crystallizes at different times for different processes |
| Semantic model linkage | Separate mapping layer | Keeps ontology technology-agnostic, supports gap analysis |
| Thresholds/targets | Excluded | Implementation detail, not ontology concern |
| Actor modeling | String label (for now) | Keep simple unless functional need emerges |

---

## Example: Month-End Close in Manufacturing

See EXAMPLE_MONTH_END.md for full worked example.
