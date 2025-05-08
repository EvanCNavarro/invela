
-- Create a temporary table for all the fields with their demo_autofill values
CREATE TEMPORARY TABLE temp_all_ky3p_fields (
  field_key TEXT PRIMARY KEY,
  demo_autofill TEXT
);

-- Insert all values
INSERT INTO temp_all_ky3p_fields (field_key, demo_autofill) VALUES
('externalSystems', 'Our external information systems inventory is updated monthly and validated through automated discovery tools and manual audits.'),
('breachNotification', 'Controllers are promptly notified of privacy data breaches within 24 hours of our organization''s awareness, including detailed incident information and remediation steps.'),
('privacyIncidentProcedure', 'Formal procedures are in place for reporting, managing, and responding to privacy-related incidents, ensuring prompt and appropriate actions are taken.'),
('publicPrivacyNotice', 'Privacy notices and policies are publicly accessible at every point where personal data is collected, stored, processed, or transmitted, clearly detailing usage and rights.'),
('privacyLawCompliance', 'Privacy policies and standards are fully compliant with global and regional privacy laws, including GDPR, CCPA, CPPA, and GLBA, supported by regular compliance audits.'),
('dataRetentionLimits', 'Personal data is retained only as long as required to fulfill the explicit purposes for which it was collected, after which it is securely destroyed.'),
('personalDataMinimization', 'Collection and processing of personal data are strictly limited to essential business purposes, following clearly documented data minimization principles.'),
('dataMinimizationTechniques', 'Data minimization is enforced through technical measures such as pseudonymization, anonymization, and strong encryption practices in line with privacy regulations.'),
('dpoAppointment', 'A Data Protection Officer (DPO) has been formally appointed, responsible for overseeing compliance and ensuring informed consent mechanisms, including clear consent withdrawal procedures.'),
('developmentLifecycle', 'Our System Development Lifecycle (SDLC) includes defined stages: requirements gathering, secure development, rigorous testing, deployment, and post-release maintenance.'),
('secureCodeReviews', 'Secure source code reviews are performed regularly to ensure developers follow established secure coding standards and practices prior to deployment.'),
('codeScanning', 'Static and dynamic source code scanning tools are used during development cycles and prior to deployment to identify and remediate security vulnerabilities.'),
('developerAccessControls', 'Developer access to production environments is strictly controlled and monitored, restricted by role-based permissions and audited regularly.'),
('backupRecoveryDocument', 'Our backup and recovery documentation clearly defines requirements and procedures for system backups, data restoration, and data integrity checks.'),
('cyberLiabilityInsurance', 'We hold Cyber Liability, Network Security, and Privacy Liability Insurance with coverage adequate to mitigate potential cyber incident impacts.'),
('dataLocationTracking', 'Cloud data locations are tracked and documented through automated asset management tools and regular manual validations.'),
('alternateFacilities', 'We regularly test connectivity, recovery time objectives, and system capacity at alternate recovery sites through annual resilience exercises.'),
('logicalAccess', 'Logical access is granted only after managerial approval, with regular access reviews conducted quarterly to confirm continued business justification.'),
('detectionSystems', 'Notifications from detection systems trigger immediate investigation protocols managed by our 24/7 security operations center (SOC).'),
('disasterRecoveryTesting', 'Comprehensive disaster recovery tests covering all critical technology components are conducted annually, with results documented and improvements identified.'),
('appVulnerabilityScanning', 'Application vulnerability scans are conducted quarterly and immediately after significant application changes, identifying and mitigating vulnerabilities promptly.'),
('testingIssueTracking', 'Issues identified during continuity tests are documented, tracked through resolution, and addressed with specific action plans and targeted completion dates.'),
('cloudDataRetrieval', 'Cloud service customers can securely retrieve their data using encrypted application programming interfaces (APIs), supporting interoperability and easy portability.'),
('recoverySystemsUpdate', 'Recovery documentation and systems at alternate sites are promptly updated following production system and business process changes.'),
('webApplicationSecurity', 'Application-layer security measures include Web Application Firewalls (WAFs) and proxy services, providing protection against common web-based threats.'),
('technicalResilience', 'Technical resilience mechanisms employed include load balancing, failover clustering, and hot-swappable hardware to ensure continuous operations under adverse conditions.'),
('externalDependencyResilience', 'Critical external dependencies and business partners are integrated into our resilience strategy, participating in joint planning and periodic exercises.'),
('backupProcessTesting', 'Backup and replication processes are thoroughly tested quarterly, including full-system recoveries, to validate their effectiveness and reliability.'),
('penetrationTesting', 'Application penetration tests are performed annually and after significant updates, utilizing independent third-party testing to validate application security.'),
('incidentContainment', 'We maintain documented containment strategies tailored to various incident scenarios, enabling rapid isolation and mitigation of security threats.'),
('privacyPolicyDocument', 'Our written privacy policy outlines data collection practices, usage, sharing, retention periods, and individuals'' rights regarding their personal data.'),
('policyAcknowledgement', 'Employees must formally acknowledge the acceptable use policy electronically before receiving access to company systems and data.'),
('changeManagement', 'Our change management program includes documented policies, formal review processes, and clearly defined change authorization responsibilities.'),
('remoteMfa', 'Multifactor authentication (MFA) is mandated for all remote network access, using secure methods such as mobile authenticator apps or hardware tokens.'),
('securityPolicy', 'Our organization maintains documented cybersecurity policies covering data protection, access control, and incident response, reviewed and updated annually.'),
('changeAuditTrail', 'A detailed audit trail of all system changes is maintained, including timestamps, authorizations, justifications, and rollback procedures.'),
('regulatoryCompliance', 'Cybersecurity strategies are explicitly aligned with applicable legal and regulatory requirements, including regular compliance audits and reporting.'),
('dataRetentionGovernance', 'Data retention governance is documented, outlining policies, schedules, responsibilities, and processes for secure data storage, retention, and timely disposal.'),
('acceptableUse', 'Our acceptable use governance document covers permitted technology use, restrictions, and user responsibilities, communicated clearly to all employees.'),
('centralizedAuthentication', 'Centralized account management uses Active Directory and Single Sign-On (SSO) solutions to manage credentials securely, encrypting them both at rest and in transit.'),
('dataClassificationGovernance', 'Data governance and classification policies define data sensitivity levels, handling requirements, and access control measures across all organizational assets.'),
('iamGovernance', 'Our identity and access management (IAM) governance document clearly defines user access provisioning, management, and de-provisioning procedures.'),
('cloudSecurityRequirements', 'Cloud service infrastructure security requirements and virtualization practices are documented, reviewed annually, and aligned with industry best practices.'),
('threatManagementGovernance', 'Threat and vulnerability management governance is documented, outlining processes for identification, assessment, prioritization, and mitigation of security threats.'),
('amlGovernance', 'Our anti-money laundering (AML) governance is documented and enforced through clearly defined procedures, ongoing employee training, and regular compliance checks.'),
('antiFraudGovernance', 'Anti-fraud governance measures include detailed policies, controls, monitoring systems, employee training, and clear reporting procedures.'),
('loggingGovernance', 'Logging program governance documents the procedures and standards for capturing, reviewing, and retaining system logs, supporting incident investigations and compliance reporting.'),
('encryptionGovernance', 'Our encryption program governance specifies encryption standards, protocols, and procedures for managing cryptographic implementations across our environment.'),
('transactionAuthentication', 'Transaction authentication processes employ advanced, secure methods such as multifactor authentication and transaction verification codes to prevent fraud and errors.'),
('equipmentRedundancy', 'Critical business equipment has redundant counterparts independently located at a separate, industry-standard minimum distance.'),
('passwordVisibility', 'Password fields during login processes are concealed, encrypted, and obscured to prevent accidental disclosure or viewing by unauthorized individuals.'),
('privilegedUserLogs', 'Privileged user activities are logged, regularly reviewed, and monitored closely for anomalies or unauthorized actions.'),
('physicalMfa', 'Physical access at data-handling locations requires multifactor authentication with unique identification badges and biometric verification.'),
('executiveCyberTraining', 'Executive cybersecurity training is provided annually, highlighting current threats, strategic risks, and governance responsibilities for senior management.'),
('complianceTraining', 'Compliance-related training sessions are provided quarterly, covering critical regulations, ethical standards, and procedural compliance requirements.'),
('annualSecurityTraining', 'All employees complete cybersecurity awareness training annually, covering phishing, password security, and information handling best practices.'),
('developerTraining', 'Developers, including subcontractors, complete mandatory secure development training annually, emphasizing secure coding practices and vulnerability prevention.'),
('accountCompromise', 'Suspected account compromises trigger immediate password resets, account reviews, and security incident investigations to mitigate further risk.'),
('passwordPolicies', 'Password policies conform to industry best practices, requiring complexity, periodic changes, and preventing reuse across all systems handling client data.'),
('defaultPasswords', 'Default passwords are immediately changed, and unnecessary default accounts are disabled before any system deployment or configuration in production environments.'),
('deviceAccessMonitoring', 'We utilize advanced network monitoring tools and endpoint protection solutions to detect, monitor, and control access to devices, connections, and data transfers.'),
('crisisTeamAvailability', 'The crisis response team is staffed on a 24/7/365 basis, supported by trained alternates and robust escalation protocols.'),
('vendorContracts', 'Contractual agreements with critical subcontractors explicitly define and enforce compliance with our established resilience standards and expectations.'),
('staffResilience', 'Our resilience program includes remote work options, employee assistance services, and clear communication channels to support staff during disruptions.'),
('pandemicResponse', 'Our resilience measures explicitly include pandemic management plans, protocols for infectious disease outbreaks, natural event responses, and workforce absenteeism contingencies.'),
('vendorBcmReview', 'Subcontractors'' resilience programs are reviewed annually to verify alignment with our standards and recovery objectives through audits and contractual obligations.'),
('continuityTesting', 'Comprehensive business continuity tests are documented annually for all facilities and services processing client data, ensuring consistent operational readiness.'),
('resiliencePolicy', 'Our resilience policies cover comprehensive business continuity and disaster recovery measures, documented and enforced across all critical operational sites.'),
('bcpRolesResponsibilities', 'Our business continuity plan explicitly defines personnel roles, responsibilities, and skills required for effective response and recovery during disruptions.'),
('crisisManagementPlan', 'Our crisis management plan clearly outlines response actions, communication protocols, and coordination strategies across all client data-handling locations.'),
('bcpPolicyReview', 'The business continuity and recovery policy undergoes a comprehensive review and formal approval annually to ensure it reflects our current operational environment.'),
('bcpCommunicationPlan', 'The business continuity communication plan clearly specifies methods, channels, and responsibilities for communicating with internal and external stakeholders during events.'),
('continuityTraining', 'Employees undergo annual training covering their business continuity responsibilities, roles during disruptions, and familiarization with continuity plans.'),
('crisisTeamRoles', 'Crisis response team roles and responsibilities are clearly documented and reviewed semi-annually, ensuring clarity at all business process levels.'),
('assetRetrieval', 'Assets from terminated employees and subcontractors are collected and inventoried on or before their last day, ensuring accurate reconciliation.'),
('cloudInteroperability', 'Our resiliency approach specifically addresses cloud service portability, interoperability, and exit strategies to mitigate vendor lock-in risks.'),
('immutableRecoveryData', 'Immutable instances of recovery data are maintained using secure, air-gapped storage solutions, protected from modification or unauthorized access.'),
('powerBackup', 'Business-critical equipment is supported by multiple power sources, including backup generators and redundant power grids, routinely maintained and tested quarterly.'),
('securityExceptions', 'We manage exceptions through a centralized registry, reviewed monthly to ensure timely mitigation.'),
('wirelessSegmentation', 'Non-production and guest wireless networks are segregated from production systems through logical network isolation and firewall rules.'),
('standardChangeControl', 'All system and operational changes undergo a standardized change control review process, documented and approved through our automated tracking system.'),
('emergingTechnologies', 'We integrate cybersecurity considerations at the beginning of the evaluation phase for emerging technologies, following our defined security framework.'),
('recoveryObjectives', 'Our RPO ensures data integrity by limiting potential data loss to less than one hour, fully aligning with our defined 4-hour RTO.'),
('criticalOperations', 'Our critical operational objectives include restoring service functionality within 4 hours and maintaining data integrity with minimal data loss.'),
('fraudActivityReporting', 'Suspected and confirmed fraud activities are promptly reported and communicated to affected clients using structured reporting processes and secure channels.'),
('cybersecurityRoles', 'Roles and responsibilities within our cybersecurity team are clearly documented, updated annually, and communicated during onboarding and ongoing training.'),
('insuranceCoverage', 'Our organization maintains comprehensive insurance coverage, including liability, property damage, cybersecurity, and operational risk insurance.'),
('networkRedundancy', 'We employ diverse telecommunication carriers, redundant network pathways, and scalable circuits designed around risk assessments and operational requirements.'),
('dataLossPrevention', 'Our DLP measures include endpoint monitoring, real-time alerts, and automatic prevention to detect and prevent unauthorized access or data leakage.'),
('dataLossGovernance', 'Information and data loss prevention governance is documented, with clear policies, detection mechanisms, and periodic training for employees.'),
('activityLogging', 'User activities across all critical systems and applications are logged and monitored continuously to detect and respond to suspicious behavior.'),
('incidentDocumentation', 'Cybersecurity incidents are systematically documented and reported, including incident timelines, actions taken, and post-incident analysis.'),
('databaseSynchronization', 'Database mirroring, replication, and synchronization technologies are actively used to ensure continuous data protection and rapid recovery capabilities.'),
('webFiltering', 'We use advanced web-filtering technology to block and monitor access to high-risk or malicious websites, updated continuously based on threat intelligence.'),
('encryptionVerification', 'Regular audits and verification processes confirm that no client data remains unencrypted at rest or in transit, with quarterly validation checks.'),
('clientDataSegregation', 'We implement strict logical and physical segregation of client data through virtual networks, dedicated servers, and secure data storage areas.'),
('tlsEncryptionStandards', 'Client data in transit is encrypted using modern protocols equivalent to TLS 1.2 or greater, regularly audited for compliance with security standards.'),
('endpointMalwareScanning', 'Endpoint devices, including servers, laptops, and workstations, are protected by regularly updated antivirus and antimalware software with automated scanning enabled.'),
('emailMalwareScanning', 'Email attachments and embedded links are automatically scanned for malware and phishing threats using advanced email security solutions.'),
('threatIntelligence', 'We maintain active subscriptions and partnerships with leading cyber threat intelligence agencies to stay updated on emerging threats.'),
('impactAnalysis', 'A detailed Business Impact Analysis (BIA) is conducted annually, defining recovery priorities, resource requirements, and acceptable downtime for critical operations.'),
('realisticTesting', 'We use realistic business-disruption scenarios during our annual continuity exercises to verify our capability to meet defined recovery objectives.'),
('riskAssessment', 'We conduct information security risk assessments bi-annually, identifying and mitigating emerging risks.'),
('riskBasedControls', 'Our cybersecurity team updates security controls quarterly based on outcomes of periodic risk assessments to stay within our risk tolerance.'),
('incidentReporting', 'Cyber incidents and threats are reported promptly through structured channels, ensuring rapid communication internally and externally, supported by regular updates.'),
('keyManagementStrategy', 'A centralized cryptographic key management system securely stores and regularly rotates encryption keys, following industry best practices.'),
('incidentPlanTesting', 'We test our incident management plan annually through scenario-based simulations and tabletop exercises, documenting outcomes and improvements.'),
('incidentManagementPlan', 'Our incident management plan is comprehensively documented, covering detection, response, communication, and recovery procedures, and reviewed annually.'),
('incidentCoordination', 'Incident response involves coordinated efforts between internal teams, external stakeholders, and, if necessary, engagement with law enforcement authorities.'),
('incidentPlanUpdates', 'Incident response plans are reviewed and updated quarterly, integrating insights from real incidents, threat intelligence, and best practices shared by industry partners.'),
('incidentEscalation', 'Incident escalation protocols are clearly documented, outlining specific thresholds, escalation paths, and communication responsibilities for various incident levels.'),
('incidentRoles', 'Our incident response program clearly specifies team roles, decision-making authorities, and escalation paths, documented and reviewed bi-annually.'),
('incidentResponse', 'Our incident response plan is reviewed quarterly by our security team and formally approved annually by senior management following a comprehensive audit.'),
('incidentContainmentSpeed', 'Cybersecurity incidents are contained and mitigated promptly through predefined procedures, with actions initiated within 1 hour of detection.'),
('forensicSupport', 'Our cybersecurity team possesses dedicated forensic investigation tools and specialists to thoroughly examine and respond to incidents promptly.'),
('clientIncidentNotification', 'Clients are notified promptly about security incidents affecting their data through secure communication channels, including incident details and mitigation steps.'),
('logRetention', 'We maintain immediate access to the most recent three months of activity and security event logs, stored securely and reviewed frequently.'),
('cyberInvestigation', 'Cyber events undergo thorough analysis within 24 hours to identify root cause, scope, damage assessment, and preventive recommendations.'),
('vulnerabilityRootCause', 'Root cause analysis of vulnerabilities is conducted systematically, with outcomes documented and used proactively to reduce future occurrences.'),
('disruptionRisk', 'Risk assessments are performed annually to evaluate potential disruptions, documenting risks and mitigation measures as part of our resiliency program.');

-- Update all fields in one go
UPDATE ky3p_fields AS kf
SET demo_autofill = tf.demo_autofill
FROM temp_all_ky3p_fields AS tf
WHERE kf.field_key = tf.field_key;

-- Check how many fields were updated
SELECT COUNT(*) AS fields_updated
FROM ky3p_fields AS kf
JOIN temp_all_ky3p_fields AS tf
ON kf.field_key = tf.field_key;

-- Sample of updated fields
SELECT field_key, demo_autofill
FROM ky3p_fields
ORDER BY RANDOM()
LIMIT 5;

-- Drop the temporary table
DROP TABLE temp_all_ky3p_fields;
