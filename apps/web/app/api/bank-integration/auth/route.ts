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
interface LeanSDK extends Lean {
  auth: LeanAuth;
  customers: LeanCustomers;
  banks: LeanBanks;
  connections: LeanConnections;
}

// Initialize the Lean SDK with environment-specific configuration
// @ts-ignore - Ignoring TypeScript error as the SDK has a different constructor than what TypeScript expects
const leanClient = new Lean({
  clientId: process.env.LEAN_TECH_CLIENT_ID,
  clientSecret: process.env.LEAN_TECH_CLIENT_SECRET,
  sandbox: process.env.NODE_ENV !== 'production',
}) as LeanSDK;

export async function GET() {
  try {
    // Log environment variables for debugging (redacted for security)
    console.log('LEAN_TECH_CLIENT_ID exists:', !!process.env.LEAN_TECH_CLIENT_ID)
    console.log('LEAN_TECH_CLIENT_SECRET exists:', !!process.env.LEAN_TECH_CLIENT_SECRET)
    console.log('NODE_ENV:', process.env.NODE_ENV)
    
    // Check if required environment variables are present
    if (!process.env.LEAN_TECH_CLIENT_ID || !process.env.LEAN_TECH_CLIENT_SECRET) {
      console.error('Missing Lean Tech credentials in environment variables')
      return NextResponse.json(
        { error: 'Missing Lean Tech credentials' },
        { status: 500 }
      )
    }
    
    // Generate a customer ID based on the app name (base64 encoded)
    const appName = 'MuhasabaAI'
    const timestamp = new Date().getTime()
    const randomId = Math.random().toString(36).substring(2, 10)
    const customerId = Buffer.from(`${appName}-${timestamp}-${randomId}`).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    console.log('Generated customer ID:', customerId)
    
    // Create the customer using the SDK
    try {
      await leanClient.customers.create({
        id: customerId
      })
      console.log('Customer created successfully')
    } catch (customerError) {
      console.error('Error creating customer (continuing anyway):', customerError)
      // We continue even if customer creation fails as it might already exist
    }
    
    // According to the memory, we need to use OAuth 2.0 with client_credentials grant type
    // Define the auth URL based on environment
    const authUrl = process.env.NODE_ENV === 'production' 
      ? 'https://auth.leantech.me/oauth2/token'
      : 'https://auth.sandbox.leantech.me/oauth2/token'
    
    console.log('Using auth URL:', authUrl)
    
    // Define the scope based on customer ID
    const scope = `api customer.${customerId}`
    console.log('Using scope:', scope)
    
    try {
      // Log the request details (without sensitive information)
      console.log('Making OAuth request to:', authUrl)
      console.log('Using scope:', scope)
      console.log('Using client ID:', process.env.LEAN_TECH_CLIENT_ID ? 'Provided' : 'Missing')
      
      // Make direct OAuth request instead of using the SDK
      const tokenResponse = await axios.post(authUrl, 
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: scope,
          client_id: process.env.LEAN_TECH_CLIENT_ID || '',
          client_secret: process.env.LEAN_TECH_CLIENT_SECRET || ''
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
      
      console.log('Successfully obtained token')
      console.log('Response status:', tokenResponse.status)
      console.log('Response headers:', tokenResponse.headers)
      console.log('Response data keys:', Object.keys(tokenResponse.data))
      
      // Return token with expiry of 3599 seconds as specified in the memory
      return NextResponse.json({
        token: tokenResponse.data.access_token,
        expires_in: tokenResponse.data.expires_in || 3599,
        customerId: customerId
      })
    } catch (tokenError) {
      console.error('Error getting token with combined scope:', tokenError)
      
      // Try with just the 'api' scope as a fallback
      console.log('Retrying with only api scope')
      
      try {
        const retryResponse = await axios.post(authUrl, 
          new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'api',
            client_id: process.env.LEAN_TECH_CLIENT_ID || '',
            client_secret: process.env.LEAN_TECH_CLIENT_SECRET || ''
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
        
        console.log('Successfully obtained token on retry')
        console.log('Response status:', retryResponse.status)
        console.log('Response headers:', retryResponse.headers)
        console.log('Response data keys:', Object.keys(retryResponse.data))
        
        return NextResponse.json({
          token: retryResponse.data.access_token,
          expires_in: retryResponse.data.expires_in || 3599,
          customerId: customerId
        })
      } catch (retryError) {
        console.error('Failed to get token on retry:', retryError)
        
        // Log more detailed error information
        if (retryError instanceof Error) {
          console.error('Error name:', retryError.name)
          console.error('Error message:', retryError.message)
          if (axios.isAxiosError(retryError) && retryError.response) {
            console.error('Response status:', retryError.response.status)
            console.error('Response data:', retryError.response.data)
          }
          console.error('Error stack:', retryError.stack)
        } else {
          console.error('Non-Error object thrown:', retryError)
        }
        
        // Fallback to manual token generation if the SDK methods fail
        return NextResponse.json(
          { 
            error: 'Failed to get authentication token',
            message: retryError instanceof Error ? retryError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('Error generating auth token:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication token' },
      { status: 500 }
    )
  }
}