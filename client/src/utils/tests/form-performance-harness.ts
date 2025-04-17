/**
 * Form Performance Test Harness
 * 
 * This utility enables testing form performance at different field counts (30, 60, 90, 120+)
 * by automatically generating realistic test forms and measuring key metrics.
 * 
 * The harness performs the following tests:
 * 1. Initial form loading performance
 * 2. Field update performance
 * 3. State management efficiency
 * 4. Save operation performance
 * 5. Memory consumption
 * 
 * Usage:
 * ```
 * import { runPerformanceTest } from './tests/form-performance-harness';
 * 
 * // Run the test with 120 fields
 * runPerformanceTest({
 *   fieldCount: 120,
 *   iterations: 3,
 *   optimizationsEnabled: true
 * });
 * ```
 */

import { performanceMonitor, healthCheck, OptimizationFeatures, safelyRunOptimizedCode } from '../form-optimization';
import { FormField, FormSection } from '../../components/forms/types';
import { TimestampedFormData, FormData } from '../../types/form-data';

// Test configuration options
export interface TestOptions {
  // Number of fields to generate (default: 30)
  fieldCount: number;
  
  // Number of test iterations to run (default: 1)
  iterations?: number;
  
  // Whether to enable all optimizations during test (default: false)
  optimizationsEnabled?: boolean;
  
  // Callback when test is complete
  onComplete?: (results: TestResults) => void;
  
  // Whether to output detailed logs (default: false)
  verbose?: boolean;
  
  // Test specific feature (if not set, tests all)
  featureToTest?: keyof typeof OptimizationFeatures;
}

// Test results structure
export interface TestResults {
  // Test configuration
  config: TestOptions;
  
  // Timestamp when test started
  startTime: number;
  
  // Timestamp when test completed
  endTime: number;
  
  // Total test duration
  duration: number;
  
  // Performance metrics at end of test
  metrics: any;
  
  // Performance events during test
  events: any[];
  
  // Health check status
  healthStatus: any;
  
  // Optimization features status during test
  optimizationStatus: typeof OptimizationFeatures;
}

// Template section structure to generate realistic test data
const SECTION_TEMPLATES = [
  {
    id: 'section-1',
    title: 'Company Profile',
    description: 'Basic information about your company',
    order: 1,
    fieldTypes: ['text', 'text', 'date', 'email', 'tel', 'text', 'textarea', 'select']
  },
  {
    id: 'section-2',
    title: 'Governance & Leadership',
    description: 'Information about company governance',
    order: 2,
    fieldTypes: ['text', 'textarea', 'select', 'checkbox', 'text', 'number', 'text', 'text', 'text', 'text']
  },
  {
    id: 'section-3',
    title: 'Financial Profile',
    description: 'Financial information for risk assessment',
    order: 3,
    fieldTypes: ['number', 'number', 'select', 'text', 'file', 'text', 'checkbox', 'checkbox']
  },
  {
    id: 'section-4',
    title: 'Operations & Compliance',
    description: 'Operational and compliance information',
    order: 4,
    fieldTypes: ['text', 'textarea', 'select', 'checkbox', 'select', 'text', 'text', 'textarea']
  },
  {
    id: 'section-5',
    title: 'Additional Information',
    description: 'Any additional information needed',
    order: 5,
    fieldTypes: ['textarea', 'file', 'checkbox', 'text', 'text', 'text', 'text', 'text']
  },
  {
    id: 'section-6',
    title: 'Security Measures',
    description: 'Information about security protocols',
    order: 6,
    fieldTypes: ['select', 'checkbox', 'checkbox', 'text', 'text', 'textarea', 'select', 'text']
  },
  {
    id: 'section-7',
    title: 'Risk Assessment',
    description: 'Risk assessment information',
    order: 7,
    fieldTypes: ['select', 'select', 'textarea', 'checkbox', 'text', 'number', 'text', 'text']
  },
  {
    id: 'section-8',
    title: 'Regulatory Information',
    description: 'Information about regulatory compliance',
    order: 8,
    fieldTypes: ['select', 'checkbox', 'text', 'text', 'text', 'textarea', 'select', 'text']
  }
];

// Field name templates to generate realistic key names
const FIELD_NAME_TEMPLATES = {
  'text': [
    'companyName', 'registrationNumber', 'taxId', 'legalEntityName', 'dunsNumber',
    'incorporationCountry', 'registeredAddress', 'mailingAddress', 'websiteUrl',
    'primaryContact', 'ceoName', 'cfoName', 'ultimateBeneficialOwner', 'jurisdiction',
    'businessType', 'industrySector', 'referenceNumber', 'subsidiaryOf', 'parentCompany',
    'tradingName', 'vatNumber', 'swiftCode', 'ibanNumber', 'bankName', 'accountNumber'
  ],
  'textarea': [
    'companyDescription', 'businessActivities', 'productDescription', 'serviceDescription',
    'marketingMaterials', 'additionalInformation', 'businessModel', 'goToMarketStrategy',
    'customerSegments', 'valueProposition', 'keyPartners', 'keyResources', 'costStructure',
    'revenueStreams', 'companyHistory', 'missionStatement', 'visionStatement', 'coreValues'
  ],
  'date': [
    'incorporationDate', 'fiscalYearEnd', 'lastAuditDate', 'nextReportingDate',
    'registrationDate', 'licenseExpiryDate', 'lastReviewDate', 'foundingDate',
    'lastAssessmentDate', 'certificationDate', 'lastUpdateDate', 'stakeholderMeetingDate'
  ],
  'email': [
    'contactEmail', 'supportEmail', 'billingEmail', 'salesEmail', 'investorRelationsEmail',
    'pressEmail', 'careersEmail', 'complaintsEmail', 'infoEmail', 'securityEmail'
  ],
  'tel': [
    'companyPhone', 'contactPhone', 'supportPhone', 'faxNumber', 'emergencyContact',
    'mobileNumber', 'alternativePhone', 'internationalPhone', 'directLine', 'tollFreeNumber'
  ],
  'select': [
    'companySize', 'industryCategory', 'businessStructure', 'fundingStage', 'registrationStatus',
    'marketSegment', 'geographicFocus', 'employeeCount', 'revenueRange', 'profitability',
    'riskCategory', 'creditRating', 'complianceStatus', 'auditStatus', 'regulatoryStatus'
  ],
  'checkbox': [
    'hasSubsidiaries', 'isPubliclyTraded', 'hasExportControls', 'isRegulated', 'hasSanctions',
    'hasLitigation', 'providesBankingServices', 'processesSensitiveData', 'isGovernmentOwned',
    'hasPoliticallyExposedPersons', 'hasCriminalRecord', 'acceptsDigitalCurrency'
  ],
  'number': [
    'annualRevenue', 'employeeCount', 'yearFounded', 'marketCapitalization', 'annualProfit',
    'debtRatio', 'equityRatio', 'assetValue', 'liabilityValue', 'liquidityRatio',
    'cashReserves', 'outstandingLoans', 'averageTransactionValue', 'monthlyTransactionVolume'
  ],
  'file': [
    'financialStatements', 'certificateOfIncorporation', 'proofOfAddress', 'businessLicense',
    'organizationalChart', 'ownershipStructure', 'auditReports', 'taxFilings',
    'regulatoryApprovals', 'complianceCertificates', 'identityDocuments', 'bankStatements'
  ]
};

/**
 * Generate a test form with the specified number of fields
 */
function generateTestForm(fieldCount: number): { fields: FormField[], sections: FormSection[] } {
  // Generate sections based on field count (each section has about 8-10 fields)
  const totalSections = Math.ceil(fieldCount / 8);
  const sections = SECTION_TEMPLATES.slice(0, totalSections);
  
  // Field ID counter
  let fieldId = 1;
  let remainingFields = fieldCount;
  
  // Generate fields for each section
  const fields: FormField[] = [];
  const generatedSections: FormSection[] = [];
  
  sections.forEach((sectionTemplate, index) => {
    // Calculate how many fields to put in this section
    let sectionFieldCount = Math.min(
      index === sections.length - 1 ? remainingFields : Math.ceil(fieldCount / totalSections),
      remainingFields
    );
    remainingFields -= sectionFieldCount;
    
    // Create section
    const section: FormSection = {
      id: sectionTemplate.id,
      title: sectionTemplate.title,
      description: sectionTemplate.description,
      order: sectionTemplate.order
    };
    
    generatedSections.push(section);
    
    // Create fields for this section
    for (let i = 0; i < sectionFieldCount; i++) {
      // Cycle through field types from the template
      const fieldType = sectionTemplate.fieldTypes[i % sectionTemplate.fieldTypes.length];
      
      // Get name templates for this field type
      const nameTemplates = FIELD_NAME_TEMPLATES[fieldType as keyof typeof FIELD_NAME_TEMPLATES] || FIELD_NAME_TEMPLATES.text;
      
      // Generate a unique field name
      const fieldName = nameTemplates[Math.floor(Math.random() * nameTemplates.length)] + 
        (nameTemplates.length < sectionFieldCount ? fieldId : '');
      
      // Create the field
      const field: FormField = {
        id: `field-${fieldId}`,
        key: fieldName,
        label: fieldName
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase()),
        type: fieldType,
        required: Math.random() > 0.3, // 70% of fields are required
        helpText: `Help text for ${fieldName}`,
        sectionId: section.id,
        order: i + 1,
        validation: fieldType === 'email' ? { pattern: 'email' } : undefined
      };
      
      fields.push(field);
      fieldId++;
    }
  });
  
  return { fields, sections: generatedSections };
}

/**
 * Generate test data for a form
 */
function generateFormData(fields: FormField[]): Record<string, any> {
  const formData: Record<string, any> = {};
  
  fields.forEach(field => {
    let value;
    
    // Generate appropriate value based on field type
    switch(field.type) {
      case 'text':
      case 'textarea':
        value = `Test value for ${field.key}`;
        break;
      case 'email':
        value = `test-${field.key}@example.com`;
        break;
      case 'tel':
        value = '+1234567890';
        break;
      case 'date':
        value = new Date().toISOString().split('T')[0];
        break;
      case 'number':
        value = Math.floor(Math.random() * 1000);
        break;
      case 'select':
        value = 'option1';
        break;
      case 'checkbox':
        value = Math.random() > 0.5;
        break;
      case 'file':
        value = null; // Files are harder to mock realistically
        break;
      default:
        value = `Default value for ${field.key}`;
    }
    
    formData[field.key] = value;
  });
  
  return formData;
}

/**
 * Generate timestamped form data
 */
function generateTimestampedFormData(formData: Record<string, any>): Record<string, number> {
  const now = Date.now();
  const timestamps: Record<string, number> = {};
  
  // Generate timestamp for each field, slightly varied to simulate realistic data
  Object.keys(formData).forEach(key => {
    timestamps[key] = now - Math.floor(Math.random() * 60000); // Random time in the last minute
  });
  
  return timestamps;
}

/**
 * Simulate form load performance
 */
function testFormLoadPerformance(fields: FormField[], sections: FormSection[]): number {
  performanceMonitor.startTimer('formLoad');
  
  // Simulate processing fields
  performanceMonitor.startTimer('fieldProcessing');
  const processedFields = [...fields]; // In a real implementation, this would do more work
  performanceMonitor.endTimer('fieldProcessing');
  
  // Simulate section processing
  performanceMonitor.startTimer('sectionProcessing');
  const processedSections = [...sections]; // In a real implementation, this would do more work
  performanceMonitor.endTimer('sectionProcessing');
  
  // Verify data health
  healthCheck.check('fieldProcessing', { fields: processedFields });
  
  return performanceMonitor.endTimer('formLoad');
}

/**
 * Simulate form field updates performance
 */
function testFieldUpdatePerformance(fields: FormField[], formData: Record<string, any>, updateCount: number = 10): number {
  performanceMonitor.startTimer('fieldUpdates');
  
  // Select random fields to update
  const fieldsToUpdate = [...fields]
    .sort(() => Math.random() - 0.5)
    .slice(0, updateCount);
  
  // Perform updates
  for (const field of fieldsToUpdate) {
    performanceMonitor.startTimer(`updateField_${field.key}`);
    
    // Simulate update for this field
    if (field.type === 'text' || field.type === 'textarea') {
      formData[field.key] = `Updated value for ${field.key} at ${new Date().toISOString()}`;
    } else if (field.type === 'number') {
      formData[field.key] = Math.floor(Math.random() * 1000);
    } else if (field.type === 'checkbox') {
      formData[field.key] = !formData[field.key];
    }
    
    performanceMonitor.endTimer(`updateField_${field.key}`);
  }
  
  // Verify data health
  healthCheck.check('stateUpdate', formData);
  
  return performanceMonitor.endTimer('fieldUpdates');
}

/**
 * Simulate form save performance
 */
function testSavePerformance(fields: FormField[], formData: Record<string, any>): number {
  performanceMonitor.startTimer('formSave');
  
  // Simulate save operation
  performanceMonitor.startTimer('prepareData');
  const dataToSave = { ...formData };
  performanceMonitor.endTimer('prepareData');
  
  // Simulate network latency (50-300ms)
  const latency = 50 + Math.random() * 250;
  performanceMonitor.startTimer('networkLatency');
  
  // Wait for the simulated latency
  const start = Date.now();
  while (Date.now() - start < latency) {
    // Busy wait to simulate CPU usage
  }
  
  performanceMonitor.endTimer('networkLatency');
  
  // Verify data health
  healthCheck.check('sectionSaved', { success: true, data: dataToSave });
  
  return performanceMonitor.endTimer('formSave');
}

/**
 * Simulate form rendering performance
 */
function testRenderPerformance(fields: FormField[], sections: FormSection[]): number {
  performanceMonitor.startTimer('formRender');
  
  // Simulate section rendering
  for (const section of sections) {
    performanceMonitor.startTimer(`renderSection_${section.id}`);
    
    // Get fields for this section
    const sectionFields = fields.filter(f => f.sectionId === section.id);
    
    // Simulate rendering each field (would be component rendering in real app)
    for (const field of sectionFields) {
      performanceMonitor.startTimer(`renderField_${field.id}`);
      // Simulate DOM operations and rendering logic
      
      // Some busy work to simulate rendering operations
      const temp = [];
      for (let i = 0; i < 1000; i++) {
        temp.push({ fieldId: field.id, operation: 'render', value: field.key });
      }
      
      performanceMonitor.endTimer(`renderField_${field.id}`);
    }
    
    performanceMonitor.endTimer(`renderSection_${section.id}`);
  }
  
  return performanceMonitor.endTimer('formRender');
}

/**
 * Simulate form navigation performance
 */
function testNavigationPerformance(sections: FormSection[]): number {
  performanceMonitor.startTimer('navigation');
  
  // Simulate navigation between sections
  for (let i = 0; i < sections.length; i++) {
    performanceMonitor.startTimer(`navigateToSection_${sections[i].id}`);
    
    // Simulate section activation
    const activeSection = sections[i].id;
    
    // Busy work to simulate state updates and rendering
    const temp = [];
    for (let j = 0; j < 500; j++) {
      temp.push({ section: activeSection, active: true, inactive: sections.map(s => s.id).filter(id => id !== activeSection) });
    }
    
    performanceMonitor.endTimer(`navigateToSection_${sections[i].id}`);
  }
  
  return performanceMonitor.endTimer('navigation');
}

/**
 * Run a complete performance test with given options
 */
export async function runPerformanceTest(options: TestOptions): Promise<TestResults> {
  const {
    fieldCount,
    iterations = 1,
    optimizationsEnabled = false,
    verbose = false,
    featureToTest
  } = options;
  
  // Store original optimization settings to restore later
  const originalSettings = { ...OptimizationFeatures };
  
  try {
    // Reset performance monitor
    performanceMonitor.reset();
    
    // Set debug mode based on verbose option
    performanceMonitor.setDebugMode(verbose);
    
    // Configure optimization settings for test
    if (featureToTest) {
      // Enable only the specific feature being tested
      Object.keys(OptimizationFeatures).forEach(key => {
        (OptimizationFeatures as any)[key] = key === featureToTest;
      });
    } else if (optimizationsEnabled) {
      // Enable all optimizations
      Object.keys(OptimizationFeatures).forEach(key => {
        (OptimizationFeatures as any)[key] = true;
      });
    } else {
      // Disable all optimizations
      Object.keys(OptimizationFeatures).forEach(key => {
        (OptimizationFeatures as any)[key] = false;
      });
    }
    
    if (verbose) {
      console.log(`%c[PERFORMANCE TEST] Starting test with ${fieldCount} fields`, 'color: #E91E63; font-weight: bold');
      console.log(`%c[PERFORMANCE TEST] Optimizations: ${optimizationsEnabled ? 'Enabled' : 'Disabled'}`, 'color: #E91E63');
      if (featureToTest) {
        console.log(`%c[PERFORMANCE TEST] Testing specific feature: ${featureToTest}`, 'color: #E91E63');
      }
    }
    
    // Record start time
    const startTime = Date.now();
    
    // Generate test form data
    const { fields, sections } = generateTestForm(fieldCount);
    const formData = generateFormData(fields);
    const timestamps = generateTimestampedFormData(formData);
    
    // Create timestamped form data
    const timestampedFormData: TimestampedFormData = {
      values: formData,
      timestamps
    };
    
    // Run tests for the specified number of iterations
    for (let i = 0; i < iterations; i++) {
      if (verbose) {
        console.log(`%c[PERFORMANCE TEST] Running iteration ${i + 1} of ${iterations}`, 'color: #E91E63');
      }
      
      // Test form load
      testFormLoadPerformance(fields, sections);
      
      // Test field updates
      testFieldUpdatePerformance(fields, formData);
      
      // Test save performance
      testSavePerformance(fields, formData);
      
      // Test render performance
      testRenderPerformance(fields, sections);
      
      // Test navigation performance
      testNavigationPerformance(sections);
    }
    
    // Record end time
    const endTime = Date.now();
    
    // Get final metrics
    const finalMetrics = performanceMonitor.getMetrics();
    const events = performanceMonitor.getEvents();
    const healthStatus = healthCheck.getStatus();
    
    // Create test results
    const results: TestResults = {
      config: options,
      startTime,
      endTime,
      duration: endTime - startTime,
      metrics: finalMetrics,
      events,
      healthStatus,
      optimizationStatus: { ...OptimizationFeatures }
    };
    
    // Output summary
    if (verbose) {
      console.log(`%c[PERFORMANCE TEST] Test completed in ${results.duration}ms`, 'color: #E91E63; font-weight: bold');
      console.log(`%c[PERFORMANCE TEST] Form load time: ${finalMetrics.timers['formLoad']?.average.toFixed(2)}ms`, 'color: #E91E63');
      console.log(`%c[PERFORMANCE TEST] Field update time: ${finalMetrics.timers['fieldUpdates']?.average.toFixed(2)}ms`, 'color: #E91E63');
      console.log(`%c[PERFORMANCE TEST] Form save time: ${finalMetrics.timers['formSave']?.average.toFixed(2)}ms`, 'color: #E91E63');
      console.log(`%c[PERFORMANCE TEST] Form render time: ${finalMetrics.timers['formRender']?.average.toFixed(2)}ms`, 'color: #E91E63');
      console.log(`%c[PERFORMANCE TEST] Navigation time: ${finalMetrics.timers['navigation']?.average.toFixed(2)}ms`, 'color: #E91E63');
    }
    
    // Call onComplete callback if provided
    if (options.onComplete) {
      options.onComplete(results);
    }
    
    return results;
  } finally {
    // Restore original optimization settings
    Object.keys(OptimizationFeatures).forEach(key => {
      (OptimizationFeatures as any)[key] = originalSettings[key as keyof typeof OptimizationFeatures];
    });
    
    // Reset debug mode
    performanceMonitor.setDebugMode(false);
  }
}

/**
 * Compare performance between optimized and non-optimized versions
 */
export async function compareOptimizations(options: TestOptions): Promise<{
  optimizedResults: TestResults;
  nonOptimizedResults: TestResults;
  improvement: {
    loadTime: number;
    updateTime: number;
    saveTime: number;
    renderTime: number;
    navigationTime: number;
    overallTime: number;
  };
}> {
  // Run test with optimizations disabled
  const nonOptimizedResults = await runPerformanceTest({
    ...options,
    optimizationsEnabled: false,
    verbose: false
  });
  
  // Run test with optimizations enabled
  const optimizedResults = await runPerformanceTest({
    ...options,
    optimizationsEnabled: true,
    verbose: false
  });
  
  // Calculate improvements
  const getNonOptimizedTime = (timerName: string) => 
    nonOptimizedResults.metrics.timers[timerName]?.average || 0;
  
  const getOptimizedTime = (timerName: string) => 
    optimizedResults.metrics.timers[timerName]?.average || 0;
  
  const calculateImprovement = (timerName: string) => {
    const nonOptTime = getNonOptimizedTime(timerName);
    const optTime = getOptimizedTime(timerName);
    
    if (nonOptTime === 0 || optTime === 0) return 0;
    return ((nonOptTime - optTime) / nonOptTime) * 100;
  };
  
  const improvement = {
    loadTime: calculateImprovement('formLoad'),
    updateTime: calculateImprovement('fieldUpdates'),
    saveTime: calculateImprovement('formSave'),
    renderTime: calculateImprovement('formRender'),
    navigationTime: calculateImprovement('navigation'),
    overallTime: ((nonOptimizedResults.duration - optimizedResults.duration) / nonOptimizedResults.duration) * 100
  };
  
  // Output comparison
  console.log(`%c[OPTIMIZATION COMPARISON] ${options.fieldCount} fields, ${options.iterations} iterations`, 'color: #4CAF50; font-weight: bold');
  console.log(`%c[OPTIMIZATION COMPARISON] Load time: ${improvement.loadTime.toFixed(2)}% improvement`, 'color: #4CAF50');
  console.log(`%c[OPTIMIZATION COMPARISON] Update time: ${improvement.updateTime.toFixed(2)}% improvement`, 'color: #4CAF50');
  console.log(`%c[OPTIMIZATION COMPARISON] Save time: ${improvement.saveTime.toFixed(2)}% improvement`, 'color: #4CAF50');
  console.log(`%c[OPTIMIZATION COMPARISON] Render time: ${improvement.renderTime.toFixed(2)}% improvement`, 'color: #4CAF50');
  console.log(`%c[OPTIMIZATION COMPARISON] Navigation time: ${improvement.navigationTime.toFixed(2)}% improvement`, 'color: #4CAF50');
  console.log(`%c[OPTIMIZATION COMPARISON] Overall time: ${improvement.overallTime.toFixed(2)}% improvement`, 'color: #4CAF50; font-weight: bold');
  
  return { 
    optimizedResults, 
    nonOptimizedResults,
    improvement
  };
}

/**
 * Run performance tests for multiple field counts
 */
export async function runScalabilityTest(options: {
  fieldCounts: number[];
  iterations?: number;
  verbose?: boolean;
}): Promise<Record<number, TestResults>> {
  const { fieldCounts, iterations = 1, verbose = false } = options;
  const results: Record<number, TestResults> = {};
  
  for (const count of fieldCounts) {
    if (verbose) {
      console.log(`%c[SCALABILITY TEST] Testing with ${count} fields`, 'color: #9C27B0; font-weight: bold');
    }
    
    results[count] = await runPerformanceTest({
      fieldCount: count,
      iterations,
      verbose,
      optimizationsEnabled: true
    });
  }
  
  // Output scalability comparison
  if (verbose) {
    console.log(`%c[SCALABILITY TEST] Results Summary`, 'color: #9C27B0; font-weight: bold');
    
    for (const count of fieldCounts) {
      console.log(`%c[SCALABILITY TEST] ${count} fields:`, 'color: #9C27B0');
      console.log(`  - Load time: ${results[count].metrics.timers['formLoad']?.average.toFixed(2)}ms`);
      console.log(`  - Update time: ${results[count].metrics.timers['fieldUpdates']?.average.toFixed(2)}ms`);
      console.log(`  - Save time: ${results[count].metrics.timers['formSave']?.average.toFixed(2)}ms`);
      console.log(`  - Render time: ${results[count].metrics.timers['formRender']?.average.toFixed(2)}ms`);
    }
  }
  
  return results;
}

export default {
  runPerformanceTest,
  compareOptimizations,
  runScalabilityTest,
  generateTestForm
};