WITH RECURSIVE question_data AS (
  SELECT * FROM (VALUES
    ('Security', 'Access Control', 'How does your company prevent unauthorized access to its systems?', 'We enforce role-based access control (RBAC), use multi-factor authentication (MFA), and restrict network access via firewalls.', 'Look for ''Access Controls,'' ''Logical Security,'' or ''User Authentication.'' Identify mentions of RBAC, MFA, access management policies, and firewall rules.', 27),
    ('Security', 'Incident Response', 'What steps does your company take to detect and respond to security incidents?', 'We have a Security Operations Center (SOC) that monitors logs 24/7, automated alerts for suspicious activity, and a formal incident response plan.', 'Search for ''Incident Management,'' ''Security Monitoring,'' or ''SOC Procedures.'' Look for security logs, automated alerts, SIEM tools, or response timelines.', 31),
    ('Security', 'Access Reviews', 'How often does your company review and update employee access to sensitive systems?', 'Access is reviewed quarterly, and inactive accounts are automatically disabled after 30 days.', 'Scan for ''Access Review,'' ''User Access Controls,'' or ''Privileged Access Management.'' Identify review schedules, deactivation policies, or auditing processes.', 18),
    ('Security', 'Data Encryption', 'What encryption methods does your company use to protect sensitive data?', 'We use AES-256 encryption for stored data and TLS 1.3 for all data transmissions.', 'Look under ''Data Protection,'' ''Encryption Standards,'' or ''Cryptography.'' Identify mentions of AES, TLS, full-disk encryption, or encryption key management.', 24),
    ('Security', 'Vendor Security', 'Does your company assess and monitor third-party vendors to ensure they meet security standards? If so, how?', 'We require all vendors to provide a SOC 2 report and conduct annual security audits.', 'Search for ''Third-Party Risk Management,'' ''Vendor Assessment,'' or ''Subservice Organizations.'' Look for vendor security audits, contractual obligations, or compliance reviews.', 12)
    -- Continue with remaining questions...
  ) as t(wizard_section, question_label, question, example_response, ai_search_instructions, partial_risk_score_max)
)
INSERT INTO card_fields (
  field_key,
  wizard_section,
  question_label,
  question,
  example_response,
  ai_search_instructions,
  partial_risk_score_max
)
SELECT
  LOWER(REGEXP_REPLACE(wizard_section || '_' || question_label, '[^a-zA-Z0-9]+', '_', 'g')) as field_key,
  wizard_section,
  question_label,
  question,
  example_response,
  ai_search_instructions,
  partial_risk_score_max
FROM question_data
WHERE NOT EXISTS (
  SELECT 1 FROM card_fields 
  WHERE field_key = LOWER(REGEXP_REPLACE(question_data.wizard_section || '_' || question_data.question_label, '[^a-zA-Z0-9]+', '_', 'g'))
);
