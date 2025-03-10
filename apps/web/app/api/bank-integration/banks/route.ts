import { NextResponse } from 'next/server'
import Lean from '@leantechnologies/node-sdk'
import { mockBanks } from '../../../../lib/lean-sdk'
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

export async function GET() {
  try {
    console.log('Fetching banks from API endpoint')
    
    // First, get an authentication token
    try {
      // Define the auth URL based on environment
      const authUrl = process.env.NODE_ENV === 'production' 
        ? 'https://auth.leantech.me/oauth2/token'
        : 'https://auth.sandbox.leantech.me/oauth2/token'
      
      console.log('Getting authentication token from:', authUrl)
      
      // Get authentication token
      const tokenResponse = await axios.post(authUrl, 
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
      
      const token = tokenResponse.data.access_token
      console.log('Successfully obtained token, first 10 chars:', token.substring(0, 10) + '...')
      
      // Define the banks API URL based on environment
      const banksUrl = process.env.NODE_ENV === 'production'
        ? 'https://leantech.me/banks/v1'
        : 'https://sandbox.leantech.me/banks/v1'
      
      console.log('Fetching banks from:', banksUrl)
      
      // Make request to the banks API
      const banksResponse = await axios.get(banksUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      
      console.log('Banks fetched successfully:', banksResponse.status)
      
      // Check if we received the expected data format
      if (banksResponse.data && Array.isArray(banksResponse.data)) {
        // The response is already in the expected format (array of banks)
        console.log('Returning array of banks directly, count:', banksResponse.data.length)
        return NextResponse.json(banksResponse.data)
      } else if (banksResponse.data && typeof banksResponse.data === 'object') {
        // Check if the response has a data property that is an array
        if (banksResponse.data.data && Array.isArray(banksResponse.data.data)) {
          console.log('Returning banks.data array, count:', banksResponse.data.data.length)
          return NextResponse.json(banksResponse.data.data)
        }
        
        // If we reach here, the response format is unexpected but we'll return it anyway
        console.log('Unexpected response format, returning as is')
        return NextResponse.json(banksResponse.data)
      }
      
      // If we reach here, the response format is unexpected
      console.log('Unexpected response format, falling back to mock data')
      return NextResponse.json(mockBanks)
      
    } catch (apiError) {
      console.error('Error fetching banks from API:', apiError)
      
      if (axios.isAxiosError(apiError) && apiError.response) {
        console.error('Response status:', apiError.response.status)
        console.error('Response data:', apiError.response.data)
      }
      
      // Fallback to mock data if API call fails
      console.log('Using fallback mock data for banks')
      return NextResponse.json(mockBanks)
    }
  } catch (error) {
    console.error('Error in banks endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch banks',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: mockBanks
      },
      { status: 200 } // Return 200 with error details and mock data instead of 500
    )
  }
}
