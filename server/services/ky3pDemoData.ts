/**
 * KY3P Demo Data Service
 * 
 * This module provides demo data generation functions for KY3P (Security Assessment) forms.
 * It generates realistic looking data that can be used to auto-fill KY3P forms for testing or demo purposes.
 */

export async function getKy3pDemoData() {
  // Create some demo fields with sample data
  const fields = [
    // Basic Security Controls
    { id: 1001, value: 'Yes', status: 'COMPLETE' },
    { id: 1002, value: 'Implemented enterprise-wide', status: 'COMPLETE' },
    { id: 1003, value: 'Semi-annually', status: 'COMPLETE' },
    { id: 1004, value: 'Yes, certified', status: 'COMPLETE' },
    { id: 1005, value: 'NIST CSF', status: 'COMPLETE' },
    
    // Risk Management
    { id: 1011, value: 'Yes', status: 'COMPLETE' },
    { id: 1012, value: 'Board-level oversight', status: 'COMPLETE' },
    { id: 1013, value: 'Quarterly', status: 'COMPLETE' },
    { id: 1014, value: 'Yes, comprehensive policy', status: 'COMPLETE' },
    { id: 1015, value: 'Yes, enterprise risk framework', status: 'COMPLETE' },
    
    // Access Controls
    { id: 1021, value: 'MFA for all systems', status: 'COMPLETE' },
    { id: 1022, value: 'Just-in-time access', status: 'COMPLETE' },
    { id: 1023, value: 'Yes, automated management', status: 'COMPLETE' },
    { id: 1024, value: 'Yes, with periodic reviews', status: 'COMPLETE' },
    { id: 1025, value: 'Yes, zero trust architecture', status: 'COMPLETE' },
    
    // Data Protection
    { id: 1031, value: 'AES-256 encryption', status: 'COMPLETE' },
    { id: 1032, value: 'Full disk encryption', status: 'COMPLETE' },
    { id: 1033, value: 'Yes, with key rotation', status: 'COMPLETE' },
    { id: 1034, value: 'Yes, automated DLP tools', status: 'COMPLETE' },
    { id: 1035, value: 'Yes, secure disposal protocol', status: 'COMPLETE' },
    
    // Incident Management
    { id: 1041, value: 'Yes, 24/7 SOC', status: 'COMPLETE' },
    { id: 1042, value: 'Yes, automated playbooks', status: 'COMPLETE' },
    { id: 1043, value: 'Monthly tabletop exercises', status: 'COMPLETE' },
    { id: 1044, value: '<24 hours', status: 'COMPLETE' },
    { id: 1045, value: 'Yes, with external IR firm', status: 'COMPLETE' },
    
    // Business Continuity
    { id: 1051, value: 'RTO <4 hours', status: 'COMPLETE' },
    { id: 1052, value: 'RPO <15 minutes', status: 'COMPLETE' },
    { id: 1053, value: 'Quarterly', status: 'COMPLETE' },
    { id: 1054, value: 'Yes, geo-diverse hot sites', status: 'COMPLETE' },
    { id: 1055, value: 'Yes, with annual test', status: 'COMPLETE' },
    
    // Vendor Management
    { id: 1061, value: 'Yes, formalized program', status: 'COMPLETE' },
    { id: 1062, value: 'Annual', status: 'COMPLETE' },
    { id: 1063, value: 'Yes, tiered approach', status: 'COMPLETE' },
    { id: 1064, value: 'Yes, documented standards', status: 'COMPLETE' },
    { id: 1065, value: 'Yes, right to audit clause', status: 'COMPLETE' },
    
    // Compliance & Audit
    { id: 1071, value: 'ISO 27001, SOC 2 Type II, HITRUST', status: 'COMPLETE' },
    { id: 1072, value: 'Annually', status: 'COMPLETE' },
    { id: 1073, value: 'Yes, automated monitoring', status: 'COMPLETE' },
    { id: 1074, value: 'Yes, documented process', status: 'COMPLETE' },
    { id: 1075, value: 'Yes, managed by legal', status: 'COMPLETE' },
    
    // Network Security
    { id: 1081, value: 'Next-gen firewalls, IDS/IPS', status: 'COMPLETE' },
    { id: 1082, value: 'Weekly automated scans', status: 'COMPLETE' },
    { id: 1083, value: 'Monthly', status: 'COMPLETE' },
    { id: 1084, value: 'Yes, segment by risk', status: 'COMPLETE' },
    { id: 1085, value: 'Yes, with anomaly detection', status: 'COMPLETE' },
    
    // Endpoint Security
    { id: 1091, value: 'EDR deployed enterprise-wide', status: 'COMPLETE' },
    { id: 1092, value: 'Yes, centrally managed', status: 'COMPLETE' },
    { id: 1093, value: 'Yes, automated patching', status: 'COMPLETE' },
    { id: 1094, value: 'Yes, with application whitelisting', status: 'COMPLETE' },
    { id: 1095, value: 'Yes, sandboxed environment', status: 'COMPLETE' },
    
    // SDLC & Change Management
    { id: 1101, value: 'Yes, integrated into CI/CD', status: 'COMPLETE' },
    { id: 1102, value: 'Yes, formal review process', status: 'COMPLETE' },
    { id: 1103, value: 'Automated static/dynamic testing', status: 'COMPLETE' },
    { id: 1104, value: 'Yes, with version control', status: 'COMPLETE' },
    { id: 1105, value: 'Mature DevSecOps model', status: 'COMPLETE' },
    
    // Security Training
    { id: 1111, value: 'Monthly', status: 'COMPLETE' },
    { id: 1112, value: 'Yes, role-based training', status: 'COMPLETE' },
    { id: 1113, value: 'Quarterly', status: 'COMPLETE' },
    { id: 1114, value: 'Yes, continuous education', status: 'COMPLETE' },
    { id: 1115, value: 'Yes, security champions program', status: 'COMPLETE' },
    
    // Add another 40 fields to reach approximately 120 fields
    // Physical Security
    { id: 1121, value: 'Multi-factor access', status: 'COMPLETE' },
    { id: 1122, value: '24/7 monitoring', status: 'COMPLETE' },
    { id: 1123, value: 'Yes, visitor management system', status: 'COMPLETE' },
    { id: 1124, value: 'Yes, security staff on premises', status: 'COMPLETE' },
    { id: 1125, value: 'Yes, environmental monitoring', status: 'COMPLETE' },
    
    // Privacy Controls
    { id: 1131, value: 'Yes, formal program', status: 'COMPLETE' },
    { id: 1132, value: 'Dedicated CPO/DPO', status: 'COMPLETE' },
    { id: 1133, value: 'Yes, privacy by design', status: 'COMPLETE' },
    { id: 1134, value: 'EU-US Privacy Shield', status: 'COMPLETE' },
    { id: 1135, value: 'Annual assessment', status: 'COMPLETE' },
    
    // Mobile Security
    { id: 1141, value: 'Yes, MDM solution', status: 'COMPLETE' },
    { id: 1142, value: 'Yes, with remote wipe', status: 'COMPLETE' },
    { id: 1143, value: 'Containerized apps', status: 'COMPLETE' },
    { id: 1144, value: 'Yes, device encryption', status: 'COMPLETE' },
    { id: 1145, value: 'Yes, secure comms channel', status: 'COMPLETE' },
    
    // Cloud Security
    { id: 1151, value: 'AWS, Azure, GCP', status: 'COMPLETE' },
    { id: 1152, value: 'Yes, cloud security posture management', status: 'COMPLETE' },
    { id: 1153, value: 'Automated monitoring', status: 'COMPLETE' },
    { id: 1154, value: 'Yes, least privilege', status: 'COMPLETE' },
    { id: 1155, value: 'Yes, cloud WAF', status: 'COMPLETE' },
    
    // Threat Intelligence
    { id: 1161, value: 'Multiple commercial feeds', status: 'COMPLETE' },
    { id: 1162, value: 'Yes, intelligence platform', status: 'COMPLETE' },
    { id: 1163, value: 'Yes, active monitoring', status: 'COMPLETE' },
    { id: 1164, value: 'Yes, threat hunting', status: 'COMPLETE' },
    { id: 1165, value: 'Yes, ISAC/ISAO member', status: 'COMPLETE' },
    
    // Identity Management
    { id: 1171, value: 'SSO for all apps', status: 'COMPLETE' },
    { id: 1172, value: 'Yes, identity governance', status: 'COMPLETE' },
    { id: 1173, value: 'Yes, PAM solution', status: 'COMPLETE' },
    { id: 1174, value: 'Quarterly reviews', status: 'COMPLETE' },
    { id: 1175, value: 'Yes, risk-based auth', status: 'COMPLETE' },
    
    // Data Classification
    { id: 1181, value: 'Automated tools', status: 'COMPLETE' },
    { id: 1182, value: 'Yes, documented schema', status: 'COMPLETE' },
    { id: 1183, value: 'Yes, data inventory', status: 'COMPLETE' },
    { id: 1184, value: 'Yes, handling procedures', status: 'COMPLETE' },
    { id: 1185, value: 'Yes, yearly review', status: 'COMPLETE' },
    
    // Supply Chain Security
    { id: 1191, value: 'Yes, formal program', status: 'COMPLETE' },
    { id: 1192, value: 'Annual assessment', status: 'COMPLETE' },
    { id: 1193, value: 'Yes, component verification', status: 'COMPLETE' },
    { id: 1194, value: 'Yes, secure delivery', status: 'COMPLETE' },
    { id: 1195, value: 'Yes, code signing', status: 'COMPLETE' },
  ];

  return {
    fields
  };
}
