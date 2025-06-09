import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RiskRadarD3SimpleProps {
  className?: string;
  data?: { category: string; value: number }[];
  companyName?: string;
}

export function RiskRadarD3Simple({ 
  className, 
  data = [
    { category: 'Cyber Security', value: 5 },
    { category: 'Financial Stability', value: 4 },
    { category: 'Potential Liability', value: 8 },
    { category: 'Dark Web Data', value: 3 },
    { category: 'Public Sentiment', value: 5 },
    { category: 'Data Access Scope', value: 6 }
  ],
  companyName = 'BankingAPI Gateway'
}: RiskRadarD3SimpleProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 300;
    const height = 300;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;
    const centerX = width / 2;
    const centerY = height / 2;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Scales
    const angleScale = d3.scaleLinear()
      .domain([0, data.length])
      .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
      .domain([0, 10])
      .range([0, radius]);

    // Grid circles
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
      g.append('circle')
        .attr('r', (radius / levels) * i)
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);
    }

    // Grid lines
    data.forEach((d, i) => {
      const angle = angleScale(i) - Math.PI / 2;
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', Math.cos(angle) * radius)
        .attr('y2', Math.sin(angle) * radius)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);
    });

    // Data line
    const line = d3.line<{ category: string; value: number }>()
      .x((d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.cos(angle) * radiusScale(d.value);
      })
      .y((d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.sin(angle) * radiusScale(d.value);
      })
      .curve(d3.curveLinearClosed);

    // Data area
    g.append('path')
      .datum(data)
      .attr('d', line)
      .attr('fill', '#4965EC')
      .attr('fill-opacity', 0.2)
      .attr('stroke', '#4965EC')
      .attr('stroke-width', 2);

    // Data points
    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.cos(angle) * radiusScale(d.value);
      })
      .attr('cy', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.sin(angle) * radiusScale(d.value);
      })
      .attr('r', 4)
      .attr('fill', '#4965EC')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Labels
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.cos(angle) * (radius + 15);
      })
      .attr('y', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.sin(angle) * (radius + 15);
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#1e293b')
      .text(d => d.category);

  }, [data]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Risk Radar (D3)</CardTitle>
        <p className="text-sm text-muted-foreground">{companyName}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-center">
          <svg ref={svgRef}></svg>
        </div>
      </CardContent>
    </Card>
  );
}