#!/bin/sh
# Generate a self-signed cert (once) and serve over HTTPS
CERT_DIR="$(dirname "$0")/.cert"
if [ ! -f "$CERT_DIR/cert.pem" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -newkey rsa:2048 -keyout "$CERT_DIR/key.pem" \
    -out "$CERT_DIR/cert.pem" -days 365 -nodes \
    -subj "/CN=localhost" 2>/dev/null
  echo "Generated self-signed cert in $CERT_DIR"
fi

echo "Serving on https://localhost:8080"
echo "(Accept the self-signed certificate warning in your browser)"
python3 - "$CERT_DIR" <<'PYEOF'
import http.server, ssl, sys, os

cert_dir = sys.argv[1]
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(os.path.join(cert_dir, "cert.pem"), os.path.join(cert_dir, "key.pem"))

server = http.server.HTTPServer(("0.0.0.0", 8080), http.server.SimpleHTTPRequestHandler)
server.socket = ctx.wrap_socket(server.socket, server_side=True)
server.serve_forever()
PYEOF
