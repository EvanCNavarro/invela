import { db } from "@db";
import { securityFields, tasks } from "@db/schema";
import { sql, eq } from "drizzle-orm";

/**
 * Updated security sections for streamlined assessment
 */
const NEW_SECTIONS = [
  'Identity and Access Management',
  'Data Protection and Privacy',
  'Application and API Security',
  'Infrastructure and Cloud Security',
  'Security Operations',
  'Security Governance and Risk Management'
];

/**
 * Updated security field questions
 */
const NEW_SECURITY_FIELDS = [
  // 1. Identity and Access Management
  {
    section: 'Identity and Access Management',
    field_key: 'iam_access_control_strategy',
    label: 'Access Control Strategy',
    description: 'How does your company implement and enforce access controls to prevent unauthorized access to systems and data?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Identity and Access Management',
    field_key: 'iam_access_review_process',
    label: 'Access Review Process',
    description: 'What is your process and frequency for reviewing and updating user access privileges to sensitive systems and data?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Identity and Access Management',
    field_key: 'iam_privileged_access_management',
    label: 'Privileged Access Management',
    description: 'How does your company manage and monitor privileged account access (administrator, root, service accounts)?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Identity and Access Management',
    field_key: 'iam_multi_factor_authentication',
    label: 'Multi-Factor Authentication',
    description: 'For which systems and user roles does your company require multi-factor authentication?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Identity and Access Management',
    field_key: 'iam_identity_management_lifecycle',
    label: 'Identity Management Lifecycle',
    description: 'How does your company manage user identities throughout their lifecycle (provisioning, modifications, deprovisioning)?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Identity and Access Management',
    field_key: 'iam_single_sign_on_implementation',
    label: 'Single Sign-On Implementation',
    description: 'Has your company implemented Single Sign-On (SSO) and for which applications?',
    field_type: 'text',
    is_required: true
  },

  // 2. Data Protection and Privacy
  {
    section: 'Data Protection and Privacy',
    field_key: 'data_classification_system',
    label: 'Data Classification System',
    description: 'How does your company classify data by sensitivity, and what controls are applied to each classification level?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Data Protection and Privacy',
    field_key: 'data_encryption_strategy',
    label: 'Data Encryption Strategy',
    description: 'What encryption methods and technologies does your company use to protect sensitive data at rest and in transit?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Data Protection and Privacy',
    field_key: 'data_loss_prevention',
    label: 'Data Loss Prevention',
    description: 'What data loss prevention (DLP) measures does your company have in place?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Data Protection and Privacy',
    field_key: 'data_retention_deletion',
    label: 'Data Retention and Deletion',
    description: 'What policies and procedures does your company follow for data retention and secure data deletion?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Data Protection and Privacy',
    field_key: 'privacy_compliance_program',
    label: 'Privacy Compliance Program',
    description: 'How does your company ensure compliance with privacy regulations such as GDPR and CCPA?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Data Protection and Privacy',
    field_key: 'data_protection_impact_assessments',
    label: 'Data Protection Impact Assessments',
    description: 'When and how does your company conduct Data Protection Impact Assessments for high-risk data processing?',
    field_type: 'text',
    is_required: true
  },

  // 3. Application and API Security
  {
    section: 'Application and API Security',
    field_key: 'app_secure_sdlc',
    label: 'Secure Software Development Lifecycle',
    description: 'How is security integrated into your software development lifecycle?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Application and API Security',
    field_key: 'app_api_security_controls',
    label: 'API Security Controls',
    description: 'What security measures protect your APIs from common threats (authentication, rate limiting, input validation)?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Application and API Security',
    field_key: 'app_web_application_security',
    label: 'Web Application Security',
    description: 'How does your company protect web applications from OWASP Top 10 vulnerabilities?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Application and API Security',
    field_key: 'app_devsecops_integration',
    label: 'DevSecOps Integration',
    description: 'How are security checks and tests automated within your CI/CD pipeline?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Application and API Security',
    field_key: 'app_mobile_application_security',
    label: 'Mobile Application Security',
    description: 'If applicable, what security controls are implemented in your mobile applications?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Application and API Security',
    field_key: 'app_code_security_review',
    label: 'Code Security and Review',
    description: 'What processes are in place for secure code reviews and vulnerability scanning?',
    field_type: 'text',
    is_required: true
  },

  // 4. Infrastructure and Cloud Security
  {
    section: 'Infrastructure and Cloud Security',
    field_key: 'infra_cloud_security_architecture',
    label: 'Cloud Security Architecture',
    description: 'How does your company secure cloud environments and resources?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Infrastructure and Cloud Security',
    field_key: 'infra_network_security_controls',
    label: 'Network Security Controls',
    description: 'What network security measures (firewalls, network segmentation, IDS/IPS) does your company implement?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Infrastructure and Cloud Security',
    field_key: 'infra_endpoint_security_strategy',
    label: 'Endpoint Security Strategy',
    description: 'How does your company secure workstations, laptops, and mobile devices?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Infrastructure and Cloud Security',
    field_key: 'infra_vulnerability_management',
    label: 'Vulnerability Management',
    description: 'What is your process for identifying, prioritizing, and remediating security vulnerabilities?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Infrastructure and Cloud Security',
    field_key: 'infra_zero_trust_implementation',
    label: 'Zero Trust Implementation',
    description: 'What steps has your company taken to implement zero trust security principles?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Infrastructure and Cloud Security',
    field_key: 'infra_container_kubernetes_security',
    label: 'Container and Kubernetes Security',
    description: 'If applicable, how does your company secure containerized environments?',
    field_type: 'text',
    is_required: true
  },

  // 5. Security Operations
  {
    section: 'Security Operations',
    field_key: 'secops_monitoring_capabilities',
    label: 'Security Monitoring Capabilities',
    description: 'How does your company monitor systems and networks for security threats and anomalies?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Operations',
    field_key: 'secops_incident_response_process',
    label: 'Incident Response Process',
    description: 'What is your process for detecting, responding to, and recovering from security incidents?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Operations',
    field_key: 'secops_threat_intelligence_program',
    label: 'Threat Intelligence Program',
    description: 'How does your company collect, analyze, and use threat intelligence?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Operations',
    field_key: 'secops_security_testing',
    label: 'Security Testing',
    description: 'What types of security testing (penetration testing, red team exercises) does your company perform and how often?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Operations',
    field_key: 'secops_security_metrics_kpis',
    label: 'Security Metrics and KPIs',
    description: 'What metrics and KPIs does your company use to measure security performance and effectiveness?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Operations',
    field_key: 'secops_log_management',
    label: 'Log Management',
    description: 'How does your company collect, store, and analyze security logs?',
    field_type: 'text',
    is_required: true
  },

  // 6. Security Governance and Risk Management
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_information_security_policy',
    label: 'Information Security Policy',
    description: 'Describe your company\'s information security policy framework and how it\'s maintained.',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_risk_assessment_methodology',
    label: 'Risk Assessment Methodology',
    description: 'How does your company identify, assess, and manage information security risks?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_security_awareness_training',
    label: 'Security Awareness and Training',
    description: 'What security awareness and training programs are provided to employees?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_third_party_risk_management',
    label: 'Third-Party Risk Management',
    description: 'How does your company assess and manage security risks from vendors and service providers?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_compliance_management_program',
    label: 'Compliance Management Program',
    description: 'How does your company ensure compliance with security requirements, standards, and regulations?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_business_continuity_dr',
    label: 'Business Continuity and Disaster Recovery',
    description: 'How does your company ensure business continuity and disaster recovery for critical systems?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_physical_security_measures',
    label: 'Physical Security Measures',
    description: 'What physical security controls protect your facilities, equipment, and data centers?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_change_management_process',
    label: 'Change Management Process',
    description: 'How does your company ensure that changes to systems and applications don\'t compromise security?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_security_organization_structure',
    label: 'Security Organization Structure',
    description: 'How is the security function organized within your company, and who has ultimate responsibility?',
    field_type: 'text',
    is_required: true
  },
  {
    section: 'Security Governance and Risk Management',
    field_key: 'gov_security_budget_resources',
    label: 'Security Budget and Resource Allocation',
    description: 'How does your company determine and allocate resources for information security?',
    field_type: 'text',
    is_required: true
  },
];

/**
 * Update security fields with new streamlined questions
 */
export async function updateSecurityFields() {
  console.log('[DB Migration] Updating security fields with streamlined questions...');
  
  try {
    // First, we need to clear existing security responses to avoid FK constraint issues
    console.log('[DB Migration] Removing existing security responses...');
    await db.execute(sql`DELETE FROM security_responses`);
    
    // Now clear existing security fields
    console.log('[DB Migration] Clearing existing security fields...');
    await db.execute(sql`DELETE FROM security_fields`);
    
    // Insert new security fields
    console.log('[DB Migration] Inserting new streamlined security fields...');
    const timestamp = new Date();
    const fieldsToInsert = NEW_SECURITY_FIELDS.map(field => ({
      section: field.section,
      field_key: field.field_key,
      label: field.label,
      description: field.description,
      field_type: field.field_type,
      is_required: field.is_required,
      options: null,
      validation_rules: null,
      metadata: {
        streamlined: true,
        updated_at: timestamp.toISOString()
      },
      status: 'ACTIVE',
      created_at: timestamp,
      updated_at: timestamp
    }));
    
    const insertedFields = await db.insert(securityFields)
      .values(fieldsToInsert)
      .returning();
    
    console.log(`[DB Migration] Successfully inserted ${insertedFields.length} streamlined security fields`);
    
    // Update any security assessment tasks to reset their progress
    console.log('[DB Migration] Resetting progress on security assessment tasks...');
    await db.update(tasks)
      .set({
        progress: 0,
        status: 'not_started',
        updated_at: timestamp
      })
      .where(eq(tasks.task_type, 'security_assessment'));
    
    console.log('[DB Migration] Security assessment migration completed successfully');
    return true;
  } catch (error) {
    console.error('[DB Migration] Error updating security fields:', error);
    throw error;
  }
}