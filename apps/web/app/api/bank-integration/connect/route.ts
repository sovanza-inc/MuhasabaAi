import { NextRequest, NextResponse } from 'next/server'
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
  sandbox: process.env.NODE_ENV !== 'production'
}) as LeanSDK;

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json()
    const { customerId, bankId } = body

    if (!customerId || !bankId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log(`Creating connection for customer ${customerId} with bank ${bankId}`)

    try {
      // First, get an authentication token
      const authUrl = process.env.NODE_ENV === 'production' 
        ? 'https://auth.leantech.me/oauth2/token'
        : 'https://auth.sandbox.leantech.me/oauth2/token'
      
      console.log('Getting authentication token from:', authUrl)
      
      // Get authentication token with customer-specific scope
      const tokenResponse = await axios.post(authUrl, 
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: `api customer.${customerId}`,
          client_id: process.env.LEAN_TECH_CLIENT_ID || '',
          client_secret: process.env.LEAN_TECH_CLIENT_SECRET || ''
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
      
      const token = tokenResponse.data.access_token
      console.log('Successfully obtained token with customer scope')
      
      // Define the connect API URL based on environment
      const apiBaseUrl = process.env.NODE_ENV === 'production'
        ? 'https://api.leantech.me'
        : 'https://api.sandbox.leantech.me'
      
      // Create a connection for the customer with the specified bank
      const connectUrl = `${apiBaseUrl}/customers/v1/customers/${customerId}/connections`
      
      console.log('Creating connection at:', connectUrl)
      
      const connectionResponse = await axios.post(connectUrl, 
        {
          bank_id: bankId,
          permissions: [
            'identity', 
            'accounts', 
            'balance', 
            'transactions', 
            'payments', 
            'beneficiaries'
          ],
          app_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      console.log('Connection created successfully:', connectionResponse.status)
      
      // Return the connection response
      return NextResponse.json(connectionResponse.data)
      
    } catch (apiError) {
      console.error('Error creating connection:', apiError)
      
      if (axios.isAxiosError(apiError) && apiError.response) {
        console.error('Response status:', apiError.response.status)
        console.error('Response data:', apiError.response.data)
        
        return NextResponse.json(
          { 
            error: 'Failed to create connection',
            message: apiError.response.data || apiError.message,
            status: apiError.response.status
          },
          { status: apiError.response.status }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create connection', message: apiError instanceof Error ? apiError.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in connect endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to process request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
