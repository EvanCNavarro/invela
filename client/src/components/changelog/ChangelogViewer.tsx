/**
 * ========================================
 * Changelog Viewer Component
 * ========================================
 * 
 * Displays version history and development updates for the platform.
 * Provides a clean, organized view of changes grouped by version and category.
 * 
 * Key Features:
 * - Version-based organization
 * - Category icons and color coding
 * - Expandable/collapsible sections
 * - Responsive design
 * 
 * @module ChangelogViewer
 * @version 1.0.0
 * @since 2025-05-30
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  BookOpen, 
  Wrench, 
  Building2, 
  Shield, 
  Zap,
  FileText,
  GitBranch
} from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  categories: ChangelogCategory[];
}

interface ChangelogCategory {
  title: string;
  type: 'documentation' | 'enhancement' | 'feature' | 'security' | 'performance' | 'architecture' | 'fix';
  items: ChangelogItem[];
}

interface ChangelogItem {
  title: string;
  description: string;
  details?: string[];
}

const categoryIcons = {
  documentation: BookOpen,
  enhancement: Wrench,
  feature: Zap,
  security: Shield,
  performance: Zap,
  architecture: Building2,
  fix: GitBranch
};

const categoryColors = {
  documentation: 'bg-blue-100 text-blue-800',
  enhancement: 'bg-green-100 text-green-800',
  feature: 'bg-purple-100 text-purple-800',
  security: 'bg-red-100 text-red-800',
  performance: 'bg-yellow-100 text-yellow-800',
  architecture: 'bg-indigo-100 text-indigo-800',
  fix: 'bg-orange-100 text-orange-800'
};

const changelogData: ChangelogEntry[] = [
  {
    version: '1.9.0',
    date: '2025-05-30',
    categories: [
      {
        title: 'Documentation Overhaul',
        type: 'documentation',
        items: [
          {
            title: 'Comprehensive System Investigation',
            description: 'Conducted live system analysis revealing sophisticated multi-workflow architecture',
            details: [
              'Documented KYB, KY3P, Open Banking, and Security assessment workflows',
              'Analyzed WebSocket real-time communication system with authentication flow',
              'Investigated company-scoped data isolation and session management',
              'Created detailed technical analysis of dashboard widgets and risk scoring algorithms'
            ]
          },
          {
            title: 'Documentation Cleanup & Standardization',
            description: 'Removed 9 redundant documentation files (1,356 lines of outdated content)',
            details: [
              'Eliminated duplicate architecture documents and empty archive files',
              'Consolidated overlapping audit reports and outdated implementation notes',
              'Reduced documentation volume by 53% while maintaining quality'
            ]
          },
          {
            title: 'File Naming Convention Compliance',
            description: 'Updated coding standards to specify UPPERCASE.md for documentation files',
            details: [
              'Renamed all documentation to follow industry standards (README.md, CONTRIBUTING.md, etc.)',
              'Achieved 100% naming convention compliance across documentation',
              'Created organized structure with features/ subdirectory'
            ]
          },
          {
            title: 'Enhanced Project Documentation',
            description: 'Merged best content from multiple sources into comprehensive README.md',
            details: [
              'Updated CONTRIBUTING.md with complete development guidelines',
              'Created ARCHITECTURE.md with detailed system design documentation',
              'Added TECHNICAL_ANALYSIS.md with live system investigation findings',
              'Organized feature-specific documentation in structured subdirectories'
            ]
          }
        ]
      },
      {
        title: 'Architecture Documentation',
        type: 'architecture',
        items: [
          {
            title: 'System Analysis',
            description: 'Documented layered architecture with presentation, API, business logic, and data access layers'
          },
          {
            title: 'Workflow Dependencies',
            description: 'Mapped progressive assessment unlocking (KYB → KY3P security tasks)'
          },
          {
            title: 'Real-time Communication',
            description: 'Detailed WebSocket connection management and message broadcasting'
          },
          {
            title: 'Multi-tenant Design',
            description: 'Documented company-scoped data isolation and authentication'
          },
          {
            title: 'Risk Scoring Engine',
            description: 'Analyzed multi-dimensional calculation algorithms with AI integration'
          }
        ]
      }
    ]
  },
  {
    version: '1.8.1',
    date: '2025-05-29',
    categories: [
      {
        title: 'Enhancements',
        type: 'enhancement',
        items: [
          {
            title: 'Developer Experience Console Logging Cleanup',
            description: 'Removed verbose field visibility logging from DemoStep2 component',
            details: [
              'Cleaned up DemoStepVisual asset switching logs that triggered during navigation',
              'Eliminated repetitive step progression logging while preserving essential error handling',
              'Reduced console output by 20+ log statements without affecting functionality',
              'Improved developer experience during demo flow testing and development'
            ]
          }
        ]
      }
    ]
  }
];

export function ChangelogViewer() {
  const [openVersions, setOpenVersions] = useState<Set<string>>(new Set(['1.9.0']));
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleVersion = (version: string) => {
    const newOpenVersions = new Set(openVersions);
    if (newOpenVersions.has(version)) {
      newOpenVersions.delete(version);
    } else {
      newOpenVersions.add(version);
    }
    setOpenVersions(newOpenVersions);
  };

  const toggleCategory = (categoryKey: string) => {
    const newOpenCategories = new Set(openCategories);
    if (newOpenCategories.has(categoryKey)) {
      newOpenCategories.delete(categoryKey);
    } else {
      newOpenCategories.add(categoryKey);
    }
    setOpenCategories(newOpenCategories);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Changelog</h1>
        <p className="text-gray-600">Development updates and feature releases for the enterprise risk assessment platform</p>
      </div>

      {changelogData.map((entry) => (
        <Card key={entry.version} className="overflow-hidden">
          <Collapsible open={openVersions.has(entry.version)} onOpenChange={() => toggleVersion(entry.version)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {openVersions.has(entry.version) ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                    <CardTitle className="text-xl">Version {entry.version}</CardTitle>
                    <Badge variant="outline">{entry.date}</Badge>
                  </div>
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  {entry.categories.map((category, categoryIndex) => {
                    const categoryKey = `${entry.version}-${categoryIndex}`;
                    const IconComponent = categoryIcons[category.type];
                    
                    return (
                      <div key={categoryIndex} className="border-l-2 border-gray-200 pl-4">
                        <Collapsible 
                          open={openCategories.has(categoryKey)} 
                          onOpenChange={() => toggleCategory(categoryKey)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start p-0 h-auto mb-3">
                              <div className="flex items-center space-x-2">
                                {openCategories.has(categoryKey) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <IconComponent className="h-4 w-4" />
                                <span className="font-semibold">{category.title}</span>
                                <Badge className={categoryColors[category.type]}>
                                  {category.type}
                                </Badge>
                              </div>
                            </Button>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="space-y-4 ml-6">
                              {category.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                                  {item.details && (
                                    <ul className="space-y-1">
                                      {item.details.map((detail, detailIndex) => (
                                        <li key={detailIndex} className="text-xs text-gray-500 flex items-start">
                                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                                          {detail}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}