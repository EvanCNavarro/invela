
// Add URL construction debugging
function handleTaskClick(task) {
  console.log("[TaskTable] Task clicked:", {
    ...task,
    timestamp: new Date().toISOString()
  });
  
  // Extract task type and company name
  const taskType = task.type || 'unknown';
  const originalTitle = task.title || '';
  let extractedCompanyName = '';
  let taskTypePrefix = '';
  
  // Parse title for company name
  const titleMatchResult = originalTitle.match(/Company (\w+): (.+)/);
  if (titleMatchResult) {
    const [, extractedType, company] = titleMatchResult;
    extractedCompanyName = company;
    taskTypePrefix = extractedType.toLowerCase();
  }
  
  // Construct URL
  const constructedUrl = `/task-center/task/${taskTypePrefix}-${extractedCompanyName}`;
  
  console.log("[TaskTable] Navigation preparation:", {
    taskType,
    originalTitle,
    extractedCompanyName,
    taskTypePrefix,
    constructedUrl,
    metadata: task.metadata,
    statusBeforeNavigation: task.status,
    timestamp: new Date().toISOString()
  });
  
  // Validate navigation params
  console.log("[TaskTable] Task validation:", {
    hasMetadata: !!task.metadata,
    hasCompanyName: !!task.company_name,
    titleMatchResult,
    formattedCompanyName: extractedCompanyName,
    timestamp: new Date().toISOString()
  });
  
  // Navigate
  console.log("[TaskTable] Initiating navigation to:", constructedUrl);
  navigate(constructedUrl);
}

