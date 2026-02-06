# Business Ontology Methodology

A practical workshop-based approach for building ontologies with customers.

## Overview

Building a business ontology requires **both top-down and bottom-up approaches**:
- **Top-down**: Start with business questions and strategic metrics
- **Bottom-up**: Map current operational processes and data sources
- **Connect**: Link them together to find gaps and waste

This prevents both "boiling the ocean" (too much detail) and "ivory tower" (disconnected from reality).

---

## The Two-Phase Approach

### Phase 1: Top-Down (Strategic Intent)

**Goal:** Define what the business needs to know

**Session:** 2 hours with executives/managers

**Steps:**

1. **Identify Business Questions**
   ```
   "What do you need to know about the business?"

   Examples:
   - Are we on budget this quarter?
   - Is our portfolio healthy?
   - Are projects delivering on time?
   - What's our production efficiency?
   ```

2. **Define Metrics**
   For each business question, define the metric that answers it:
   ```json
   {
     "id": "budget_variance",
     "name": "Budget vs Actuals Variance",
     "business_question": "Are we on budget this quarter?",
     "calculated_by_measure_ids": ["forecast_vs_actuals"]
   }
   ```

3. **Identify Required Measures**
   How will we calculate each metric?
   ```json
   {
     "id": "forecast_vs_actuals",
     "name": "Forecast vs Actuals Variance",
     "calculation": "SUM(Forecasted Revenue) - SUM(Actual Revenue)",
     "input_attribute_ids": ["forecasted_revenue", "actual_revenue"]
   }
   ```

4. **List Required Attributes**
   What data elements do we need?
   ```
   - Forecasted Revenue
   - Actual Revenue
   - Project ID
   - Period (Month/Quarter)
   - Resource Allocation
   - Project Burn Rate
   ```

**Output:** Clear "demand signal" - these attributes are NEEDED by the business.

**Stop here.** Don't try to figure out where data comes from yet.

---

### Phase 2: Bottom-Up (Current Reality)

**Goal:** Map how work actually happens today

**Session:** 2-3 hours with operational teams

**Steps:**

1. **Map Operational Processes**
   Start with the execution layer - what work gets done?
   ```
   Examples:
   - Deliver Project Milestone
   - Complete Sprint
   - Execute Production Order
   - Process Customer Order
   ```

2. **Identify Attributes Produced**
   What data does each process create?
   ```json
   {
     "process": "Deliver Project Milestone",
     "produces_attribute_ids": [
       "milestone_completion_flag",
       "actual_completion_date",
       "deliverables_accepted"
     ]
   }
   ```

3. **Identify Systems Used**
   What tools are involved?
   ```json
   {
     "step": "Record Milestone Completion",
     "systems_used_ids": ["jira", "excel"],
     "manual_effort_percentage": 60,
     "waste_category": "Manual Data Entry, System Switching"
   }
   ```

4. **Document Pain Points**
   Where is the execution work manual, wasteful, or painful?
   - High manual effort percentage
   - System switching
   - Shadow systems (Excel bypassing proper tools)
   - Physical media (paper forms)
   - Manual verification

**Output:** As-is process map with:
- What attributes are actually produced
- What systems are actually used
- Where the pain points are

---

### Phase 3: Connect & Fill Gaps

**Goal:** Link demand with supply, identify gaps

**Session:** 2 hours with cross-functional team

**Steps:**

1. **Cross-Reference Phase 1 & Phase 2**

   For each required attribute from Phase 1:
   - ✅ **Found in Phase 2**: Attribute is produced by a process → Good!
   - ❌ **Missing from Phase 2**: No process produces it → GAP!

   For each attribute produced in Phase 2:
   - ✅ **Used in Phase 1**: Feeds a measure → Valuable!
   - ⚠️ **Unused in Phase 1**: No measure uses it → Potential waste!

2. **Design Management Processes**

   Management processes sit between Operational and Financial:
   - **Consume**: Operational attributes (execution data)
   - **Transform**: Into decisions and optimizations
   - **Produce**: Management attributes (resource allocations, schedules, approvals)

   Example:
   ```json
   {
     "id": "allocate_resources",
     "name": "Allocate Resources to Projects",
     "perspective_id": "management",
     "consumes_attribute_ids": [
       "project_stage",
       "resource_availability",
       "project_completion_pct"
     ],
     "produces_attribute_ids": ["resource_allocation"],
     "uses_metric_ids": ["portfolio_health"]
   }
   ```

3. **Design Financial Processes**

   Financial processes consolidate everything into forecasts/reports:
   - **Consume**: Both Operational AND Management attributes
   - **Transform**: Into financial projections and actuals
   - **Produce**: Financial attributes (forecasts, actuals, variances)

   Example:
   ```json
   {
     "id": "create_financial_forecast",
     "name": "Create Financial Forecast",
     "perspective_id": "financial",
     "consumes_attribute_ids": [
       "resource_allocation",
       "project_burn_rate",
       "expected_revenue"
     ],
     "produces_attribute_ids": [
       "forecasted_revenue",
       "forecasted_costs"
     ],
     "systems_used_ids": ["excel", "miruka", "jira"],
     "manual_effort_percentage": 80,
     "waste_category": "Manual Data Entry, System Switching"
   }
   ```

4. **Identify and Prioritize Gaps**

   **Type 1: Missing Supply**
   - Metric needs "Forecasted Revenue"
   - No process produces it
   - **Action**: Design process or acquire system to produce it

   **Type 2: Unused Supply**
   - Process produces "Daily Standup Notes"
   - No measure uses it
   - **Action**: Either create measure or stop collecting the data (waste)

   **Type 3: Shadow Systems**
   - Process uses Excel instead of proper system
   - Creates version control nightmares
   - **Action**: Either integrate proper system or formalize Excel workflow

   **Type 4: High Manual Effort**
   - Process has 80%+ manual effort
   - Feeds critical financial forecast
   - **Action**: High-priority automation opportunity

**Output:** Complete connected ontology with clear improvement priorities.

---

## Workshop Sequence Summary

### Session 1: Strategic Intent (2 hours)
**Attendees:** Executives, Finance, Management
**Deliverable:** 5-10 key metrics with required attributes

### Session 2: Current Reality (2-3 hours)
**Attendees:** Operational teams, System owners
**Deliverable:** As-is process map with pain points

### Session 3: Connect & Design (2 hours)
**Attendees:** Cross-functional (Mix of Session 1 & 2)
**Deliverable:** Complete ontology with gap analysis

---

## Why This Works

### Top-Down Alone Fails
- People can't articulate needs without seeing current state
- Misses hidden reality (shadow systems, workarounds)
- Creates "ivory tower" requirements

### Bottom-Up Alone Fails
- Gets lost in operational details
- No clear connection to business value
- Hard to prioritize improvements

### Hybrid Approach Succeeds
- Strategic goals provide focus
- Operational reality provides grounding
- Gaps become obvious when you try to connect them
- Can quantify value: "This 80% manual process feeds our $10M revenue forecast"

---

## Finance Blueprint Processes

Finance processes follow well-trodden paths. Use these blueprints as starting points:

### 1. Month-End Close (Monthly)
**Steps:**
- Production/Operational cutoff
- Inventory cutoff and physical count
- Reconciliations (GR/IR, inventory, scrap)
- Valuations (WIP, inventory, revaluations)
- Settlements and period close
- Management review

**Typical Pain Points:**
- Physical inventory count (90% manual, paper → Excel → WMS)
- Manual reconciliations (70% manual, Excel-heavy)
- System switching (ERP → Excel → CMMS → QMS)

### 2. Cost Calculation Run (Monthly)
**Steps:**
- Update standard costs
- Calculate material price variances
- Roll up BOM costs
- Post to controlling area

### 3. Variance Analysis (Monthly)
**Steps:**
- Extract production order variances
- Categorize by type (price, yield, efficiency)
- Identify trends and root causes
- Report to management

### 4. Quarterly Forecast (Quarterly)
**Steps:**
- Consolidate production/project plans
- Calculate material requirements
- Forecast COGS and inventory levels
- Review and adjust with management
- Finalize and report to executives

**Typical Pain Points:**
- Excel consolidation from multiple sources (80% manual)
- Data quality issues from shadow systems
- Version control nightmares

### 5. Annual Budget Planning (Yearly)
**Steps:**
- Set production/project volume targets
- Establish cost standards and rates
- Define capital expenditure plan
- Build budget model in Excel
- Iterate with management and executives
- Lock down final budget

---

## Blueprint Management Measures

Standard measures that feed Finance processes:

### Operational Efficiency
- **OEE** (Overall Equipment Effectiveness)
- **Production Efficiency %** (Actual vs Standard hours)
- **First-Pass Yield %** (Good units / Total units)
- **Scrap Rate %** (Scrapped / Total produced)

### Resource Utilization
- **Labor Utilization %** (Billable hours / Total hours)
- **Machine Utilization %** (Runtime / Available time)
- **Resource Allocation %** (Allocated / Capacity)

### Quality & Performance
- **Quality Score** (Weighted quality metrics)
- **On-Time Delivery %** (Delivered on time / Total deliveries)
- **Cycle Time vs Standard** (Actual / Planned)

### Inventory & Supply Chain
- **Inventory Turns** (COGS / Average inventory)
- **Days Inventory Outstanding** (365 / Inventory turns)
- **Supplier On-Time Delivery %**

These measures:
- **Consume** Operational attributes (from execution)
- **Feed** Financial processes (forecasts, variance analysis)
- **Highlight** waste and improvement opportunities

---

## Best Practices

### 1. Start Small
- Begin with ONE critical business question
- Trace it all the way down to operational processes
- Prove the value before expanding

### 2. Show the Pain
- Use execution metadata (manual_effort_percentage, waste_category)
- Quantify cost: "This manual process costs 40 hours/month = $X,XXX/year"
- Link to business impact: "Delays our close by 2 days"

### 3. Use Real Examples
- Don't ask "What data do you need?"
- Ask "Show me how you created last month's forecast"
- Walk through actual Excel files and system screens

### 4. Focus on Integration Points
- Where does Sales hand off to Operations?
- Where does Operations hand off to Finance?
- These handoffs are where data quality breaks down

### 5. Embrace the Mess
- Document shadow systems (Excel, Access databases)
- Show double-entry (same data in multiple systems)
- Capture manual workarounds
- This is valuable truth, not something to hide

### 6. Validate with Data
- Don't just ask what systems are used
- Look at actual data sources for reports
- Find the hidden Excel files
- Discover the undocumented integrations

---

## Common Pitfalls

### ❌ Starting with Systems
"What data is in SAP?" → Gets technical too fast

### ✅ Start with Questions
"What do you need to know?" → Stays business-focused

---

### ❌ Assuming Clean Processes
"There must be a system that tracks this" → Denial

### ✅ Finding the Reality
"Show me your actual Excel file" → Truth

---

### ❌ Ignoring Manual Work
"This is automated in the system" → Missing 80% of effort

### ✅ Measuring Manual Effort
"How long does this step take you?" → Reality

---

### ❌ Optimizing Too Early
"We should automate this!" → Premature

### ✅ Understanding First
"Why is this manual?" → Root cause

---

## Success Criteria

You know your ontology is good when:

1. ✅ Every metric traces to source systems
2. ✅ Every process step shows execution burden
3. ✅ Shadow systems are documented
4. ✅ Gaps are identified and prioritized
5. ✅ Business team sees value
6. ✅ IT team knows what to build
7. ✅ Everyone agrees on priorities

---

## Next Steps

After building the ontology:

1. **Generate Power BI Semantic Model**
   - Use attribute list as column list
   - Use measures as DAX measures
   - Use entity lenses to design fact tables
   - Use relationships from entity links

2. **Prioritize Process Improvements**
   - Rank by: manual_effort_percentage × business_impact
   - Target high-manual steps feeding critical forecasts
   - Focus on eliminating system switching

3. **Design Data Integration**
   - Use attribute → system mapping as integration spec
   - Prioritize shadow system elimination
   - Build automated data pipelines

4. **Implement Incrementally**
   - Start with highest-value metric
   - Build complete lineage for that one metric
   - Prove value before expanding

5. **Maintain and Evolve**
   - Update as processes change
   - Add new metrics as business needs evolve
   - Keep execution metadata current
