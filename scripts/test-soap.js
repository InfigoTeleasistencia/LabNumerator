#!/usr/bin/env node

/**
 * SOAP Service Connectivity Test Script
 * 
 * Usage:
 *   node scripts/test-soap.js [barcode]
 *   node scripts/test-soap.js --verbose
 *   node scripts/test-soap.js 110007938 --verbose
 * 
 * Examples:
 *   node scripts/test-soap.js
 *   node scripts/test-soap.js 110007938
 *   node scripts/test-soap.js --check-only
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

// Configuration
const SOAP_URL = process.env.SOAP_URL || 'http://ae89:8086/gxsalud/servlet/com.asesp.gxsalud.alabwbs01';
const DEFAULT_BARCODE = '110007938';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(color + message + colors.reset);
}

function logSuccess(message) {
  log('✅ ' + message, colors.green);
}

function logError(message) {
  log('❌ ' + message, colors.red);
}

function logInfo(message) {
  log('ℹ️  ' + message, colors.cyan);
}

function logWarning(message) {
  log('⚠️  ' + message, colors.yellow);
}

function logHeader(message) {
  console.log('\n' + colors.bright + colors.blue + '═'.repeat(60) + colors.reset);
  log(message, colors.bright + colors.blue);
  log('═'.repeat(60), colors.bright + colors.blue);
}

/**
 * Test basic connectivity to SOAP endpoint
 */
async function testConnectivity() {
  logHeader('Testing SOAP Service Connectivity');
  logInfo(`Target: ${SOAP_URL}`);
  
  try {
    // Try to fetch WSDL
    const wsdlUrl = SOAP_URL + '?WSDL';
    logInfo('Checking WSDL availability...');
    
    const response = await axios.get(wsdlUrl, { 
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 200) {
      logSuccess('WSDL is accessible');
      logInfo(`Response size: ${response.data.length} bytes`);
      return true;
    } else {
      logWarning(`WSDL returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logError('Connection refused - Service is not running or not accessible');
      logInfo('Check: 1) Service is running, 2) Firewall settings, 3) Network connectivity');
    } else if (error.code === 'ETIMEDOUT') {
      logError('Connection timeout - Service is not responding');
      logInfo('Check: 1) Network latency, 2) Service performance, 3) Firewall');
    } else if (error.code === 'ENOTFOUND') {
      logError('Host not found - DNS resolution failed');
      logInfo(`Check: 1) Hostname 'ae89' is resolvable, 2) Add to /etc/hosts if needed`);
    } else {
      logError(`Connection error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Test SOAP request with actual barcode
 */
async function testSOAPRequest(barcode, verbose = false) {
  logHeader(`Testing SOAP Request with Barcode: ${barcode}`);
  
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gxs="GXSalud">
   <soapenv:Header/>
   <soapenv:Body>
      <gxs:labwbs01.Execute>
         <gxs:Labosnro>${barcode}</gxs:Labosnro>
      </gxs:labwbs01.Execute>
   </soapenv:Body>
</soapenv:Envelope>`;

  if (verbose) {
    logInfo('Request envelope:');
    console.log(colors.cyan + soapEnvelope + colors.reset);
  }

  try {
    const startTime = Date.now();
    
    const response = await axios.post(SOAP_URL, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'labwbs01.Execute',
      },
      timeout: 10000,
    });
    
    const duration = Date.now() - startTime;
    logSuccess(`Request completed in ${duration}ms`);
    
    if (verbose) {
      logInfo('Response:');
      console.log(colors.cyan + response.data + colors.reset);
    }

    // Parse response
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
    });
    
    const result = parser.parse(response.data);
    const executeResponse = result?.Envelope?.Body?.['labwbs01.ExecuteResponse'];
    
    if (!executeResponse) {
      logError('Invalid SOAP response structure');
      return false;
    }

    logInfo('Response data:');
    console.log(JSON.stringify(executeResponse, null, 2));

    // Check for errors
    if (executeResponse.Error === 'S') {
      logWarning('Service returned error:');
      logError(executeResponse.Errdescripcion || 'Unknown error');
      return false;
    }

    // Validate required fields
    const requiredFields = ['Nombre', 'Sector', 'Fecha', 'Horafinal'];
    const missingFields = requiredFields.filter(field => !executeResponse[field]);
    
    if (missingFields.length > 0) {
      logWarning(`Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    logSuccess('Valid response received!');
    logInfo(`Patient: ${executeResponse.Nombre}`);
    logInfo(`Sector: ${executeResponse.Sector} - ${executeResponse.Secdescripcion}`);
    logInfo(`Date: ${executeResponse.Fecha}`);
    logInfo(`Time slot: ${executeResponse.Horainicial} - ${executeResponse.Horafinal}`);
    
    // Check time validity
    const horaFinal = new Date(executeResponse.Horafinal);
    const now = new Date();
    
    if (now > horaFinal) {
      logWarning('Time slot has expired');
    } else {
      logSuccess('Time slot is valid');
    }

    return true;
  } catch (error) {
    logError(`SOAP request failed: ${error.message}`);
    
    if (error.response) {
      logError(`HTTP Status: ${error.response.status}`);
      if (verbose && error.response.data) {
        console.log(colors.red + error.response.data + colors.reset);
      }
    }
    
    return false;
  }
}

/**
 * Run network diagnostics
 */
async function runDiagnostics() {
  logHeader('Running Network Diagnostics');
  
  const url = new URL(SOAP_URL);
  const hostname = url.hostname;
  const port = url.port || '8086';
  
  logInfo(`Hostname: ${hostname}`);
  logInfo(`Port: ${port}`);
  
  // Test DNS resolution
  const dns = require('dns').promises;
  try {
    const addresses = await dns.resolve4(hostname);
    logSuccess(`DNS resolved: ${addresses.join(', ')}`);
  } catch (error) {
    logError(`DNS resolution failed: ${error.message}`);
    logWarning('Add to /etc/hosts if this is an internal hostname');
    console.log(colors.yellow + `Example: echo "192.168.1.100 ${hostname}" | sudo tee -a /etc/hosts` + colors.reset);
  }
  
  // Test basic HTTP
  try {
    const testUrl = `http://${hostname}:${port}/`;
    logInfo(`Testing HTTP connection to ${testUrl}...`);
    await axios.get(testUrl, { timeout: 5000, validateStatus: () => true });
    logSuccess('HTTP port is accessible');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logError('Port is not listening');
    } else if (error.code === 'ETIMEDOUT') {
      logError('Connection timeout - possible firewall block');
    } else {
      logWarning(`HTTP test: ${error.message}`);
    }
  }
}

/**
 * Generate test report
 */
async function runFullTest(barcode, verbose) {
  const testResults = {
    connectivity: false,
    diagnostics: false,
    soapRequest: false,
    timestamp: new Date().toISOString(),
  };
  
  console.log(colors.bright + '\n🧪 LabNumerator SOAP Service Test Suite' + colors.reset);
  console.log(colors.cyan + `Test time: ${testResults.timestamp}` + colors.reset);
  
  // Run tests
  testResults.connectivity = await testConnectivity();
  
  if (testResults.connectivity) {
    testResults.soapRequest = await testSOAPRequest(barcode, verbose);
  } else {
    await runDiagnostics();
  }
  
  // Summary
  logHeader('Test Summary');
  console.log('Connectivity Test:', testResults.connectivity ? colors.green + 'PASS' : colors.red + 'FAIL', colors.reset);
  console.log('SOAP Request Test:', testResults.soapRequest ? colors.green + 'PASS' : colors.red + 'FAIL', colors.reset);
  
  const allPassed = testResults.connectivity && testResults.soapRequest;
  
  if (allPassed) {
    console.log('\n' + colors.bright + colors.green + '✅ All tests passed! Service is ready.' + colors.reset);
    process.exit(0);
  } else {
    console.log('\n' + colors.bright + colors.red + '❌ Some tests failed. Review errors above.' + colors.reset);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const checkOnly = args.includes('--check-only');
const barcode = args.find(arg => !arg.startsWith('--')) || DEFAULT_BARCODE;

if (checkOnly) {
  testConnectivity().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  runFullTest(barcode, verbose);
}

