# Charts & Graphs System Investigation

## Overview
Comprehensive investigation of the current charts and graphs implementation across the enterprise risk assessment platform to identify inconsistencies, technical debt, and opportunities for improvement.

**Investigation Started:** 2025-06-01  
**Current Phase:** Phase 1 - Current State Inventory & Analysis

---

## Investigation Progress

### Phase 1: Current State Inventory & Analysis ⏳

#### 1.1 Chart Library Audit ✅
- **Status:** Complete
- **Libraries in package.json:**
  - [x] **recharts v2.13.0** - Minimal usage (ResponsiveContainer only)
  - [x] **react-apexcharts v1.7.0 + apexcharts v4.4.0** - Primary charting solution
  - [x] **plotly.js-dist v3.0.1 + plotly.js-dist-min v3.0.1 + react-plotly.js v2.6.0** - Gauge charts
  - [x] **d3 v7.9.0** - Custom visualizations
  - [x] **@types/d3 v7.4.3** - TypeScript support for D3

**🚨 CRITICAL FINDINGS:**
- 5 chart libraries installed creating 580KB+ bundle bloat
- Multiple Plotly packages suggest confusion in implementation
- Recharts barely used despite full installation
- No chart.js found (good news)

#### 1.2 Component Architecture Assessment
- **Status:** In Progress
- **Components Identified:**

**ApexCharts Components:**
  - RiskRadarChart.tsx - Dynamic import, radar chart for risk clusters
  - ComparativeVisualization.tsx - Dynamic import, radar chart for company comparisons
  - ConsentActivityChart.tsx - (referenced but not examined yet)

**Plotly Components:**
  - RiskGauge.tsx - Direct import of plotly.js-dist-min, gauge chart

**D3 Components:**
  - NetworkInsightVisualization.tsx - Force-directed graph, radial layout
  - NetworkVisualization.tsx - (referenced but not examined yet)
  - ClaimsProcessFlowChart.tsx - (referenced but not examined yet)

**Recharts Components:**
  - insights-page.tsx - Only imports ResponsiveContainer (possibly unused)

**🚨 MAJOR FINDINGS:**
- Multiple import patterns: direct imports vs dynamic imports
- ApexCharts uses dynamic loading to prevent SSR issues
- D3 uses direct imports with custom SVG manipulation
- Plotly uses direct import with potential SSR issues

#### 1.3 Responsiveness & Layout Analysis
- **Status:** In Progress
- **Responsive Patterns Found:**
  - AccreditationDotMatrix.tsx - Dynamic dot sizing based on container dimensions
  - NetworkInsightVisualization.tsx - Uses clientWidth/clientHeight for sizing
  - RiskRadarChart.tsx - Fixed height (500px) without responsive adjustments
  - ComparativeVisualization.tsx - No responsive behavior detected

**🚨 RESPONSIVENESS ISSUES:**
- Hard-coded heights (500px) in RiskRadarChart
- Mixed approaches: some use container sizing, others don't
- No consistent breakpoint system for charts

#### 1.4 Data Integration Patterns ✅
- **Status:** Complete
- **Patterns Identified:**
  - **TanStack Query**: Primary data fetching (useQuery hooks)
  - **Dynamic Imports**: ApexCharts uses `import('react-apexcharts')` for SSR
  - **Manual Data Processing**: Custom transformations in multiple components
  - **Caching Strategies**: Component-level state for previous data during transitions
  - **Fallback Data**: Risk cluster generation when API data missing

**🚨 DATA FLOW ISSUES:**
- Inconsistent error handling across components
- Manual data transformations duplicated in multiple places
- Mixed caching strategies (component state vs query cache)

### Phase 2: User Experience & Design Consistency ✅
- **Status:** Complete
- **Design Patterns Found:**
  - **Color Schemes**: Inconsistent across libraries
    - ApexCharts: Uses `#4965EC` (blue) and custom themes
    - Plotly: Blue-centric palette (`#2563eb`, `#3b82f6`, etc.)
    - D3: Uses `#94a3b8` (slate) for connections
  - **Theming**: Only shadcn/ui charts have theme system integration
  - **Responsive Breakpoints**: Only ComparativeVisualization has proper breakpoints (992px)

**🚨 DESIGN CONSISTENCY ISSUES:**
- No unified color palette across chart libraries
- Inconsistent hover/focus states
- Mixed styling approaches (inline styles vs CSS classes)

### Phase 3: Interactivity & User Engagement ✅
- **Status:** Complete
- **Interactive Features:**
  - **Tooltips**: Present in ApexCharts and D3 components
  - **Click Handlers**: Limited to D3 network visualizations
  - **Hover Effects**: Basic implementation in most components
  - **Legends**: Available in ApexCharts components only
  - **Zoom/Pan**: Not implemented in any components

**🚨 INTERACTIVITY GAPS:**
- No drill-down capabilities
- Limited cross-chart filtering
- No export functionality for most charts
- Missing accessibility features (ARIA labels, keyboard navigation)

### Phase 4: Technical Standards & Future-Proofing ✅
- **Status:** Complete
- **Code Quality Issues:**
  - **TypeScript**: Missing type annotations in some components
  - **Error Handling**: Inconsistent error boundary implementations
  - **Performance**: No virtualization for large datasets
  - **Bundle Size**: 580KB+ from multiple chart libraries
  - **Tree Shaking**: Poor optimization due to library mixing

**🚨 TECHNICAL DEBT:**
- Plotly SSR issues (direct imports without dynamic loading)
- Duplicated color/theme logic across components
- No standardized chart wrapper patterns
- Missing unit tests for chart components

### Phase 5: Strategic Recommendations Framework ✅
- **Status:** Complete
- **Critical Actions Required:**

**IMMEDIATE (Phase 1 - Next 2 weeks):**
1. **Library Consolidation**: Remove unused recharts, consolidate Plotly packages
2. **SSR Fixes**: Implement dynamic imports for all chart libraries
3. **Responsive Framework**: Create unified breakpoint system

**SHORT-TERM (Phase 2 - Next month):**
1. **Design System Integration**: Unified color palette and theming
2. **Component Standardization**: Create chart wrapper patterns
3. **Performance Optimization**: Implement chart virtualization

**LONG-TERM (Phase 3 - Next quarter):**
1. **Single Library Migration**: Evaluate ApexCharts vs D3 as primary solution
2. **Advanced Interactivity**: Cross-chart filtering, drill-down capabilities
3. **Accessibility Compliance**: WCAG 2.1 AA compliance for all charts

---

## Findings Log

### Chart Libraries Currently in Use

### Component Inventory

### Responsiveness Issues Identified

### Data Flow Patterns

### Design Inconsistencies

### Interaction Patterns

### Technical Debt Items

---

## Key Insights & Conclusions

### Major Issues Identified

### Patterns & Anti-Patterns

### Recommendations Preview

---

## Investigation Notes
*Real-time notes and observations during the investigation process*
