/**
 * ========================================
 * Enterprise Component Library - Live Documentation
 * ========================================
 * 
 * Interactive component library showcasing actual Button, Input, and Table
 * components used throughout the enterprise risk assessment platform.
 * Uses real components with live demos and interactive examples.
 * 
 * @module pages/component-library
 * @version 1.0.0
 * @since 2025-05-24
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EnhancedTable, type Column } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  SearchIcon, 
  DownloadIcon, 
  PlusIcon, 
  TrashIcon, 
  EditIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon 
} from 'lucide-react';

/**
 * Sample data matching your real application structure
 */
interface CompanyData {
  id: string;
  name: string;
  riskScore: number;
  status: 'completed' | 'processing' | 'needs_review';
  lastUpdated: string;
  industry: string;
}

const sampleCompanies: CompanyData[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    riskScore: 85,
    status: 'completed',
    lastUpdated: '2025-05-24',
    industry: 'Technology'
  },
  {
    id: '2', 
    name: 'Global Dynamics Inc',
    riskScore: 72,
    status: 'processing',
    lastUpdated: '2025-05-23',
    industry: 'Manufacturing'
  },
  {
    id: '3',
    name: 'Risk Solutions Ltd',
    riskScore: 94,
    status: 'needs_review',
    lastUpdated: '2025-05-22',
    industry: 'Financial Services'
  }
];

const tableColumns: Column<CompanyData>[] = [
  {
    id: 'name',
    header: 'Company Name',
    sortable: true,
    cell: (company) => (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
          <span className="text-purple-600 font-semibold text-sm">
            {company.name.substring(0, 2)}
          </span>
        </div>
        <span className="font-medium">{company.name}</span>
      </div>
    )
  },
  {
    id: 'riskScore',
    header: 'Risk Score',
    sortable: true,
    cell: (company) => {
      const getScoreColor = (score: number) => {
        if (score >= 90) return 'bg-red-100 text-red-800';
        if (score >= 75) return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
      };
      return (
        <Badge className={getScoreColor(company.riskScore)}>
          {company.riskScore}
        </Badge>
      );
    }
  },
  {
    id: 'status',
    header: 'Status',
    sortable: true,
    cell: (company) => {
      const statusConfig = {
        completed: { label: 'Completed', icon: CheckCircleIcon, color: 'bg-green-100 text-green-800' },
        processing: { label: 'Processing', icon: ClockIcon, color: 'bg-blue-100 text-blue-800' },
        needs_review: { label: 'Needs Review', icon: AlertTriangleIcon, color: 'bg-red-100 text-red-800' }
      };
      const config = statusConfig[company.status];
      const Icon = config.icon;
      return (
        <Badge className={`${config.color} flex items-center gap-1`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
      );
    }
  },
  {
    id: 'industry',
    header: 'Industry',
    sortable: true,
    cell: (company) => <span className="text-gray-600">{company.industry}</span>
  },
  {
    id: 'lastUpdated',
    header: 'Last Updated',
    sortable: true,
    cell: (company) => <span className="text-sm text-gray-500">{company.lastUpdated}</span>
  }
];

export function ComponentLibrary() {
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [loadingButton, setLoadingButton] = useState('');

  const handleButtonClick = (variant: string) => {
    setLoadingButton(variant);
    setTimeout(() => setLoadingButton(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-4">🎨 Invela Trust Network Component Library</h1>
          <p className="text-xl opacity-90">Live documentation of actual components from the Invela Trust Network Platform</p>
          <p className="text-sm opacity-75 mt-2">Real React components • TypeScript • Tailwind CSS • Accessible</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        
        {/* Button Components */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  🔘
                </div>
                Button Components
              </CardTitle>
              <CardDescription>
                Interactive buttons with variants, sizes, and states from your actual application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* Primary Variants */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Button Variants</h3>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    variant="default" 
                    onClick={() => handleButtonClick('default')}
                    disabled={loadingButton === 'default'}
                  >
                    {loadingButton === 'default' ? 'Loading...' : 'Default'}
                  </Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>

              {/* Button Sizes */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Button Sizes</h3>
                <div className="flex items-center gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><PlusIcon className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Button with Icons */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Buttons with Icons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button><DownloadIcon className="w-4 h-4 mr-2" />Download Report</Button>
                  <Button variant="outline"><PlusIcon className="w-4 h-4 mr-2" />Add Company</Button>
                  <Button variant="destructive"><TrashIcon className="w-4 h-4 mr-2" />Delete</Button>
                  <Button variant="secondary"><EditIcon className="w-4 h-4 mr-2" />Edit</Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </section>

        {/* Input Components */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  📝
                </div>
                Input Components
              </CardTitle>
              <CardDescription>
                Form inputs with proper styling and accessibility from your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Input
                    </label>
                    <Input 
                      placeholder="Enter company name..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Input
                    </label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input 
                        className="pl-10"
                        placeholder="Search companies..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Input
                    </label>
                    <Input type="email" placeholder="admin@company.com" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Input
                    </label>
                    <Input type="password" placeholder="••••••••" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number Input
                    </label>
                    <Input type="number" placeholder="Risk threshold (0-100)" min="0" max="100" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Disabled Input
                    </label>
                    <Input disabled value="Read-only field" />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </section>

        {/* Table Components */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  📊
                </div>
                Table Components
              </CardTitle>
              <CardDescription>
                Enterprise data tables with sorting, filtering, and interactive features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedTable
                data={sampleCompanies}
                columns={tableColumns}
                selectable={true}
                getItemId={(company) => company.id}
                onSort={(field, direction) => {
                  console.log('Sorting:', field, direction);
                }}
                onSelectionChange={(selectedIds) => {
                  console.log('Selected:', selectedIds);
                }}
              />
            </CardContent>
          </Card>
        </section>

        {/* Interactive Demo */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  ⚡
                </div>
                Interactive Demo
              </CardTitle>
              <CardDescription>
                Combined component example showing real application workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Company Assessment Form</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <Input placeholder="Enter company name..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industry
                      </label>
                      <Input placeholder="e.g., Technology, Financial Services..." />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Risk Threshold
                      </label>
                      <Input type="number" placeholder="0-100" min="0" max="100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assessment Notes
                      </label>
                      <Input placeholder="Additional assessment notes..." />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button onClick={() => alert('✅ Assessment saved successfully!')}>
                    Save Assessment
                  </Button>
                  <Button variant="outline">Save as Draft</Button>
                  <Button variant="secondary">Reset Form</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Usage Guidelines */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>📚 Usage Guidelines</CardTitle>
              <CardDescription>
                Implementation details and best practices for your development team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold text-blue-600 mb-3">🎨 Design System</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Consistent blue theme (oklch(50% 0.1 240))</li>
                    <li>• Tailwind CSS utility classes</li>
                    <li>• Radix UI primitives</li>
                    <li>• Accessible color contrasts</li>
                    <li>• Responsive design patterns</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-600 mb-3">⚡ Development</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• TypeScript for type safety</li>
                    <li>• React forwardRef patterns</li>
                    <li>• Class variance authority</li>
                    <li>• shadcn/ui component library</li>
                    <li>• Lucide React icons</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-600 mb-3">🔧 Implementation</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Import from @/components/ui/</li>
                    <li>• Use cn() utility for className merging</li>
                    <li>• Follow variant prop patterns</li>
                    <li>• Implement proper ARIA attributes</li>
                    <li>• Test with keyboard navigation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-lg font-semibold mb-2">Invela Trust Network</p>
          <p className="text-gray-400">Component Library • Built with Real Components • Ready for Production</p>
        </div>
      </footer>
    </div>
  );
}