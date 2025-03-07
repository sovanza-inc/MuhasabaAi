import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

const LEAN_TECH_SANDBOX_URL = 'https://sandbox.leantech.me/banks/v1'
const LEAN_TECH_PROD_URL = 'https://api.leantech.me/banks/v1'

export async function GET(req: NextRequest) {
  try {
    const headersList = headers()
    
    // Get the access token from the Authorization header
    const authHeader = (await headersList).get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
    }
    const accessToken = authHeader.split(' ')[1]

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? LEAN_TECH_PROD_URL 
      : LEAN_TECH_SANDBOX_URL

    console.log('Fetching available banks...')
    console.log('Base URL:', baseUrl)
    
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
    })

    const responseText = await response.text()
    console.log('Raw response:', responseText)

    if (!response.ok) {
      console.error('Failed to fetch banks:', responseText)
      console.error('Response status:', response.status)
      return NextResponse.json(
        { error: `Failed to fetch banks: ${responseText}` },
        { status: response.status }
      )
    }

    let banks
    try {
      banks = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse banks response:', e)
      return NextResponse.json(
        { error: 'Invalid response format from bank API' },
        { status: 500 }
      )
    }

    return NextResponse.json(banks)
  } catch (error) {
    console.error('Error fetching banks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
