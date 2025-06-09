/**
 * ========================================
 * Network Treemap Insight - Multi-Level Drill-Down
 * ========================================
 * 
 * Interactive treemap visualization providing hierarchical drill-down capabilities
 * for exploring network data across multiple dimensions. Features smooth transitions,
 * breadcrumb navigation, and intelligent space utilization.
 * 
 * Key Features:
 * - Multi-level hierarchy: Industry → Risk Level → Accreditation → Companies
 * - Interactive drill-down and drill-up navigation
 * - Size encoding: Company count or relationship volume
 * - Color encoding: Risk levels and accreditation status
 * - Breadcrumb navigation for context
 * - Smooth D3 transitions between levels
 * - Responsive layout with optimized space usage
 * 
 * @module components/insights/NetworkTreemapInsight
 * @version 1.0.0
 * @since 2025-06-09
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreemapNode {
  id: string;
  name: string;
  value: number;
  level: number;
  category?: string;
  riskLevel?: string;
  accreditationStatus?: string;
  parent?: string;
  children?: TreemapNode[];
  color?: string;
  companyCount?: number;
  relationshipCount?: number;
}

interface NetworkTreemapInsightProps {
  className?: string;
}

const riskColors = {
  'none': '#f8fafc',
  'low': '#dcfce7',
  'medium': '#fef3c7',
  'high': '#fed7d7',
  'critical': '#fecaca'
};

const categoryColors = {
  'Bank': '#8A4FE0',
  'FinTech': '#48BB78',
  'Invela': '#4965EC',
  'Default': '#64748b'
};

export function NetworkTreemapInsight({ className }: NetworkTreemapInsightProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentPath, setCurrentPath] = useState<string[]>(['root']);
  const [sizeMetric, setSizeMetric] = useState<'companies' | 'relationships'>('companies');
  const [selectedNode, setSelectedNode] = useState<TreemapNode | null>(null);

  // Fetch companies with risk data
  const { data: companies, isLoading } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    enabled: true
  });

  // Process hierarchical data
  const hierarchicalData = useMemo(() => {
    if (!companies) return null;

    // Level 0: Root
    const root: TreemapNode = {
      id: 'root',
      name: 'Network Overview',
      value: 0,
      level: 0,
      children: []
    };

    // Level 1: Company Categories
    const categoryGroups = d3.group(companies, d => d.category || 'Unknown');
    
    categoryGroups.forEach((categoryCompanies, category) => {
      const categoryNode: TreemapNode = {
        id: `cat_${category}`,
        name: category,
        value: categoryCompanies.length,
        level: 1,
        category,
        parent: 'root',
        color: categoryColors[category] || categoryColors.Default,
        companyCount: categoryCompanies.length,
        relationshipCount: categoryCompanies.reduce((sum, c) => sum + (c.relationshipCount || 0), 0),
        children: []
      };

      // Level 2: Risk Levels within Category
      const riskGroups = d3.group(categoryCompanies, d => {
        const score = d.risk_score || d.riskScore || 0;
        if (score === 0) return 'none';
        if (score <= 33) return 'low';
        if (score <= 66) return 'medium';
        if (score <= 99) return 'high';
        return 'critical';
      });

      riskGroups.forEach((riskCompanies, riskLevel) => {
        const riskNode: TreemapNode = {
          id: `risk_${category}_${riskLevel}`,
          name: `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk`,
          value: riskCompanies.length,
          level: 2,
          category,
          riskLevel,
          parent: categoryNode.id,
          color: riskColors[riskLevel],
          companyCount: riskCompanies.length,
          relationshipCount: riskCompanies.reduce((sum, c) => sum + (c.relationshipCount || 0), 0),
          children: []
        };

        // Level 3: Accreditation Status within Risk Level
        const accreditationGroups = d3.group(riskCompanies, d => d.accreditation_status || d.accreditationStatus || 'PENDING');

        accreditationGroups.forEach((accreditationCompanies, accreditationStatus) => {
          const accreditationNode: TreemapNode = {
            id: `acc_${category}_${riskLevel}_${accreditationStatus}`,
            name: accreditationStatus,
            value: accreditationCompanies.length,
            level: 3,
            category,
            riskLevel,
            accreditationStatus,
            parent: riskNode.id,
            color: accreditationStatus === 'APPROVED' ? '#22c55e' : 
                   accreditationStatus === 'PENDING' ? '#f59e0b' : '#ef4444',
            companyCount: accreditationCompanies.length,
            relationshipCount: accreditationCompanies.reduce((sum, c) => sum + (c.relationshipCount || 0), 0),
            children: []
          };

          // Level 4: Individual Companies
          accreditationCompanies.forEach(company => {
            const companyNode: TreemapNode = {
              id: `comp_${company.id}`,
              name: company.name,
              value: sizeMetric === 'companies' ? 1 : (company.relationshipCount || 1),
              level: 4,
              category,
              riskLevel,
              accreditationStatus,
              parent: accreditationNode.id,
              color: accreditationNode.color,
              companyCount: 1,
              relationshipCount: company.relationshipCount || 0
            };
            accreditationNode.children!.push(companyNode);
          });

          riskNode.children!.push(accreditationNode);
        });

        categoryNode.children!.push(riskNode);
      });

      root.children!.push(categoryNode);
    });

    // Update values based on metric
    const updateValues = (node: TreemapNode): number => {
      if (node.children && node.children.length > 0) {
        node.value = node.children.reduce((sum, child) => sum + updateValues(child), 0);
      } else {
        node.value = sizeMetric === 'companies' ? 1 : (node.relationshipCount || 1);
      }
      return node.value;
    };

    updateValues(root);
    return root;
  }, [companies, sizeMetric]);

  // Get current level data for treemap
  const currentData = useMemo(() => {
    if (!hierarchicalData) return null;

    let current = hierarchicalData;
    
    // Navigate to current path
    for (let i = 1; i < currentPath.length; i++) {
      const pathSegment = currentPath[i];
      const found = current.children?.find(child => child.id === pathSegment);
      if (found) {
        current = found;
      } else {
        break;
      }
    }

    return current;
  }, [hierarchicalData, currentPath]);

  // D3 Treemap Visualization
  useEffect(() => {
    if (!svgRef.current || !currentData || !currentData.children) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 500;
    
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Create treemap layout
    const treemap = d3.treemap<TreemapNode>()
      .size([width, height])
      .padding(2)
      .round(true);

    // Create hierarchy
    const hierarchy = d3.hierarchy<TreemapNode>(currentData)
      .sum(d => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemap(hierarchy);

    // Create cells
    const cells = svg.selectAll('.cell')
      .data(hierarchy.leaves())
      .enter()
      .append('g')
      .attr('class', 'cell')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    cells.append('rect')
      .attr('width', d => Math.max(0, (d.x1 || 0) - (d.x0 || 0)))
      .attr('height', d => Math.max(0, (d.y1 || 0) - (d.y0 || 0)))
      .attr('fill', d => d.data.color || '#e5e7eb')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .style('cursor', d => d.data.children ? 'pointer' : 'default')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1);
        setSelectedNode(d.data);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('click', function(event, d) {
        if (d.data.children && d.data.children.length > 0) {
          drillDown(d.data);
        }
      });

    // Add text labels
    cells.each(function(d) {
      const cell = d3.select(this);
      const rectWidth = Math.max(0, (d.x1 || 0) - (d.x0 || 0));
      const rectHeight = Math.max(0, (d.y1 || 0) - (d.y0 || 0));
      
      if (rectWidth > 50 && rectHeight > 30) {
        cell.append('text')
          .attr('x', rectWidth / 2)
          .attr('y', rectHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', Math.min(rectWidth / 8, rectHeight / 4, 14) + 'px')
          .style('font-weight', '600')
          .style('fill', '#1f2937')
          .style('pointer-events', 'none')
          .text(d.data.name.length > 15 ? d.data.name.substring(0, 12) + '...' : d.data.name);

        // Add value label if space allows
        if (rectHeight > 50) {
          cell.append('text')
            .attr('x', rectWidth / 2)
            .attr('y', rectHeight / 2 + 16)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', Math.min(rectWidth / 10, rectHeight / 6, 12) + 'px')
            .style('fill', '#6b7280')
            .style('pointer-events', 'none')
            .text(sizeMetric === 'companies' ? 
              `${d.data.companyCount} companies` : 
              `${d.data.relationshipCount} relationships`);
        }
      }
    });

  }, [currentData, sizeMetric]);

  const drillDown = (node: TreemapNode) => {
    if (node.children && node.children.length > 0) {
      setCurrentPath([...currentPath, node.id]);
      setCurrentLevel(currentLevel + 1);
    }
  };

  const drillUp = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
      setCurrentLevel(currentLevel - 1);
    }
  };

  const goToRoot = () => {
    setCurrentPath(['root']);
    setCurrentLevel(0);
  };

  const breadcrumbs = useMemo(() => {
    if (!hierarchicalData) return [];
    
    const crumbs = [];
    let current = hierarchicalData;
    crumbs.push({ name: current.name, id: current.id });

    for (let i = 1; i < currentPath.length; i++) {
      const pathSegment = currentPath[i];
      const found = current.children?.find(child => child.id === pathSegment);
      if (found) {
        current = found;
        crumbs.push({ name: current.name, id: current.id });
      }
    }

    return crumbs;
  }, [hierarchicalData, currentPath]);

  if (isLoading) {
    return (
      <Card className={cn("w-full h-[600px] flex items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Network Treemap Explorer</CardTitle>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={sizeMetric} onValueChange={setSizeMetric}>
              <ToggleGroupItem value="companies">Companies</ToggleGroupItem>
              <ToggleGroupItem value="relationships">Relationships</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        {/* Navigation Controls */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToRoot}
            disabled={currentPath.length <= 1}
          >
            <Home className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={drillUp}
            disabled={currentPath.length <= 1}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                {index > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={index === breadcrumbs.length - 1 ? 'font-medium text-foreground' : ''}>
                  {crumb.name}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Click rectangles to drill down into sub-categories. Size represents {sizeMetric}.
        </p>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="w-full h-[500px] flex items-center justify-center">
          <svg
            ref={svgRef}
            className="w-full h-full border rounded"
            style={{ maxHeight: '500px' }}
          />
        </div>
        
        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="font-medium">{selectedNode.name}</h4>
            <div className="text-sm text-muted-foreground mt-1">
              <div>Companies: {selectedNode.companyCount}</div>
              <div>Relationships: {selectedNode.relationshipCount}</div>
              {selectedNode.category && <div>Category: {selectedNode.category}</div>}
              {selectedNode.riskLevel && <div>Risk Level: {selectedNode.riskLevel}</div>}
              {selectedNode.accreditationStatus && <div>Status: {selectedNode.accreditationStatus}</div>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}