const http = require('http');

// Function to make a GET request to the API
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkAPI() {
  try {
    console.log('Checking API endpoints...');
    
    // Check the relationships endpoint
    console.log('\nChecking /api/relationships endpoint:');
    try {
      const relationshipsResponse = await makeRequest('/api/relationships');
      console.log('Status code:', relationshipsResponse.statusCode);
      console.log('Response data:', JSON.stringify(relationshipsResponse.data, null, 2));
    } catch (error) {
      console.error('Error checking relationships endpoint:', error);
    }
    
    // Check the debug endpoint
    console.log('\nChecking /api/debug/relationships endpoint:');
    try {
      const debugResponse = await makeRequest('/api/debug/relationships');
      console.log('Status code:', debugResponse.statusCode);
      console.log('Response data:', JSON.stringify(debugResponse.data, null, 2));
    } catch (error) {
      console.error('Error checking debug endpoint:', error);
    }
    
  } catch (error) {
    console.error('Error checking API:', error);
  }
}

checkAPI(); 