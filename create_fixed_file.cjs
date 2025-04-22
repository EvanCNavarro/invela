const fs = require('fs');
const path = require('path');

// Create a fixed UniversalForm.tsx file with the updated handleDemoAutoFill function
function createFixedFile() {
  try {
    // Get the current file content
    const targetFilePath = path.join(process.cwd(), 'client/src/components/forms/UniversalForm.tsx');
    const sourceFilePath = path.join(process.cwd(), 'fixed-demo-autofill.tsx');
    
    // Read both files
    const targetFile = fs.readFileSync(targetFilePath, 'utf8');
    const fixedFunction = fs.readFileSync(sourceFilePath, 'utf8');
    
    // Find the handleDemoAutoFill function
    const functionRegex = /(\/\/\s*Handle demo auto-fill functionality[\s\S]*?const handleDemoAutoFill = useCallback\([^{]*{[\s\S]*?)(\s*\/\/\s*State for clearing fields progress indicator)/g;
    
    // Replace the function with our fixed version
    const updatedContent = targetFile.replace(functionRegex, function(match, p1, p2) {
      return fixedFunction + p2;
    });
    
    // Write the updated file
    fs.writeFileSync(targetFilePath, updatedContent);
    
    console.log('Successfully updated handleDemoAutoFill function in UniversalForm.tsx');
    return true;
  } catch (error) {
    console.error('Error updating file:', error);
    return false;
  }
}

// Run the function
createFixedFile();