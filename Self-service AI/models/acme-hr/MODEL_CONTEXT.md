# ACME HR Solutions - HR Analytics Model Context

## Client Overview
ACME HR Solutions is a mid-size professional services firm (~2,500 employees across 8 business units). Their HR Analytics model tracks workforce metrics including headcount, turnover, hiring, and diversity. The model supports executive dashboards used by VP-level leadership and HR business partners for quarterly business reviews and D&I reporting.

## Business Purpose
This model provides workforce analytics for strategic HR decision-making. Key use cases:
- Monthly headcount and turnover tracking by business unit and region
- Year-over-year trend analysis for hiring, separations, and retention
- Diversity and inclusion reporting by gender, ethnicity, and age group
- Bad hire identification (employees terminated within 60 days)
- Tenure and age distribution analysis

## Key Tables and Relationships
- **Employee** - Fact table containing one row per employee per reporting period
  - Links to Date (date → Date.Date)
  - Links to BU (BU → BU.BU)
  - Links to FP (FP → FP.FP) — Financial Period
  - Links to Gender (Gender → Gender.ID)
  - Links to Ethnicity (EthnicGroup → Ethnicity.'Ethnic Group')
  - Links to PayType (PayTypeID → PayType.PayTypeID)
  - Links to AgeGroup (AgeGroupID → AgeGroup.AgeGroupID)
  - Links to SeparationReason (TermReason → SeparationReason.SeparationTypeID)
- **Date** - Date dimension with PeriodNumber for snapshot filtering
- **BU** - Business Unit dimension with Region hierarchy (BU → Region → VP)
- **FP** - Financial Period dimension
- **Gender** - Gender dimension
- **Ethnicity** - Ethnicity/Ethnic Group dimension
- **PayType** - Pay type dimension (hourly, salary, etc.)
- **AgeGroup** - Age group bucketing dimension
- **SeparationReason** - Termination reason dimension

## Existing Measures (all on Employee table)
### Core Headcount
- **EmpCount** - Period-end employee count (filtered to max PeriodNumber)
- **Actives** - Active employees (no termination date)
- **Seps** - Separations (employees with termination date)
- **New Hires** - Sum of isNewHire flag

### Time Intelligence (SPLY = Same Period Last Year)
- **EmpCount SPLY**, **Actives SPLY**, **Seps SPLY**, **New Hires SPLY**, **Bad Hires SPLY**
- **Seps YoY Var**, **Actives YoY Var**, **New Hires YoY Var**, **Bad Hires YoY Var** — absolute variance
- **Seps YoY % Change**, **Actives YoY % Change**, **New Hires YoY % Change**, **Bad Hires YoY % Change** — percentage change

### Calculated Ratios
- **TO %** - Turnover rate (Seps / Actives)
- **TO % Norm** - Normalized turnover (removes Gender/Ethnicity filters for benchmarking)
- **TO % Var** - Variance from normalized turnover
- **Sep%ofActive** - Separation percentage of actives
- **Sep%ofSMLYActives** - SPLY separation percentage
- **BadHire%ofActives** - Bad hire rate
- **BadHire%ofActiveSPLY** - SPLY bad hire rate

### Other
- **AVG Tenure Days**, **AVG Tenure Months**, **AVG Age**
- **Sum of BadHires** - Employees terminated within 60 days of hire
- **Count of BU** (on BU table), **Count of Date** (on Date table)

## Computed Columns (Employee table)
- **AgeGroupID** - Age bucketing (18-25, 26-35, 36-45, 46-55, 55+)
- **TenureDays** - Days between HireDate and TermDate (or today)
- **isNewHire** - Flag: 1 if hired in current period
- **BadHires** - Flag: 1 if terminated within 60 days of hire

## Naming Conventions
- Use single quotes for measure names with spaces: 'New Hires'
- Time intelligence suffix pattern: base → base SPLY → base YoY Var → base YoY % Change
- Percentage measures use "%" in the name
- Use DIVIDE() for all ratio measures
- Turnover-related measures use "TO" abbreviation

## Display Folder Organization
- Root level: Core headcount measures
- Time intelligence measures follow the naming convention (no separate folder)

## Format Strings
- Whole numbers: `#,0`
- Percentages: `#,0.0%;-#,0.0%;#,0.0%`
- General numbers: `{"isGeneralNumber":true}` annotation

## Business Rules
- Employee count is always filtered to the maximum PeriodNumber (period-end snapshot)
- Active = no TermDate (ISBLANK check)
- Separation = has TermDate (NOT ISBLANK check)
- Bad Hire = terminated within 60 days of hire date
- Turnover normalization removes Gender and Ethnicity filters (for fair comparison)
- SAMEPERIODLASTYEAR is the standard time intelligence function
- Date table uses Date column as the primary date field
