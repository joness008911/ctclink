#!/usr/bin/env python3
"""
CleanTraffic PHP Package - Testing Server
This Python server simulates how the random URL system works for testing purposes.
It's useful for demonstrating the clean URL functionality before deployment.
"""

import http.server
import socketserver
import os
import re
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8000
DIRECTORY = os.getcwd()

class CleanTrafficRedirectHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_url = urlparse(self.path)
        path = parsed_url.path.strip('/')
        query = parse_qs(parsed_url.query)
        
        # Print request info for debugging
        print(f"Request: {self.path}")
        print(f"Path: {path}")
        print(f"Query: {query}")
        
        # Check if this is a random URL pattern (5-12 alphanumeric chars)
        if re.match(r'^[a-zA-Z0-9]{5,12}$', path):
            print(f"CleanTraffic random URL detected: {path}")
            # In a real PHP environment, this would be handled by .htaccess and r.php
            # For our simulation, we'll show what would happen
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            # Simulate the redirection that would happen
            shortcode = query.get('c', [''])[0]
            response = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>CleanTraffic - Random URL Simulation</title>
                <style>
                    body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }}
                    .container {{ background: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #e9ecef; }}
                    h1 {{ color: #2d3748; margin-bottom: 20px; }}
                    .info {{ background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                    .flow {{ background: #f1f5f9; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                    .code {{ background: #1a202c; color: #e2e8f0; padding: 10px; border-radius: 5px; font-family: monospace; }}
                    .success {{ color: #38a169; font-weight: bold; }}
                    a {{ color: #3182ce; text-decoration: none; }}
                    a:hover {{ text-decoration: underline; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎯 CleanTraffic Random URL Test</h1>
                    <div class="success">✅ Random URL system working correctly!</div>
                    
                    <div class="info">
                        <h3>Detected Clean URL:</h3>
                        <div class="code">/{path}</div>
                        <p>Shortcode parameter: <code>{shortcode}</code></p>
                    </div>
                    
                    <div class="flow">
                        <h3>🔄 In Production, This Flow Would Happen:</h3>
                        <ol>
                            <li><strong>.htaccess</strong> detects random URL pattern</li>
                            <li><strong>r.php</strong> captures the random string</li>
                            <li><strong>redirect.php</strong> performs bot detection</li>
                            <li><strong>CleanTraffic API</strong> classifies visitor</li>
                            <li><strong>Instant redirect</strong> to human/bot URL</li>
                        </ol>
                    </div>
                    
                    <div class="info">
                        <h3>📊 Benefits of Clean URLs:</h3>
                        <ul>
                            <li>Professional appearance (no .php visible)</li>
                            <li>Harder to reverse engineer your system</li>
                            <li>Same powerful bot protection under the hood</li>
                            <li>Perfect for email campaigns and social media</li>
                        </ul>
                    </div>
                    
                    <p><a href="/">← Back to admin panel</a></p>
                </div>
            </body>
            </html>
            """
            self.wfile.write(response.encode())
            return
            
        # If it's the admin panel (root path)
        elif path == "" or path == "index.html":
            # Serve the admin panel
            try:
                with open(os.path.join(DIRECTORY, "index.html"), 'rb') as file:
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(file.read())
                    return
            except:
                pass
                
        # For all other paths, use the default handler
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Create and start the server
if __name__ == "__main__":
    Handler = CleanTrafficRedirectHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 60)
        print("🚀 CleanTraffic PHP Package - Testing Server")
        print("=" * 60)
        print(f"📡 Server running at: http://localhost:{PORT}")
        print(f"🎛️  Admin panel: http://localhost:{PORT}/")
        print(f"🔗 Test random URL: http://localhost:{PORT}/abc123def")
        print(f"🔗 Test with shortcode: http://localhost:{PORT}/xyz789?c=campaign1")
        print("=" * 60)
        print("💡 This simulates how your CleanTraffic system will work")
        print("   when deployed on your web hosting platform!")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")