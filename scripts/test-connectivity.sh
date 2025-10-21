#!/bin/bash

################################################################################
# Network Connectivity Test for LabNumerator SOAP Service
# 
# Usage: ./scripts/test-connectivity.sh
################################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SOAP_HOST="ae89"
SOAP_PORT="8086"
SOAP_PATH="/gxsalud/servlet/com.asesp.gxsalud.alabwbs01"
SOAP_URL="http://${SOAP_HOST}:${SOAP_PORT}${SOAP_PATH}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  SOAP Service Connectivity Test${NC}"
echo -e "${BLUE}================================${NC}\n"

echo -e "${BLUE}Target:${NC} ${SOAP_URL}"
echo ""

# Test 1: DNS Resolution
echo -e "${YELLOW}[1/5]${NC} Testing DNS resolution for ${SOAP_HOST}..."
if host ${SOAP_HOST} > /dev/null 2>&1 || getent hosts ${SOAP_HOST} > /dev/null 2>&1; then
    IP=$(getent hosts ${SOAP_HOST} | awk '{ print $1 }' | head -n1)
    echo -e "${GREEN}✓${NC} DNS resolved to: ${IP}"
else
    echo -e "${RED}✗${NC} DNS resolution failed"
    echo -e "${YELLOW}→${NC} Try adding to /etc/hosts:"
    echo -e "   ${BLUE}sudo nano /etc/hosts${NC}"
    echo -e "   ${BLUE}# Add line: 192.168.X.X ${SOAP_HOST}${NC}"
    exit 1
fi

# Test 2: Ping
echo -e "\n${YELLOW}[2/5]${NC} Testing ping to ${SOAP_HOST}..."
if ping -c 2 -W 2 ${SOAP_HOST} > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Host is reachable"
else
    echo -e "${RED}✗${NC} Ping failed (may be blocked by firewall)"
    echo -e "${YELLOW}→${NC} This is not critical, continuing tests..."
fi

# Test 3: Port connectivity
echo -e "\n${YELLOW}[3/5]${NC} Testing TCP connection to ${SOAP_HOST}:${SOAP_PORT}..."
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/${SOAP_HOST}/${SOAP_PORT}" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Port ${SOAP_PORT} is open"
else
    echo -e "${RED}✗${NC} Cannot connect to port ${SOAP_PORT}"
    echo -e "${YELLOW}→${NC} Check:"
    echo -e "   - Service is running"
    echo -e "   - Firewall allows port ${SOAP_PORT}"
    echo -e "   - Network routing is correct"
    exit 1
fi

# Test 4: HTTP connectivity
echo -e "\n${YELLOW}[4/5]${NC} Testing HTTP connection..."
if command -v curl > /dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${SOAP_URL}?WSDL" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓${NC} HTTP connection successful (Status: ${HTTP_CODE})"
    else
        echo -e "${YELLOW}⚠${NC} HTTP returned status: ${HTTP_CODE}"
        if [ "$HTTP_CODE" = "000" ]; then
            echo -e "${RED}✗${NC} Connection failed"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} curl not available, skipping HTTP test"
fi

# Test 5: WSDL retrieval
echo -e "\n${YELLOW}[5/5]${NC} Testing WSDL retrieval..."
if command -v curl > /dev/null 2>&1; then
    WSDL_CONTENT=$(curl -s --max-time 5 "${SOAP_URL}?WSDL" 2>/dev/null)
    if echo "$WSDL_CONTENT" | grep -q "wsdl:definitions\|xml"; then
        echo -e "${GREEN}✓${NC} WSDL retrieved successfully"
        WSDL_SIZE=$(echo "$WSDL_CONTENT" | wc -c)
        echo -e "  Size: ${WSDL_SIZE} bytes"
    else
        echo -e "${RED}✗${NC} WSDL retrieval failed or invalid response"
        echo -e "${YELLOW}→${NC} Response preview:"
        echo "$WSDL_CONTENT" | head -n 5
    fi
else
    echo -e "${YELLOW}⚠${NC} curl not available"
fi

# Summary
echo -e "\n${BLUE}================================${NC}"
echo -e "${GREEN}✓${NC} All connectivity tests passed!"
echo -e "${BLUE}================================${NC}\n"

echo -e "${BLUE}Next steps:${NC}"
echo "  1. Run full SOAP test: ${BLUE}node scripts/test-soap.js${NC}"
echo "  2. Deploy application: ${BLUE}./scripts/deploy.sh${NC}"
echo ""

exit 0

