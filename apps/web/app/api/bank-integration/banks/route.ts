import { NextResponse } from 'next/server'
import axios from 'axios'

const authUrl = process.env.NODE_ENV === 'production'
  ? 'https://auth.leantech.me/oauth2/token'
  : 'https://auth.sandbox.leantech.me/oauth2/token'

const banksUrl = process.env.NODE_ENV === 'production'
  ? 'https://leantech.me/banks/v1'
  : 'https://sandbox.leantech.me/banks/v1'

export async function GET() {
  try {
    console.log('Fetching banks from API endpoint')
    
    try {
      console.log('Getting authentication token from:', authUrl)
      
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
      
      console.log('Fetching banks from:', banksUrl)
      
      const banksResponse = await axios.get(banksUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      
      console.log('Banks fetched successfully:', banksResponse.status)
      
      if (banksResponse.data && Array.isArray(banksResponse.data)) {
        console.log('Returning array of banks directly, count:', banksResponse.data.length)
        return NextResponse.json(banksResponse.data)
      } else if (banksResponse.data && typeof banksResponse.data === 'object') {
        if (banksResponse.data.data && Array.isArray(banksResponse.data.data)) {
          console.log('Returning banks.data array, count:', banksResponse.data.data.length)
          return NextResponse.json(banksResponse.data.data)
        }
        
        console.log('Unexpected response format, returning as is')
        return NextResponse.json(banksResponse.data)
      }
      
      console.log('Unexpected response format, falling back to mock data')
      return NextResponse.json([
        {
          id: 'mock-bank-1',
          name: 'Demo Bank',
          logo: 'https://via.placeholder.com/150',
          country_code: 'ARE',
          active: true,
          mock: true
        },
        {
          id: 'mock-bank-2',
          name: 'Test Bank',
          logo: 'https://via.placeholder.com/150',
          country_code: 'SAU',
          active: true,
          mock: true
        }
      ])
      
    } catch (apiError) {
      console.error('Error fetching banks from API:', apiError)
      
      if (axios.isAxiosError(apiError) && apiError.response) {
        console.error('Response status:', apiError.response.status)
        console.error('Response data:', apiError.response.data)
      }
      
      console.log('Using fallback mock data for banks')
      return NextResponse.json([
        {
          id: 'mock-bank-1',
          name: 'Demo Bank',
          logo: 'https://via.placeholder.com/150',
          country_code: 'ARE',
          active: true,
          mock: true
        },
        {
          id: 'mock-bank-2',
          name: 'Test Bank',
          logo: 'https://via.placeholder.com/150',
          country_code: 'SAU',
          active: true,
          mock: true
        }
      ])
    }
  } catch (error) {
    console.error('Error in banks endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch banks',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [
          {
            id: 'mock-bank-1',
            name: 'Demo Bank',
            logo: 'https://via.placeholder.com/150',
            country_code: 'ARE',
            active: true,
            mock: true
          },
          {
            id: 'mock-bank-2',
            name: 'Test Bank',
            logo: 'https://via.placeholder.com/150',
            country_code: 'SAU',
            active: true,
            mock: true
          }
        ]
      },
      { status: 200 } // Return 200 with error details and mock data instead of 500
    )
  }
}
