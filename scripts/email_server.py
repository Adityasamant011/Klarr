#!/usr/bin/env python3
"""Local email server for Klarr admin. Run with: python3 email_server.py"""
import pickle, os, json, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

GMAIL_USER = 'klarr.space@gmail.com'
TOKEN_PATH = os.path.expanduser('~/.hermes/gmail_token.pickle')

def send_email(to, subject, body):
    """Send email using Gmail SMTP with OAuth2 token"""
    try:
        with open(TOKEN_PATH, 'rb') as f:
            creds = pickle.load(f)
        
        # Use the access token to send via SMTP
        import base64
        auth_string = f'user={GMAIL_USER}\x01auth=Bearer {creds.token}\x01\x01'
        auth_bytes = base64.b64encode(auth_string.encode()).decode()
        
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = to
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.docmd('AUTH', 'XOAUTH2 ' + auth_bytes)
        server.sendmail(GMAIL_USER, to, msg.as_string())
        server.quit()
        return True, 'Email sent successfully'
    except Exception as e:
        return False, str(e)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/send':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body)
                to = data.get('to', '')
                subject = data.get('subject', '')
                body_text = data.get('body', '')
                
                if not to or not subject:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b'Missing to or subject')
                    return
                
                success, msg = send_email(to, subject, body_text)
                self.send_response(200 if success else 500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': success, 'message': msg}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 9191), Handler)
    print('Email server running on http://127.0.0.1:9191')
    server.serve_forever()
