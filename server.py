from http.server import HTTPServer, SimpleHTTPRequestHandler
import socket

# Get the local IP address
host = socket.gethostbyname(socket.gethostname())
port = 8000

print(f"Starting server at http://{host}:{port}")
print("Access from other devices using this URL")

# Create and start the server
server = HTTPServer((host, port), SimpleHTTPRequestHandler)
server.serve_forever()
