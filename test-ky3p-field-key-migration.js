/**
 * Test script for KY3P field key migration
 * 
 * This script tests the KY3P field key migration by:
 * 1. Finding responses with missing field_key
 * 2. Triggering the migration endpoint
 * 3. Verifying the responses now have field_key populated
 */

async function testKy3pFieldKeyMigration() {
  try {
    console.log('=== KY3P Field Key Migration Test ===');
    
    // Find a KY3P task to work with
    console.log('Finding KY3P task...');
    const tasksResponse = await fetch('/api/tasks');
    const tasks = await tasksResponse.json();
    
    const ky3pTask = tasks.find(t => t.task_type === 'ky3p' || t.task_type === 'security_assessment');
    if (!ky3pTask) {
      console.error('No KY3P task found. Create a KY3P task first.');
      return;
    }
    
    console.log(`Found KY3P task: ID=${ky3pTask.id}, Type=${ky3pTask.task_type}`);
    
    // Try to get responses by field key first to see the current state
    console.log('Getting current responses by field key...');
    const initialResponsesResponse = await fetch(`/api/ky3p/responses-by-key/${ky3pTask.id}`);
    if (!initialResponsesResponse.ok) {
      console.error('Error getting responses by field key:', await initialResponsesResponse.text());
    } else {
      const initialData = await initialResponsesResponse.json();
      if (initialData.success) {
        const responseCount = Object.keys(initialData.responses || {}).length;
        console.log(`Found ${responseCount} responses with field_key before migration`);
      } else {
        console.warn('Error getting responses by field key:', initialData.message);
      }
    }
    
    // Trigger the field key migration
    console.log('Triggering field key migration...');
    const migrationResponse = await fetch('/api/ky3p/migrate-to-field-key', {
      method: 'POST'
    });
    
    if (!migrationResponse.ok) {
      console.error('Migration endpoint failed:', await migrationResponse.text());
      return;
    }
    
    const migrationResult = await migrationResponse.json();
    console.log('Migration result:', migrationResult);
    
    // Check the responses again to see if they now have field_key
    console.log('Getting responses by field key after migration...');
    const afterResponsesResponse = await fetch(`/api/ky3p/responses-by-key/${ky3pTask.id}`);
    if (!afterResponsesResponse.ok) {
      console.error('Error getting responses after migration:', await afterResponsesResponse.text());
      return;
    }
    
    const afterData = await afterResponsesResponse.json();
    if (afterData.success) {
      const responseCount = Object.keys(afterData.responses || {}).length;
      console.log(`Found ${responseCount} responses with field_key after migration`);
      
      if (responseCount > 0) {
        console.log('Sample response keys:', Object.keys(afterData.responses).slice(0, 5));
        const sampleKey = Object.keys(afterData.responses)[0];
        console.log('Sample response value:', afterData.responses[sampleKey]);
      }
    } else {
      console.error('Error getting responses after migration:', afterData.message);
      return;
    }
    
    console.log('=== Test completed successfully ===');
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test function
testKy3pFieldKeyMigration();
