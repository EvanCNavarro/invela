/**
 * Browser-based Open Banking Form Submission Fix Verification
 * 
 * This script can be pasted into the browser console to test if the Open Banking form
 * submission endpoint at /api/transactional-form is working properly.
 * 
 * Instructions:
 * 1. Navigate to an Open Banking task in the web application
 * 2. Open the browser console (F12 or right-click > Inspect > Console)
 * 3. Paste this entire script into the console and press Enter
 * 4. The script will attempt to submit the form and verify the post-submission actions
 */

(async function() {
  // ANSI-like color codes for console output
  const colors = {
    reset: '',
    red: 'color: #FF5555',
    green: 'color: #55FF55',
    yellow: 'color: #FFFF55',
    blue: 'color: #5555FF',
    magenta: 'color: #FF55FF',
    cyan: 'color: #55FFFF',
    white: 'color: #FFFFFF',
    gray: 'color: #AAAAAA',
    brightRed: 'color: #FF8888; font-weight: bold',
    brightGreen: 'color: #88FF88; font-weight: bold',
    brightYellow: 'color: #FFFF88; font-weight: bold',
    brightBlue: 'color: #8888FF; font-weight: bold',
    brightMagenta: 'color: #FF88FF; font-weight: bold',
    brightCyan: 'color: #88FFFF; font-weight: bold',
    brightWhite: 'color: #FFFFFF; font-weight: bold',
  };

  // Logger helper
  function log(message, color = colors.reset) {
    console.log(`%c${message}`, color);
  }

  // Get current task ID and company ID from URL or page context
  function getCurrentTaskContext() {
    try {
      // Try to extract from URL first
      const urlMatch = window.location.pathname.match(/\/tasks\/(\d+)/);
      let taskId = urlMatch ? parseInt(urlMatch[1]) : null;
      
      // If not found in URL, try to get from page context
      if (!taskId) {
        // Check if task data is available in window.__TASK_DATA__ or similar global vars
        if (window.__TASK_DATA__) {
          taskId = window.__TASK_DATA__.id;
        } else {
          // Last resort: look for task ID in the document
          const taskIdElement = document.querySelector('[data-task-id]');
          if (taskIdElement) {
            taskId = parseInt(taskIdElement.getAttribute('data-task-id'));
          }
        }
      }
      
      // Get company ID from global state
      let companyId = null;
      if (window.__COMPANY_DATA__) {
        companyId = window.__COMPANY_DATA__.id;
      } else if (window.__APP_STATE__ && window.__APP_STATE__.company) {
        companyId = window.__APP_STATE__.company.id;
      }
      
      return { taskId, companyId };
    } catch (error) {
      log(`Error getting task context: ${error.message}`, colors.red);
      return { taskId: null, companyId: null };
    }
  }

  // Generate sample Open Banking form data
  function generateOpenBankingFormData() {
    return {
      "apiAgreementDocumentation": "Yes",
      "apiDocumentationStandardsUsed": "Yes",
      "apiMethodsUsed": ["REST", "SOAP"],
      "apiRateLimit": "1000 requests per minute",
      "apiUserManagement": "Yes",
      "applicationTenancyModel": "Multi-tenant",
      "authMechanismsSupported": ["OAuth 2.0", "API Keys"],
      "authenticationDetailsStorageMethod": "Encrypted in database",
      "authenticationMethodsSupported": ["Password", "2FA"],
      "backupFrequency": "Daily",
      "backupStrategy": "Full daily backup with hourly incrementals",
      "certificationLevel": "SOC 2 Type II",
      "certifications": ["ISO 27001", "SOC 2", "PCI DSS"],
      "cloudServiceProvider": ["AWS", "Azure"],
      "countryDataResidency": ["United States", "European Union"],
      "dataBreachNotificationProcess": "Comprehensive process with 24-hour notification timeline",
      "dataClassificationPolicy": "Yes",
      "dataCollectionCategoriesPersonal": ["Name", "Email", "Address", "Phone"],
      "dataCollectionCategoriesTransactional": ["Account numbers", "Transaction details", "Balance information"],
      "dataEncryptionAtRest": "Yes",
      "dataEncryptionInTransit": "Yes",
      "dataProcessingPurposes": ["Account management", "Payment processing", "Fraud detection"],
      "dataProviderType": "Regulated financial institution",
      "dataSecurityAndPrivacyWalkthrough": "Yes, available upon request with signed NDA",
      "disasterRecoveryPlan": "Yes",
      "discoveryMethodsSupported": ["API Documentation", "Sandbox environment"],
      "employeeSecurityTrainingFrequency": "Quarterly",
      "endpointDocumentationAvailable": "Yes",
      "externalPenetrationTestingFrequency": "Annually",
      "fapiAndDpopSupport": "Yes",
      "financialServicesOffered": ["Payment initiation", "Account information"],
      "incidentResponseTeam": "Yes",
      "incidentResponseTimeSLA": "15 minutes for critical issues",
      "licenseOrRegulatoryApprovals": ["Banking license", "Payment Institution license"],
      "mfaImplementation": "Yes",
      "multiTenantDataSegregation": "Yes",
      "oAuth20FlowsSupported": ["Authorization Code", "Client Credentials"],
      "openAPISpecification": "Yes",
      "openBankingStandards": ["UK Open Banking", "Berlin Group"],
      "passwordPolicyEnforcement": "Yes",
      "privacyPolicyProvided": "Yes",
      "privacyPolicyURL": "https://example.com/privacy-policy",
      "productionAccessProcess": "Formal onboarding with security review",
      "providerInsurance": "Yes",
      "recoveryPointObjective": "4 hours",
      "recoveryTimeObjective": "8 hours",
      "regulatoryComplianceFramework": "Yes",
      "sandboxAvailability": "Yes",
      "scopes": "account:read, payment:write, balance:read",
      "sensitiveDataHandlingTraining": "Yes",
      "serviceTypeOpenBanking": ["Account Information", "Payment Initiation"],
      "thirdPartyAuditFrequency": "Annually",
      "thirdPartySecurityAudits": "Yes",
      "tppIdentityVerificationProcess": "Document verification and regulatory checks",
      "vendorName": "Open Banking Example Corp."
    };
  }

  // Fetch company data
  async function fetchCompanyData(companyId) {
    try {
      log(`Fetching current company data...`, colors.blue);
      
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch company data: ${response.status}`);
      }
      
      const company = await response.json();
      
      log(`Company details:`, colors.yellow);
      log(`- Name: ${company.name}`, colors.yellow);
      log(`- Risk score: ${company.risk_score ?? 'Not set'}`, colors.yellow);
      log(`- Chosen score: ${company.chosen_score ?? 'Not set'}`, colors.yellow);
      log(`- Accreditation status: ${company.accreditation_status ?? 'Not set'}`, colors.yellow);
      log(`- Onboarding completed: ${company.onboarding_company_completed ? 'Yes' : 'No'}`, colors.yellow);
      
      return company;
    } catch (error) {
      log(`Error fetching company: ${error.message}`, colors.red);
      return null;
    }
  }

  // Fetch task data
  async function fetchTaskData(taskId) {
    try {
      log(`Fetching task data...`, colors.blue);
      
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch task data: ${response.status}`);
      }
      
      const task = await response.json();
      
      log(`Task details:`, colors.yellow);
      log(`- Title: ${task.title}`, colors.yellow);
      log(`- Status: ${task.status}`, colors.yellow);
      log(`- Progress: ${task.progress}%`, colors.yellow);
      log(`- Has file ID: ${task.metadata?.fileId ? 'Yes' : 'No'}`, colors.yellow);
      
      return task;
    } catch (error) {
      log(`Error fetching task: ${error.message}`, colors.red);
      return null;
    }
  }

  // Submit the Open Banking form
  async function submitOpenBankingForm(taskId, companyId) {
    try {
      log(`Submitting Open Banking form for task ${taskId}...`, colors.cyan);
      
      const formData = generateOpenBankingFormData();
      
      // First try the transactional-form endpoint
      const submissionResponse = await fetch(`/api/transactional-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          companyId,
          formType: 'open_banking',
          formData
        })
      });
      
      if (!submissionResponse.ok) {
        throw new Error(`Form submission failed with status: ${submissionResponse.status}`);
      }
      
      const result = await submissionResponse.json();
      
      log('✅ Form submission successful', colors.green);
      log(`Result: ${JSON.stringify(result, null, 2)}`, colors.green);
      
      return result;
    } catch (error) {
      log(`❌ Error submitting form: ${error.message}`, colors.red);
      throw error;
    }
  }

  // Run the test
  async function runTest() {
    try {
      log('\n===========================================', colors.brightCyan);
      log('🧪 TESTING OPEN BANKING FORM SUBMISSION FIX', colors.brightCyan);
      log('===========================================\n', colors.brightCyan);
      
      // Get context from the current page
      const { taskId, companyId } = getCurrentTaskContext();
      
      if (!taskId || !companyId) {
        log('❌ Could not determine task ID or company ID', colors.red);
        log('Make sure you are on a task page', colors.yellow);
        return;
      }
      
      log(`Using Task ID: ${taskId}, Company ID: ${companyId}`, colors.brightYellow);
      
      // Check initial state
      log('\n📊 CHECKING INITIAL STATE', colors.magenta);
      const initialCompanyState = await fetchCompanyData(companyId);
      const initialTaskState = await fetchTaskData(taskId);
      
      if (!initialTaskState || !initialCompanyState) {
        log('❌ Could not retrieve initial state', colors.red);
        return;
      }
      
      // Skip submission if the task is already submitted
      if (initialTaskState.status === 'submitted') {
        log('⚠️ Task is already in submitted state. Skipping submission.', colors.yellow);
        log('This test will only verify the current state.', colors.yellow);
        
        // Compare with expected state
        log('\n📋 VALIDATION OF CURRENT STATE', colors.brightBlue);
        
        // Check task is submitted
        const taskSubmitted = initialTaskState.status === 'submitted';
        log(`✓ Task status is 'submitted': ${taskSubmitted ? 'PASS' : 'FAIL'}`, 
          taskSubmitted ? colors.brightGreen : colors.brightRed);
        
        // Check task progress is 100%
        const taskProgress100 = initialTaskState.progress === 100;
        log(`✓ Task progress is 100%: ${taskProgress100 ? 'PASS' : 'FAIL'}`, 
          taskProgress100 ? colors.brightGreen : colors.brightRed);
        
        // Check file ID exists
        const hasFileId = !!initialTaskState.metadata?.fileId;
        log(`✓ Task has fileId: ${hasFileId ? 'PASS' : 'FAIL'}`, 
          hasFileId ? colors.brightGreen : colors.brightRed);
        
        // Check risk score is set and between 5-95
        const hasValidRiskScore = initialCompanyState.risk_score !== null && 
                                initialCompanyState.risk_score >= 5 && 
                                initialCompanyState.risk_score <= 95;
        log(`✓ Risk score is set (5-95): ${hasValidRiskScore ? 'PASS' : 'FAIL'}${hasValidRiskScore ? ' - Value: ' + initialCompanyState.risk_score : ''}`, 
          hasValidRiskScore ? colors.brightGreen : colors.brightRed);
        
        // Check accreditation status is APPROVED
        const isAccredited = initialCompanyState.accreditation_status === 'APPROVED';
        log(`✓ Accreditation status is APPROVED: ${isAccredited ? 'PASS' : 'FAIL'}`, 
          isAccredited ? colors.brightGreen : colors.brightRed);
        
        // Check onboarding is completed
        const onboardingCompleted = initialCompanyState.onboarding_company_completed === true;
        log(`✓ Onboarding is marked as completed: ${onboardingCompleted ? 'PASS' : 'FAIL'}`, 
          onboardingCompleted ? colors.brightGreen : colors.brightRed);
        
        return;
      }
      
      // Submit form
      log('\n🚀 SUBMITTING FORM', colors.magenta);
      await submitOpenBankingForm(taskId, companyId);
      
      // Check final state
      log('\n📊 CHECKING FINAL STATE', colors.magenta);
      const finalCompanyState = await fetchCompanyData(companyId);
      const finalTaskState = await fetchTaskData(taskId);
      
      // Compare states
      log('\n📋 SUMMARY OF CHANGES', colors.brightMagenta);
      
      // Task changes
      log('Task changes:', colors.cyan);
      log(`- Status: ${initialTaskState.status} -> ${finalTaskState.status}`, 
        initialTaskState.status !== finalTaskState.status ? colors.brightGreen : colors.yellow);
      log(`- Progress: ${initialTaskState.progress}% -> ${finalTaskState.progress}%`, 
        initialTaskState.progress !== finalTaskState.progress ? colors.brightGreen : colors.yellow);
      log(`- File ID: ${initialTaskState.metadata?.fileId ? 'Present' : 'Missing'} -> ${finalTaskState.metadata?.fileId ? 'Present' : 'Missing'}`, 
        initialTaskState.metadata?.fileId !== finalTaskState.metadata?.fileId ? colors.brightGreen : colors.yellow);
      
      // Company changes
      log('Company changes:', colors.cyan);
      log(`- Risk score: ${initialCompanyState.risk_score ?? 'None'} -> ${finalCompanyState.risk_score ?? 'None'}`, 
        initialCompanyState.risk_score !== finalCompanyState.risk_score ? colors.brightGreen : colors.yellow);
      log(`- Accreditation status: ${initialCompanyState.accreditation_status ?? 'None'} -> ${finalCompanyState.accreditation_status ?? 'None'}`, 
        initialCompanyState.accreditation_status !== finalCompanyState.accreditation_status ? colors.brightGreen : colors.yellow);
      log(`- Onboarding completed: ${initialCompanyState.onboarding_company_completed ? 'Yes' : 'No'} -> ${finalCompanyState.onboarding_company_completed ? 'Yes' : 'No'}`, 
        initialCompanyState.onboarding_company_completed !== finalCompanyState.onboarding_company_completed ? colors.brightGreen : colors.yellow);
      
      // Overall validation
      log('\n🔍 VALIDATION', colors.brightBlue);
      
      // Check task is submitted
      const taskSubmitted = finalTaskState.status === 'submitted';
      log(`✓ Task status is 'submitted': ${taskSubmitted ? 'PASS' : 'FAIL'}`, 
        taskSubmitted ? colors.brightGreen : colors.brightRed);
      
      // Check task progress is 100%
      const taskProgress100 = finalTaskState.progress === 100;
      log(`✓ Task progress is 100%: ${taskProgress100 ? 'PASS' : 'FAIL'}`, 
        taskProgress100 ? colors.brightGreen : colors.brightRed);
      
      // Check file ID exists
      const hasFileId = !!finalTaskState.metadata?.fileId;
      log(`✓ Task has fileId: ${hasFileId ? 'PASS' : 'FAIL'}`, 
        hasFileId ? colors.brightGreen : colors.brightRed);
      
      // Check risk score is set and between 5-95
      const hasValidRiskScore = finalCompanyState.risk_score !== null && 
                               finalCompanyState.risk_score >= 5 && 
                               finalCompanyState.risk_score <= 95;
      log(`✓ Risk score is set (5-95): ${hasValidRiskScore ? 'PASS' : 'FAIL'}${hasValidRiskScore ? ' - Value: ' + finalCompanyState.risk_score : ''}`, 
        hasValidRiskScore ? colors.brightGreen : colors.brightRed);
      
      // Check accreditation status is APPROVED
      const isAccredited = finalCompanyState.accreditation_status === 'APPROVED';
      log(`✓ Accreditation status is APPROVED: ${isAccredited ? 'PASS' : 'FAIL'}`, 
        isAccredited ? colors.brightGreen : colors.brightRed);
      
      // Check onboarding is completed
      const onboardingCompleted = finalCompanyState.onboarding_company_completed === true;
      log(`✓ Onboarding is marked as completed: ${onboardingCompleted ? 'PASS' : 'FAIL'}`, 
        onboardingCompleted ? colors.brightGreen : colors.brightRed);
      
      // Overall result
      const allChecksPass = taskSubmitted && taskProgress100 && hasFileId && 
                           hasValidRiskScore && isAccredited && onboardingCompleted;
      
      log('\n📝 TEST RESULT', colors.brightMagenta);
      log(`${allChecksPass ? '✅ All checks PASSED! The fix works correctly!' : '❌ Some checks FAILED. The fix needs more work.'}`, 
        allChecksPass ? colors.brightGreen : colors.brightRed);
      
    } catch (error) {
      log(`\n❌ TEST FAILED with error: ${error.message}`, colors.brightRed);
      console.error(error);
    }
  }

  // Run the test
  await runTest();
})();