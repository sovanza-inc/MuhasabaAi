import Lean from '@leantechnologies/node-sdk'

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

// Mock data for testing
export const mockBanks = [
  {
    id: 'mock-bank-1',
    identifier: 'MOCK_BANK_1',
    name: 'Mock Bank 1',
    logo: 'https://via.placeholder.com/150',
    country: 'UAE',
    type: 'personal'
  },
  {
    id: 'mock-bank-2',
    identifier: 'MOCK_BANK_2',
    name: 'Mock Bank 2',
    logo: 'https://via.placeholder.com/150',
    country: 'UAE',
    type: 'personal'
  }
]

// Get access token for Lean API
export async function getAccessToken(customerId?: string) {
  try {
    console.log('Getting access token for Lean API')
    
    // Check if credentials are available
    if (!process.env.LEAN_TECH_CLIENT_ID || !process.env.LEAN_TECH_CLIENT_SECRET) {
      console.error('Missing Lean Tech credentials in environment variables')
      return null
    }
    
    // Define the scope based on whether a customer ID is provided
    const scope = customerId ? `api customer.${customerId}` : 'api'
    console.log('Using scope:', scope)
    
    // Get token using the SDK
    const tokenResponse = await (leanClient as LeanSDK).auth.token({
      grantType: 'client_credentials',
      scope
    })
    
    console.log('Token received, first 10 chars:', tokenResponse.accessToken.substring(0, 10) + '...')
    return tokenResponse.accessToken
  } catch (error) {
    console.error('Error getting access token:', error)
    return null
  }
}

// Function to get supported banks
export async function getSupportedBanks() {
  try {
    console.log('Attempting to fetch real bank data from Lean API')
    
    // Get banks using the SDK
    const banks = await leanClient.banks.list()
    console.log('Successfully fetched banks from Lean API:', banks.length, 'banks')
    
    if (banks && banks.length > 0) {
      return banks
    }
    
    console.log('No banks returned from API, falling back to mock data')
    return mockBanks
  } catch (error) {
    console.error('Error fetching banks from Lean API:', error)
    console.log('Falling back to mock bank data')
    return mockBanks
  }
}

// Function to get identity data
export async function getIdentity(customerId: string) {
  try {
    console.log(`Fetching identity data for customer ${customerId}`)
    
    const identity = await leanClient.customers.getIdentity(customerId)
    console.log('Successfully fetched identity data')
    return identity
  } catch (error) {
    console.error('Error fetching identity data:', error)
    return null
  }
}

// Function to get accounts data
export async function getAccounts(customerId: string) {
  try {
    console.log(`Fetching accounts data for customer ${customerId}`)
    
    const accounts = await leanClient.customers.getAccounts(customerId)
    console.log('Successfully fetched accounts data:', accounts.length, 'accounts')
    return accounts
  } catch (error) {
    console.error('Error fetching accounts data:', error)
    return []
  }
}

// Function to get balance data
export async function getBalance(customerId: string, accountId: string) {
  try {
    console.log(`Fetching balance data for customer ${customerId} and account ${accountId}`)
    
    const balance = await leanClient.customers.getAccountBalance(customerId, accountId)
    console.log('Successfully fetched balance data')
    return balance
  } catch (error) {
    console.error('Error fetching balance data:', error)
    return null
  }
}

// Function to get transactions data
export async function getTransactions(
  customerId: string, 
  accountId: string, 
  fromDate: string, 
  toDate: string,
  includeDetails: boolean = false
) {
  try {
    console.log(`Fetching transactions for customer ${customerId} and account ${accountId} from ${fromDate} to ${toDate}`)
    
    const transactions = await leanClient.customers.getAccountTransactions(customerId, accountId, {
      fromDate,
      toDate,
      includeDetails
    })
    
    console.log('Successfully fetched transactions data:', transactions.length, 'transactions')
    return transactions
  } catch (error) {
    console.error('Error fetching transactions data:', error)
    return []
  }
}

// Function to create a customer
export async function createCustomer(appName: string = 'MuhasabaAI') {
  try {
    console.log('Creating a new customer')
    
    // Generate a unique customer ID based on app name and timestamp
    const timestamp = Date.now().toString()
    const randomId = Math.random().toString(36).substring(2, 10)
    const customerId = Buffer.from(`${appName}-${timestamp}-${randomId}`).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    console.log('Generated customer ID:', customerId)
    
    // Create the customer using the SDK
    await leanClient.customers.create({
      id: customerId
    })
    
    return customerId
  } catch (error) {
    console.error('Error creating customer:', error)
    
    // If there's an error, still return the generated ID as we might just be
    // getting an error because the customer already exists
    return null
  }
}

// Function to connect a bank
export async function connectBank(customerId: string, bankId: string) {
  try {
    console.log(`Connecting bank ${bankId} for customer ${customerId}`)
    
    const connection = await leanClient.connections.create({
      customerId,
      bankId
    })
    
    console.log('Successfully created connection:', connection.id)
    return connection
  } catch (error) {
    console.error('Error connecting bank:', error)
    return null
  }
}

// Define the window interface for the Lean SDK
declare global {
  interface Window {
    LeanLoader?: {
      init: (config: any) => void
      open: () => void
    }
  }
}

// Export the SDK functions
const leanSdk = {
  getSupportedBanks,
  getIdentity,
  getAccounts,
  getBalance,
  getTransactions,
  createCustomer,
  connectBank,
  getAccessToken,
  mockBanks
}

export default leanSdk