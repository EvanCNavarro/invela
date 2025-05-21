// Script to extract a valid cookie from the Netscape cookie file
import fs from 'fs';

// Read the cookie file
const cookieFile = fs.readFileSync('.session-cookie', 'utf8');
const lines = cookieFile.split('\n');

// In Netscape cookie format, particularly when exported from curl
// The format is: domain FLAG path secure expiry name value
const lastLine = lines.filter(line => line.trim() && !line.startsWith('#')).pop();

if (lastLine) {
  console.log('Found cookie line:', lastLine);
  
  // The last non-comment line should contain our cookie information
  // Extract just the value part (should be the last part)
  const parts = lastLine.split(/\s+/);
  const value = parts[parts.length - 1] || lastLine;
  
  console.log('Extracted value:', value);
  
  // Save to a clean file for easier use
  fs.writeFileSync('.cookie-value', value, 'utf8');
  console.log('Cookie value saved to .cookie-value');
} else {
  console.error('No valid cookie found in the file');
  process.exit(1);
}