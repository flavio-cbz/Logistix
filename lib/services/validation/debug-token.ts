/**
 * Debug script to test token parsing
 */

const rawToken = process.env.VINTED_TOKEN || "";
const token = rawToken.trim().replace(/\s+/g, '');

console.log('Raw token length:', rawToken.length);
console.log('Clean token length:', token.length);
console.log('Token parts:', token.split('.').length);
console.log('First 50 chars:', token.substring(0, 50));
console.log('Last 50 chars:', token.substring(token.length - 50));

if (token) {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      console.log('Header length:', parts[0].length);
      console.log('Payload length:', parts[1].length);
      console.log('Signature length:', parts[2].length);
      
      // Try to decode payload
      const payload = parts[1];
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
      const parsed = JSON.parse(decoded);
      
      console.log('Parsed payload:', JSON.stringify(parsed, null, 2));
    }
  } catch (error) {
    console.error('Error parsing token:', error);
  }
}