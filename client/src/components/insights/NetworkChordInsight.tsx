/**
 * ========================================
 * Network Chord Insight - Relationship Flow Analysis
 * ========================================
 * 
 * Interactive chord diagram visualization showing relationship flows between
 * different company categories, risk levels, and accreditation statuses.
 * Features dynamic filtering, flow analysis, and detailed interaction metrics.
 * 
 * Key Features:
 * - Circular layout showing relationship flows between categories
 * - Arc thickness represents relationship volume
 * - Color coding by company type and risk level
 * - Interactive hover effects with flow highlighting
 * - Filtering by relationship type and status
 * - Detailed flow statistics and insights
 * - Smooth D3 transitions and animations
 * 
 * @module components/insights/NetworkChordInsight
 * @version 1.0.0
 * @since 2025-06-09
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Loader2, Filter, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChordNode {
  id: string;
  name: string;
  category: string;
  color: string;
  value: number;
  relationships: number;
}

interface ChordFlow {
  source: string;
  target: string;
  value: number;
  relationshipType: string;
  avgRiskScore: number;
}

interface ChordFilters {
  relationshipTypes: string[];
  riskLevels: string[];
  accreditationStatus: string[];
}

interface NetworkChordInsightProps {
  className?: string;
}

const categoryColors = {
  'Bank': '#8A4FE0',
  'FinTech': '#48BB78',
  'Invela': '#4965EC',
  'Unknown': '#64748b'
};

const riskLevelColors = {
  'Low Risk': '#22c55e',
  'Medium Risk': '#f59e0b',
  'High Risk': '#ef4444',
  'Critical Risk': '#dc2626'
};

export function NetworkChordInsight({ className }: NetworkChordInsightProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewMode, setViewMode] = useState<'category' | 'risk'>('category');
  const [selectedFlow, setSelectedFlow] = useState<ChordFlow | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [filters, setFilters] = useState<ChordFilters>({
    relationshipTypes: [],
    riskLevels: [],
    accreditationStatus: []
  });

  // Fetch network relationships data
  const { data: networkData, isLoading } = useQuery<any>({
    queryKey: ['/api/relationships/network'],
    enabled: true
  });

  // Extract relationships from network data
  const relationships = networkData?.nodes || [];

  // Process chord data
  const chordData = useMemo(() => {
    if (!relationships) return { nodes: [], flows: [], matrix: [] };

    // Group by view mode
    const groupKey = viewMode === 'category' ? 'category' : 'riskLevel';
    
    // Create nodes based on grouping
    const nodeMap = new Map<string, ChordNode>();
    const flowMap = new Map<string, ChordFlow>();

    relationships.forEach((rel: any) => {
      const relType = rel.relationshipType || 'data_provider';
      const riskScore = rel.riskScore || 0;
      const accredStatus = rel.accreditationStatus || 'PENDING';
      const category = rel.category || 'FinTech';
      
      // Apply filters
      const matchesRelType = filters.relationshipTypes.length === 0 || 
        filters.relationshipTypes.includes(relType);
      const riskLevel = getRiskLevel(riskScore);
      const matchesRisk = filters.riskLevels.length === 0 || 
        filters.riskLevels.includes(riskLevel);
      const matchesAccreditation = filters.accreditationStatus.length === 0 || 
        filters.accreditationStatus.includes(accredStatus);

      if (!matchesRelType || !matchesRisk || !matchesAccreditation) return;

      // Determine grouping - Invela (center) connects to all network companies
      let sourceGroup, targetGroup;
      
      if (viewMode === 'category') {
        sourceGroup = 'Invela';
        targetGroup = category;
      } else {
        sourceGroup = 'Low Risk'; // Invela is low risk
        targetGroup = riskLevel;
      }

      // Create/update nodes
      if (!nodeMap.has(sourceGroup)) {
        nodeMap.set(sourceGroup, {
          id: sourceGroup,
          name: sourceGroup,
          category: sourceGroup,
          color: viewMode === 'category' ? 
            categoryColors[sourceGroup] || categoryColors.Unknown :
            riskLevelColors[sourceGroup] || '#64748b',
          value: 0,
          relationships: 0
        });
      }

      if (!nodeMap.has(targetGroup)) {
        nodeMap.set(targetGroup, {
          id: targetGroup,
          name: targetGroup,
          category: targetGroup,
          color: viewMode === 'category' ? 
            categoryColors[targetGroup] || categoryColors.Unknown :
            riskLevelColors[targetGroup] || '#64748b',
          value: 0,
          relationships: 0
        });
      }

      // Update node values
      const sourceNode = nodeMap.get(sourceGroup)!;
      const targetNode = nodeMap.get(targetGroup)!;
      sourceNode.value += 1;
      targetNode.value += 1;
      sourceNode.relationships += 1;
      targetNode.relationships += 1;

      // Create/update flows
      const flowKey = `${sourceGroup}->${targetGroup}`;
      if (!flowMap.has(flowKey)) {
        flowMap.set(flowKey, {
          source: sourceGroup,
          target: targetGroup,
          value: 0,
          relationshipType: rel.relationshipType,
          avgRiskScore: 0
        });
      }

      const flow = flowMap.get(flowKey)!;
      flow.value += 1;
      flow.avgRiskScore = (flow.avgRiskScore * (flow.value - 1) + (rel.sourceRiskScore || 0)) / flow.value;
    });

    const nodes = Array.from(nodeMap.values());
    const flows = Array.from(flowMap.values());

    // Create matrix for chord diagram
    const nodeIndices = new Map(nodes.map((node, i) => [node.id, i]));
    const matrix = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(0));

    flows.forEach(flow => {
      const sourceIndex = nodeIndices.get(flow.source);
      const targetIndex = nodeIndices.get(flow.target);
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        matrix[sourceIndex][targetIndex] = flow.value;
      }
    });

    return { nodes, flows, matrix };
  }, [relationships, viewMode, filters]);

  const getRiskLevel = (score: number): string => {
    if (score === 0) return 'No Risk';
    if (score <= 33) return 'Low Risk';
    if (score <= 66) return 'Medium Risk';
    if (score <= 99) return 'High Risk';
    return 'Critical Risk';
  };

  // D3 Chord Visualization
  useEffect(() => {
    if (!svgRef.current || chordData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 600;
    const innerRadius = Math.min(width, height) * 0.35;
    const outerRadius = innerRadius + 20;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create chord layout
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending);

    const chords = chord(chordData.matrix);

    // Create arc generator
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    // Create ribbon generator
    const ribbon = d3.ribbon()
      .radius(innerRadius);

    // Add gradients for ribbons
    const defs = svg.append('defs');
    
    chords.forEach((chord, i) => {
      const sourceColor = chordData.nodes[chord.source.index]?.color || '#64748b';
      const targetColor = chordData.nodes[chord.target.index]?.color || '#64748b';
      
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse');
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', sourceColor)
        .attr('stop-opacity', 0.7);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', targetColor)
        .attr('stop-opacity', 0.7);
    });

    // Draw ribbons (flows)
    const ribbons = g.append('g')
      .selectAll('.ribbon')
      .data(chords)
      .enter()
      .append('path')
      .attr('class', 'ribbon')
      .attr('d', ribbon)
      .attr('fill', (d, i) => `url(#gradient-${i})`)
      .attr('stroke', 'none')
      .attr('opacity', 0.6)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 0.9);
        
        const sourceNode = chordData.nodes[d.source.index];
        const targetNode = chordData.nodes[d.target.index];
        const flow = chordData.flows.find(f => 
          f.source === sourceNode.id && f.target === targetNode.id
        );
        setSelectedFlow(flow || null);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.6);
        setSelectedFlow(null);
      });

    // Draw arcs (nodes)
    const arcs = g.append('g')
      .selectAll('.arc')
      .data(chords.groups)
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => chordData.nodes[d.index]?.color || '#64748b')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 3);
        setHoveredNode(chordData.nodes[d.index]?.id || null);
        
        // Highlight related ribbons
        ribbons.attr('opacity', ribbon => {
          return (ribbon.source.index === d.index || ribbon.target.index === d.index) ? 0.9 : 0.2;
        });
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 2);
        setHoveredNode(null);
        ribbons.attr('opacity', 0.6);
      });

    // Add labels
    arcs.append('text')
      .each(d => {
        d.angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr('dy', '.35em')
      .attr('transform', d => `
        rotate(${(d.angle * 180 / Math.PI - 90)})
        translate(${outerRadius + 10})
        ${d.angle > Math.PI ? 'rotate(180)' : ''}
      `)
      .style('text-anchor', d => d.angle > Math.PI ? 'end' : null)
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(d => chordData.nodes[d.index]?.name || '');

  }, [chordData]);

  const toggleFilter = (filterType: keyof ChordFilters, value: any) => {
    setFilters(prev => {
      const currentArray = prev[filterType] as any[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [filterType]: newArray };
    });
  };

  const resetFilters = () => {
    setFilters({
      relationshipTypes: [],
      riskLevels: [],
      accreditationStatus: []
    });
  };

  const totalRelationships = chordData.flows.reduce((sum, flow) => sum + flow.value, 0);

  if (isLoading) {
    return (
      <Card className={cn("w-full h-[700px] flex items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Network Relationship Flow</CardTitle>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as any)}>
              <ToggleGroupItem value="category">Category</ToggleGroupItem>
              <ToggleGroupItem value="risk">Risk Level</ToggleGroupItem>
            </ToggleGroup>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Relationship Types</DropdownMenuLabel>
                {['partnership', 'supplier', 'client', 'integration'].map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={filters.relationshipTypes.includes(type)}
                    onCheckedChange={() => toggleFilter('relationshipTypes', type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Risk Levels</DropdownMenuLabel>
                {['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'].map(level => (
                  <DropdownMenuCheckboxItem
                    key={level}
                    checked={filters.riskLevels.includes(level)}
                    onCheckedChange={() => toggleFilter('riskLevels', level)}
                  >
                    {level}
                  </DropdownMenuCheckboxItem>
                ))}
                
                <DropdownMenuSeparator />
                <Button onClick={resetFilters} variant="ghost" size="sm" className="w-full">
                  Reset Filters
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Hover over arcs to highlight relationships. Ribbon thickness shows connection volume.
        </p>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chord Diagram */}
          <div className="lg:col-span-2">
            <div className="w-full h-[600px] flex items-center justify-center">
              <svg
                ref={svgRef}
                className="w-full h-full"
                style={{ maxHeight: '600px' }}
              />
            </div>
          </div>
          
          {/* Info Panel */}
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Network Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Relationships:</span>
                  <span className="font-medium">{totalRelationships}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active {viewMode === 'category' ? 'Categories' : 'Risk Levels'}:</span>
                  <span className="font-medium">{chordData.nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Flow Connections:</span>
                  <span className="font-medium">{chordData.flows.length}</span>
                </div>
              </div>
            </div>

            {/* Hovered Node Info */}
            {hoveredNode && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">{hoveredNode}</h4>
                {(() => {
                  const node = chordData.nodes.find(n => n.id === hoveredNode);
                  return node ? (
                    <div className="space-y-1 text-sm text-blue-800">
                      <div>Relationships: {node.relationships}</div>
                      <div>Total Value: {node.value}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Selected Flow Info */}
            {selectedFlow && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Relationship Flow</h4>
                <div className="space-y-1 text-sm text-green-800">
                  <div><strong>From:</strong> {selectedFlow.source}</div>
                  <div><strong>To:</strong> {selectedFlow.target}</div>
                  <div><strong>Volume:</strong> {selectedFlow.value} relationships</div>
                  <div><strong>Type:</strong> {selectedFlow.relationshipType}</div>
                  <div><strong>Avg Risk:</strong> {selectedFlow.avgRiskScore.toFixed(1)}</div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Legend</h4>
              <div className="space-y-2">
                {chordData.nodes.map(node => (
                  <div key={node.id} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: node.color }}
                    />
                    <span>{node.name}</span>
                    <span className="text-muted-foreground">({node.relationships})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}