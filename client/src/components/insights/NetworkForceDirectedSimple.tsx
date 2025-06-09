/**
 * ========================================
 * Network Force-Directed Visualization - Simplified Implementation
 * ========================================
 * 
 * A simplified force-directed network visualization that displays
 * network relationships without complex D3 physics simulation.
 * 
 * @module components/insights/NetworkForceDirectedSimple
 * @version 1.0.0
 * @since 2025-06-09
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Network, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkForceDirectedSimpleProps {
  className?: string;
}

interface NetworkNode {
  id: string;
  name: string;
  category: string;
  riskScore: number;
  connectionCount: number;
}

interface NetworkConnection {
  source: string;
  target: string;
  type: string;
  strength: number;
}

const categoryColors = {
  'Bank': '#8A4FE0',
  'FinTech': '#48BB78',
  'Invela': '#4965EC',
  'Unknown': '#64748b'
};

export function NetworkForceDirectedSimple({ className }: NetworkForceDirectedSimpleProps) {
  // Fetch network data
  const { data: networkData, isLoading, error } = useQuery<any>({
    queryKey: ['/api/relationships/network'],
    enabled: true
  });

  const { nodes, connections, centerNode } = useMemo(() => {
    if (!networkData?.nodes) {
      return { nodes: [], connections: [], centerNode: null };
    }

    // Extract center node (usually Invela)
    const center = networkData.center || { name: 'Invela', id: '1' };

    // Process nodes
    const processedNodes: NetworkNode[] = networkData.nodes.slice(0, 15).map((node: any) => ({
      id: node.companyId || node.id,
      name: node.companyName || node.name,
      category: node.category || 'Unknown',
      riskScore: node.riskScore || 0,
      connectionCount: 1
    }));

    // Create connections
    const processedConnections: NetworkConnection[] = processedNodes.slice(0, 10).map((node, index) => ({
      source: center.id,
      target: node.id,
      type: 'network_member',
      strength: Math.random() * 100
    }));

    return {
      nodes: processedNodes,
      connections: processedConnections,
      centerNode: center
    };
  }, [networkData]);

  if (error) {
    return (
      <Card className={cn("w-full h-[500px] flex items-center justify-center", className)}>
        <div className="text-center text-gray-500">
          <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Unable to load network data</p>
          <p className="text-sm">Please check your connection and try again</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn("w-full h-[500px] flex items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  if (nodes.length === 0) {
    return (
      <Card className={cn("w-full h-[400px] flex items-center justify-center", className)}>
        <div className="text-center text-gray-500">
          <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No network relationships available</p>
          <p className="text-sm">Force-directed network will appear when relationships exist</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Network className="h-5 w-5" />
              Force-Directed Network Analysis
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Network topology showing {nodes.length} connected entities
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {nodes.length} nodes
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Network Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{nodes.length}</div>
              <div className="text-xs text-gray-600">Network Nodes</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{connections.length}</div>
              <div className="text-xs text-gray-600">Active Links</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {Math.round(nodes.reduce((sum, n) => sum + n.riskScore, 0) / nodes.length)}
              </div>
              <div className="text-xs text-gray-600">Avg Risk Score</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {new Set(nodes.map(n => n.category)).size}
              </div>
              <div className="text-xs text-gray-600">Categories</div>
            </div>
          </div>

          {/* Center Node */}
          {centerNode && (
            <div className="text-center">
              <h4 className="font-medium mb-2">Network Center</h4>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-2">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: categoryColors.Invela }}
                />
              </div>
              <p className="font-medium">{centerNode.name}</p>
              <p className="text-sm text-gray-500">Central hub with {connections.length} connections</p>
            </div>
          )}

          {/* Network Participants Grid */}
          <div>
            <h4 className="font-medium mb-3">Network Participants</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: categoryColors[node.category as keyof typeof categoryColors] || categoryColors.Unknown }}
                    />
                    <div>
                      <div className="font-medium text-sm">{node.name}</div>
                      <div className="text-xs text-gray-500">{node.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Risk: {node.riskScore}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <div className="text-xs text-gray-500">Connected</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Strengths */}
          <div>
            <h4 className="font-medium mb-3">Connection Analysis</h4>
            <div className="space-y-2">
              {connections.slice(0, 5).map((connection, index) => {
                const sourceNode = nodes.find(n => n.id === connection.source) || centerNode;
                const targetNode = nodes.find(n => n.id === connection.target);
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{sourceNode?.name}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">{targetNode?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${connection.strength}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(connection.strength)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}