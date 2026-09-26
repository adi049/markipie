#!/usr/bin/env python3
"""Markipie dev/preview server — static files with the real 404 page.
Production static hosts (Netlify/Vercel/GH Pages) pick up 404.html
automatically; this wrapper gives the local preview the same behavior."""
import http.server, socketserver, os, sys

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code == 404 and os.path.exists('404.html'):
            with open('404.html', 'rb') as f:
                body = f.read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().send_error(code, message, explain)
    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer-when-downgrade')
        super().end_headers()

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True

with Server(('0.0.0.0', PORT), Handler) as httpd:
    print(f'Markipie serving on :{PORT}')
    httpd.serve_forever()
