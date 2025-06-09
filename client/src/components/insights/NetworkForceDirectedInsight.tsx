/**
 * ========================================
 * Network Force-Directed Insight - Dynamic Clustering
 * ========================================
 * 
 * Advanced force-directed network visualization with intelligent clustering
 * algorithms that naturally group companies by similarity. Features dynamic
 * physics simulation, interactive node manipulation, and multi-dimensional analysis.
 * 
 * Key Features:
 * - D3 force simulation for natural node positioning
 * - Intelligent clustering by risk, category, and relationships
 * - Interactive node dragging and repositioning
 * - Dynamic link strength based on relationship types
 * - Zoom and pan capabilities with smooth transitions
 * - Real-time cluster analysis and statistics
 * - Advanced filtering and search functionality
 * 
 * @module components/insights/NetworkForceDirectedInsight
 * @version 1.0.0
 * @since 2025-06-09
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Loader2, Filter, Search, Play, Pause, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForceNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  category: string;
  riskScore: number;
  revenueTier: number;
  accreditationStatus: string;
  relationshipCount: number;
  cluster?: number;
  color: string;
  radius: number;
}

interface ForceLink extends d3.SimulationLinkDatum<ForceNode> {
  source: string | ForceNode;
  target: string | ForceNode;
  relationshipType: string;
  strength: number;
  distance: number;
}

interface ForceFilters {
  categories: string[];
  accreditationStatus: string[];
  riskRange: [number, number];
  searchTerm: string;
}

interface NetworkForceDirectedInsightProps {
  className?: string;
}

const categoryColors = {
  'Bank': '#8A4FE0',
  'FinTech': '#48BB78',
  'Invela': '#4965EC',
  'Unknown': '#64748b'
};

const clusterColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#F4A460', '#98D8C8'
];

export function NetworkForceDirectedInsight({ className }: NetworkForceDirectedInsightProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<ForceNode, ForceLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [viewMode, setViewMode] = useState<'category' | 'cluster' | 'risk'>('category');
  const [linkStrength, setLinkStrength] = useState([0.1]);
  const [nodeCharge, setNodeCharge] = useState([-100]);
  const [centerForce, setCenterForce] = useState([0.1]);
  const [selectedNode, setSelectedNode] = useState<ForceNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ForceNode | null>(null);
  const [filters, setFilters] = useState<ForceFilters>({
    categories: [],
    accreditationStatus: [],
    riskRange: [0, 100],
    searchTerm: ''
  });

  // Fetch companies and relationships
  const { data: companies, isLoading: companiesLoading } = useQuery<any[]>({
    queryKey: ['/api/companies-with-risk'],
    enabled: true
  });

  const { data: relationships, isLoading: relationshipsLoading } = useQuery<any[]>({
    queryKey: ['/api/network/relationships'],
    enabled: true
  });

  const isLoading = companiesLoading || relationshipsLoading;

  // Process and filter data
  const { nodes, links } = useMemo(() => {
    if (!companies || !relationships) return { nodes: [], links: [] };

    // Filter companies
    const filteredCompanies = companies.filter(company => {
      const matchesCategory = filters.categories.length === 0 || 
        filters.categories.includes(company.category);
      const matchesAccreditation = filters.accreditationStatus.length === 0 || 
        filters.accreditationStatus.includes(company.accreditationStatus);
      const matchesRisk = company.riskScore >= filters.riskRange[0] && 
        company.riskScore <= filters.riskRange[1];
      const matchesSearch = filters.searchTerm === '' ||
        company.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      return matchesCategory && matchesAccreditation && matchesRisk && matchesSearch;
    });

    // Create nodes
    const processedNodes: ForceNode[] = filteredCompanies.map(company => ({
      id: company.id.toString(),
      name: company.name,
      category: company.category || 'Unknown',
      riskScore: company.riskScore || 0,
      revenueTier: company.revenueTier || 1,
      accreditationStatus: company.accreditationStatus || 'Unknown',
      relationshipCount: company.relationshipCount || 0,
      color: categoryColors[company.category] || categoryColors.Unknown,
      radius: Math.max(8, Math.min(25, (company.relationshipCount || 1) * 2))
    }));

    // Create links from relationships
    const companyIds = new Set(processedNodes.map(n => n.id));
    const processedLinks: ForceLink[] = relationships
      .filter(rel => companyIds.has(rel.sourceId?.toString()) && companyIds.has(rel.targetId?.toString()))
      .map(rel => ({
        source: rel.sourceId.toString(),
        target: rel.targetId.toString(),
        relationshipType: rel.relationshipType || 'unknown',
        strength: getRelationshipStrength(rel.relationshipType),
        distance: getRelationshipDistance(rel.relationshipType)
      }));

    return { nodes: processedNodes, links: processedLinks };
  }, [companies, relationships, filters]);

  // Apply clustering algorithm
  const clusteredNodes = useMemo(() => {
    if (nodes.length === 0) return nodes;

    // K-means clustering based on risk score and revenue tier
    const k = Math.min(6, Math.ceil(nodes.length / 15));
    const points = nodes.map(n => [n.riskScore, n.revenueTier * 20]);
    
    // Initialize centroids
    let centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      centroids.push([
        Math.random() * 100,
        Math.random() * 100
      ]);
    }

    // Run k-means iterations
    for (let iteration = 0; iteration < 10; iteration++) {
      const clusters: number[][] = Array(k).fill(null).map(() => []);
      
      points.forEach((point, index) => {
        let closestCentroid = 0;
        let minDistance = Infinity;
        
        centroids.forEach((centroid, cIndex) => {
          const distance = Math.sqrt(
            Math.pow(point[0] - centroid[0], 2) + 
            Math.pow(point[1] - centroid[1], 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = cIndex;
          }
        });
        
        clusters[closestCentroid].push(index);
      });

      // Update centroids
      centroids = clusters.map(cluster => {
        if (cluster.length === 0) return [Math.random() * 100, Math.random() * 100];
        const sumX = cluster.reduce((sum, idx) => sum + points[idx][0], 0);
        const sumY = cluster.reduce((sum, idx) => sum + points[idx][1], 0);
        return [sumX / cluster.length, sumY / cluster.length];
      });
    }

    // Assign clusters to nodes
    return nodes.map((node, index) => {
      let cluster = 0;
      let minDistance = Infinity;
      
      centroids.forEach((centroid, cIndex) => {
        const distance = Math.sqrt(
          Math.pow(points[index][0] - centroid[0], 2) + 
          Math.pow(points[index][1] - centroid[1], 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          cluster = cIndex;
        }
      });
      
      return { ...node, cluster };
    });
  }, [nodes]);

  const getRelationshipStrength = (type: string): number => {
    const strengthMap: Record<string, number> = {
      'partnership': 0.8,
      'integration': 0.6,
      'supplier': 0.4,
      'client': 0.3,
      'unknown': 0.2
    };
    return strengthMap[type] || 0.2;
  };

  const getRelationshipDistance = (type: string): number => {
    const distanceMap: Record<string, number> = {
      'partnership': 50,
      'integration': 70,
      'supplier': 90,
      'client': 110,
      'unknown': 130
    };
    return distanceMap[type] || 100;
  };

  const getNodeColor = useCallback((node: ForceNode): string => {
    switch (viewMode) {
      case 'category':
        return node.color;
      case 'cluster':
        return clusterColors[node.cluster || 0] || '#64748b';
      case 'risk':
        if (node.riskScore === 0) return '#f8fafc';
        if (node.riskScore <= 33) return '#22c55e';
        if (node.riskScore <= 66) return '#f59e0b';
        if (node.riskScore <= 99) return '#ef4444';
        return '#dc2626';
      default:
        return node.color;
    }
  }, [viewMode]);

  // D3 Force Simulation
  useEffect(() => {
    if (!svgRef.current || clusteredNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = 900;
    const height = 600;

    // Clear previous content
    svg.selectAll('*').remove();
    
    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Create container for zoomable content
    const container = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation<ForceNode>(clusteredNodes)
      .force('link', d3.forceLink<ForceNode, ForceLink>(links)
        .id(d => d.id)
        .strength(d => d.strength * linkStrength[0])
        .distance(d => d.distance))
      .force('charge', d3.forceManyBody().strength(nodeCharge[0]))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(centerForce[0]))
      .force('collision', d3.forceCollide().radius(d => d.radius + 2));

    simulationRef.current = simulation;

    // Create arrow markers for directed links
    const defs = container.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // Create links
    const linkElements = container.append('g')
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength * 5))
      .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    const nodeElements = container.append('g')
      .selectAll('.node')
      .data(clusteredNodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('r', d => d.radius)
      .attr('fill', getNodeColor)
      .attr('stroke', d => d.accreditationStatus === 'APPROVED' ? '#22c55e' : 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, ForceNode>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    // Create labels
    const labelElements = container.append('g')
      .selectAll('.label')
      .data(clusteredNodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', '10px')
      .style('font-weight', '600')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => d.name.length > 8 ? d.name.substring(0, 6) + '..' : d.name);

    // Node interactions
    nodeElements
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 4);
        setHoveredNode(d);
        
        // Highlight connected links
        linkElements
          .attr('stroke-opacity', link => 
            (link.source as ForceNode).id === d.id || (link.target as ForceNode).id === d.id ? 1 : 0.1
          );
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 2);
        setHoveredNode(null);
        linkElements.attr('stroke-opacity', 0.6);
      })
      .on('click', function(event, d) {
        setSelectedNode(d);
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => (d.source as ForceNode).x || 0)
        .attr('y1', d => (d.source as ForceNode).y || 0)
        .attr('x2', d => (d.target as ForceNode).x || 0)
        .attr('y2', d => (d.target as ForceNode).y || 0);

      nodeElements
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);

      labelElements
        .attr('x', d => d.x || 0)
        .attr('y', d => d.y || 0);
    });

    // Drag functions
    function dragStarted(event: any, d: ForceNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: ForceNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event: any, d: ForceNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Control simulation state
    if (!isSimulationRunning) {
      simulation.stop();
    }

    return () => {
      simulation.stop();
    };
  }, [clusteredNodes, links, linkStrength, nodeCharge, centerForce, getNodeColor, isSimulationRunning]);

  // Update node colors when view mode changes
  useEffect(() => {
    if (!svgRef.current) return;
    
    d3.select(svgRef.current)
      .selectAll('.node')
      .transition()
      .duration(500)
      .attr('fill', (d: any) => getNodeColor(d));
  }, [viewMode, getNodeColor]);

  const toggleSimulation = () => {
    if (simulationRef.current) {
      if (isSimulationRunning) {
        simulationRef.current.stop();
      } else {
        simulationRef.current.restart();
      }
      setIsSimulationRunning(!isSimulationRunning);
    }
  };

  const resetSimulation = () => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
      setIsSimulationRunning(true);
    }
  };

  const zoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const zoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1 / 1.5);
    }
  };

  const resetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const toggleFilter = (filterType: keyof Omit<ForceFilters, 'searchTerm' | 'riskRange'>, value: any) => {
    setFilters(prev => {
      const currentArray = prev[filterType] as any[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [filterType]: newArray };
    });
  };

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
          <CardTitle className="text-lg font-semibold">Force-Directed Network Analysis</CardTitle>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as any)}>
              <ToggleGroupItem value="category">Category</ToggleGroupItem>
              <ToggleGroupItem value="cluster">Clusters</ToggleGroupItem>
              <ToggleGroupItem value="risk">Risk</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Button onClick={toggleSimulation} variant="outline" size="sm">
              {isSimulationRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button onClick={resetSimulation} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={zoomIn} variant="outline" size="sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button onClick={zoomOut} variant="outline" size="sm">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button onClick={resetZoom} variant="outline" size="sm">
              Reset View
            </Button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              {['Bank', 'FinTech', 'Invela'].map(category => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={filters.categories.includes(category)}
                  onCheckedChange={() => toggleFilter('categories', category)}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Accreditation</DropdownMenuLabel>
              {['APPROVED', 'PENDING', 'REJECTED'].map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.accreditationStatus.includes(status)}
                  onCheckedChange={() => toggleFilter('accreditationStatus', status)}
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Physics Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Link Strength: {linkStrength[0]}</label>
            <Slider
              value={linkStrength}
              onValueChange={setLinkStrength}
              max={1}
              min={0.01}
              step={0.01}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Node Charge: {nodeCharge[0]}</label>
            <Slider
              value={nodeCharge}
              onValueChange={setNodeCharge}
              max={-10}
              min={-300}
              step={10}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Center Force: {centerForce[0]}</label>
            <Slider
              value={centerForce}
              onValueChange={setCenterForce}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Visualization */}
          <div className="lg:col-span-3">
            <div className="w-full h-[600px] border rounded-lg overflow-hidden">
              <svg
                ref={svgRef}
                className="w-full h-full"
                viewBox="0 0 900 600"
              />
            </div>
          </div>
          
          {/* Info Panel */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Network Stats</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Nodes:</span>
                  <span>{clusteredNodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Links:</span>
                  <span>{links.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clusters:</span>
                  <span>{new Set(clusteredNodes.map(n => n.cluster)).size}</span>
                </div>
              </div>
            </div>

            {/* Selected Node */}
            {selectedNode && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">{selectedNode.name}</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>Category: {selectedNode.category}</div>
                  <div>Risk Score: {selectedNode.riskScore}</div>
                  <div>Revenue Tier: {selectedNode.revenueTier}</div>
                  <div>Relationships: {selectedNode.relationshipCount}</div>
                  <div>Status: {selectedNode.accreditationStatus}</div>
                  <div>Cluster: {selectedNode.cluster}</div>
                </div>
              </div>
            )}

            {/* Hovered Node */}
            {hoveredNode && !selectedNode && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium mb-2">{hoveredNode.name}</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Risk: {hoveredNode.riskScore}</div>
                  <div>Links: {hoveredNode.relationshipCount}</div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Instructions</h4>
              <div className="space-y-1 text-sm text-yellow-800">
                <div>• Drag nodes to reposition</div>
                <div>• Hover to highlight connections</div>
                <div>• Click to select nodes</div>
                <div>• Use controls to adjust physics</div>
                <div>• Zoom and pan to explore</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}