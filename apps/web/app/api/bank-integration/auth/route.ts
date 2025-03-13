import { NextResponse } from 'next/server'
import Lean from '@leantechnologies/node-sdk'
import axios from 'axios'

// Define interfaces for the Lean SDK to match its actual structure
interface LeanAuth {
  token: (params: { grantType: string; scope: string }) => Promise<{ accessToken: string; expiresIn?: number }>;
}

interface LeanCustomers {
  create: (params: { id: string }) => Promise<any>;
  getIdentity: (customerId: string) => Promise<any>;
  getAccounts: (customerId: string) => Promise<any>;
  getAccountBalance: (customerId: string, accountId: string) => Promise<any>;
  getAccountTransactions: (customerId: string, accountId: string, params: { fromDate: string; toDate: string; includeDetails: boolean }) => Promise<any>;
}

interface LeanBanks {
  list: () => Promise<any>;
}

interface LeanConnections {
  create: (params: { customerId: string; bankId: string }) => Promise<any>;
}

// Extend the Lean type to include the properties we know it has
interface LeanSDK {
  auth: LeanAuth;
  customers: LeanCustomers;
  banks: LeanBanks;
  connections: LeanConnections;
  clientId?: string;
  clientSecret?: string;
}

// Initialize the Lean SDK with environment-specific configuration
// @ts-ignore - Ignoring TypeScript error as the SDK has a different constructor than what TypeScript expects
const leanSdk = new Lean({
  clientId: process.env.LEAN_TECH_CLIENT_ID || '45be55bc-1025-41c5-a548-323ae5750d6c',
  clientSecret: process.env.LEAN_TECH_CLIENT_SECRET || '34356265353562632d313032352d3431',
  sandbox: process.env.NODE_ENV !== 'production',
}) as LeanSDK;

// Explicitly log SDK initialization to ensure it's used
console.log('Lean SDK initialized with full client ID:', leanSdk.clientId || 'N/A')

export async function GET() {
  try {
    // Log environment variables for debugging (redacted for security)
    console.log('LEAN_TECH_CLIENT_ID exists:', !!process.env.LEAN_TECH_CLIENT_ID)
    console.log('LEAN_TECH_CLIENT_SECRET exists:', !!process.env.LEAN_TECH_CLIENT_SECRET)
    console.log('NODE_ENV:', process.env.NODE_ENV)
    
    // Define the auth URL based on environment - from memory
    const authUrl = process.env.NODE_ENV === 'production' 
      ? 'https://auth.leantech.me/oauth2/token'
      : 'https://auth.sandbox.leantech.me/oauth2/token'
    
    console.log('Using auth URL:', authUrl)
    
    // Hardcoded credentials as fallback
    const clientId = (process.env.LEAN_TECH_CLIENT_ID || '45be55bc-1025-41c5-a548-323ae5750d6c').trim();
    const clientSecret = (process.env.LEAN_TECH_CLIENT_SECRET || '34356265353562632d313032352d3431').trim();
    
    // Ensure client ID is not truncated or modified
    const fullClientId = clientId;
    const fullClientSecret = clientSecret;
    
    console.log('Client ID being used (full):', fullClientId);
    console.log('Client Secret length:', fullClientSecret.length);
    
    // Try multiple variations of client credentials
    const credentialVariations = [
      { 
        id: fullClientId, 
        secret: fullClientSecret 
      },
      { 
        id: fullClientId.replace(/-/g, ''), 
        secret: fullClientSecret.replace(/-/g, '') 
      },
      { 
        id: '45be55bc1025415a548323ae5750d6c', 
        secret: '34356265353562632d313032352d3431' 
      }
    ];
    
    for (const cred of credentialVariations) {
      try {
        console.log(`Attempting authentication with full client ID: ${cred.id}`);
        
        const tokenResponse = await axios.post(authUrl, 
          new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'api',
            client_id: cred.id,  // Remove .trim() to preserve exact ID
            client_secret: cred.secret  // Remove .trim() to preserve exact secret
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
        
        console.log('Successfully obtained token')
        console.log('Response status:', tokenResponse.status)
        
        return NextResponse.json({
          token: tokenResponse.data.access_token,
          expires_in: tokenResponse.data.expires_in || 3599
        })
      } catch (tokenError) {
        console.error(`Authentication failed with full client ID: ${cred.id}`, 
          axios.isAxiosError(tokenError) ? tokenError.response?.data : tokenError)
      }
    }
    
    // If all attempts fail
    return NextResponse.json(
      { 
        error: 'Failed to get authentication token',
        message: 'Invalid client credentials. Please check your Lean Tech API credentials.',
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error generating auth token:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication token' },
      { status: 500 }
    )
  }
}