const fetch = require('node-fetch');

async function testTutorialApi() {
  try {
    // Use the same Express session cookie the browser uses
    const response = await fetch('http://localhost:5000/api/user-tab-tutorials/claims/status', {
      method: 'GET',
      headers: {
        'Cookie': '.session-cookie=s%3A6JrJRe4b2CefVvBQ1b_7I0V65eZbFa6F.4%2F5SBu8j%2FDK%2FLg3YtSuDCMO%2FFH1%2F9ghI75uUAxwJxw',
        'Content-Type': 'application/json'
      },
    });

    const data = await response.json();
    console.log('API Response:', response.status, data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testTutorialApi();
