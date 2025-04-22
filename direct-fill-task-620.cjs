/**
 * Script to directly fill task 620 with demo data
 * This will use our API endpoints for demo auto-fill
 */

const axios = require('axios');

async function fillTask620() {
  const taskId = 620;
  console.log(`Filling task ${taskId} with demo data...`);
  
  // First try KYB endpoint
  try {
    console.log('Trying KYB demo-autofill endpoint...');
    const response = await axios.post(`http://localhost:5000/api/kyb/demo-autofill/${taskId}`);
    console.log('KYB demo-autofill response:', response.data);
    
    // If successful, also try to submit it
    console.log('Trying KYB submit endpoint...');
    const submitResponse = await axios.post(`http://localhost:5000/api/kyb/submit/${taskId}`);
    console.log('KYB submit response:', submitResponse.data);
  } catch (error) {
    console.log('KYB endpoints failed, trying KY3P endpoints...');
    
    try {
      // Try KY3P endpoint
      const ky3pResponse = await axios.post(`http://localhost:5000/api/ky3p/demo-autofill/${taskId}`);
      console.log('KY3P demo-autofill response:', ky3pResponse.data);
      
      // If successful, also try to submit it
      const ky3pSubmitResponse = await axios.post(`http://localhost:5000/api/ky3p/submit/${taskId}`);
      console.log('KY3P submit response:', ky3pSubmitResponse.data);
    } catch (ky3pError) {
      console.log('KY3P endpoints failed, trying Open Banking endpoints...');
      
      try {
        // Try Open Banking endpoint
        const obResponse = await axios.post(`http://localhost:5000/api/open-banking/demo-autofill/${taskId}`);
        console.log('Open Banking demo-autofill response:', obResponse.data);
        
        // If successful, also try to submit it
        const obSubmitResponse = await axios.post(`http://localhost:5000/api/open-banking/submit/${taskId}`);
        console.log('Open Banking submit response:', obSubmitResponse.data);
      } catch (obError) {
        console.error('All demo-autofill attempts failed');
      }
    }
  }

  console.log('Task 620 fill attempt completed');
}

fillTask620()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Unhandled error:', error));