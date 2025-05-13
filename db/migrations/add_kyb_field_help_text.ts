import { sql } from "drizzle-orm";
import { db } from '@db';

/**
 * This migration adds help text (tooltips) for KYB form fields
 */
export default async function addKybFieldHelpText() {
  try {
    console.log('[KYB Migration] Starting to update KYB field help text');

    // Define help text for each field
    const fieldHelpTexts = [
      { field_key: 'legalEntityName', help_text: 'The official name under which your business is registered with government authorities.' },
      { field_key: 'registrationNumber', help_text: 'In the US, this is typically your EIN (Employer Identification Number) or state entity registration number.' },
      { field_key: 'incorporationDate', help_text: 'The date when your company was legally established as per your registration documents.' },
      { field_key: 'businessType', help_text: 'Examples include LLC, Corporation, Partnership, Sole Proprietorship, etc.' },
      { field_key: 'jurisdiction', help_text: 'The country, state, or region where your company is officially registered.' },
      { field_key: 'registeredAddress', help_text: 'The official address listed on your business registration documents.' },
      { field_key: 'companyPhone', help_text: 'The primary business contact number used for official communications.' },
      { field_key: 'contactEmail', help_text: 'The email address of the person responsible for this KYB form submission.' },
      { field_key: 'directorsAndOfficers', help_text: 'List all directors and officers who have decision-making authority in the company.' },
      { field_key: 'ultimateBeneficialOwners', help_text: 'Individuals who ultimately own or control 25% or more of the company, directly or indirectly.' },
      { field_key: 'authorizedSigners', help_text: 'Individuals who are legally permitted to sign contracts or other binding documents on behalf of the company.' },
      { field_key: 'governmentOwnership', help_text: 'Indicate if any government entity (local, state, federal, or foreign) has ownership or control of the company.' },
      { field_key: 'priorNames', help_text: 'Include all previous legal names, "doing business as" names, or other trade names used in the last five years.' },
      { field_key: 'externalAudit', help_text: 'Non-financial audits may include security audits, SOC2, ISO, or other compliance certifications.' },
      { field_key: 'controlEnvironment', help_text: 'A single control environment means consistent policies and procedures across all business operations.' },
      { field_key: 'corporateRegistration', help_text: 'Include registration numbers, dates, and relevant jurisdictions where your company is registered.' },
      { field_key: 'goodStanding', help_text: 'Good standing means the company has met all legal and tax filing requirements and has no outstanding compliance issues.' },
      { field_key: 'licenses', help_text: 'Include industry-specific licenses, operational permits, and any other regulatory authorizations.' },
      { field_key: 'annualRecurringRevenue', help_text: 'Total revenue that is expected to continue for the foreseeable future on an annual basis.' },
      { field_key: 'monthlyRecurringRevenue', help_text: 'Total revenue that is expected to continue for the foreseeable future on a monthly basis.' },
      { field_key: 'marketCapitalization', help_text: 'For public companies, this is the total market value of outstanding shares. For private companies, provide estimated valuation.' },
      { field_key: 'lifetimeCustomerValue', help_text: 'The total revenue expected from an average customer throughout their relationship with your company.' },
      { field_key: 'financialStatements', help_text: 'Include balance sheets, income statements, cash flow statements, and any other relevant financial documentation.' },
      { field_key: 'operationalPolicies', help_text: 'Examples include security policies, data handling policies, HR policies, etc.' },
      { field_key: 'dataVolume', help_text: 'Estimate the amount of data your company manages in terabytes, petabytes, or other appropriate units.' },
      { field_key: 'dataTypes', help_text: 'Specify types such as customer PII, financial data, health information, intellectual property, etc.' },
      { field_key: 'sanctionsCheck', help_text: 'Sanctions screening checks if your company or its principals appear on government watchlists or sanctions lists.' },
      { field_key: 'dueDiligence', help_text: 'Examples include KYC, AML, background checks, vendor assessments, etc.' },
      { field_key: 'investigationsIncidents', help_text: 'Include regulatory inquiries, government investigations, significant data breaches, or other material incidents.' },
      { field_key: 'regulatoryActions', help_text: 'Include compliance orders, consent decrees, fines, penalties, or other formal actions by regulatory authorities.' }
    ];

    // Update each field's help_text
    for (const { field_key, help_text } of fieldHelpTexts) {
      await db.execute(sql`
        UPDATE kyb_fields
        SET help_text = ${help_text}
        WHERE field_key = ${field_key}
      `);
    }

    console.log('[KYB Migration] Successfully updated KYB field help text');
  } catch (error) {
    console.error('[KYB Migration] Error updating KYB field help text:', error);
    throw error;
  }
}