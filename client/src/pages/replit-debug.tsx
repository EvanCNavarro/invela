// A special debug page specifically for Replit webview
export default function ReplitDebug() {
  return (
    <html>
      <head>
        <title>Replit Debug</title>
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          h1 {
            color: #333;
          }
          .debug-container {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            background: #f9f9f9;
          }
          .debug-info {
            margin-bottom: 10px;
          }
          .debug-label {
            font-weight: bold;
          }
        `}} />
      </head>
      <body>
        <h1>Replit Debug Page</h1>
        <div className="debug-container">
          <div className="debug-info">
            <span className="debug-label">URL:</span> {window.location.href}
          </div>
          <div className="debug-info">
            <span className="debug-label">Time:</span> {new Date().toISOString()}
          </div>
          <div className="debug-info">
            <span className="debug-label">User Agent:</span> {navigator.userAgent}
          </div>
          <div className="debug-info">
            <span className="debug-label">Replit Test:</span> Working correctly!
          </div>
        </div>
      </body>
    </html>
  );
}