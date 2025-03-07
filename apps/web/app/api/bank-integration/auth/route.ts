import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// URLs from official documentation
const LEAN_TECH_SANDBOX_URL = 'https://auth.sandbox.leantech.me'
const LEAN_TECH_PROD_URL = 'https://auth.leantech.me'

// Cache token expiry times (3599 seconds as per documentation)
const TOKEN_EXPIRY = 3599


export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json()
    const headersList = headers()
    
    // Ensure request is from our application
    const origin = (await headersList).get('origin')
    if (!origin?.includes(process.env.NEXT_PUBLIC_APP_URL || 'localhost')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!process.env.LEAN_TECH_CLIENT_ID || !process.env.LEAN_TECH_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Missing Lean Tech credentials' },
        { status: 500 }
      )
    }

    // Remove any leading/trailing spaces from credentials
    const clientId = process.env.LEAN_TECH_CLIENT_ID.trim()
    const clientSecret = process.env.LEAN_TECH_CLIENT_SECRET.trim()

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? LEAN_TECH_PROD_URL 
      : LEAN_TECH_SANDBOX_URL

    // According to docs: Two scopes: api (backend) and customer.<customer_id> (SDK)
    const scope = customerId 
      ? `customer.${customerId} api`
      : 'api'                        

    console.log('Attempting authentication with Lean Tech...')
    console.log('Base URL:', baseUrl)
    console.log('Using scope:', scope)

    const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: scope
      }).toString()
    })

    const responseText = await tokenResponse.text()
    
    if (!tokenResponse.ok) {
      console.error('Token response error:', responseText)
      console.error('Response status:', tokenResponse.status)
      console.error('Request URL:', `${baseUrl}/oauth2/token`)
      return NextResponse.json(
        { error: `Failed to get token: ${responseText}` },
        { status: tokenResponse.status }
      )
    }

    let tokenData: any
    try {
      tokenData = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse token response:', e)
      return NextResponse.json(
        { error: 'Invalid token response format' },
        { status: 500 }
      )
    }

    if (!tokenData.access_token) {
      console.error('Token response missing access_token:', tokenData)
      return NextResponse.json(
        { error: 'Invalid token response: missing access_token' },
        { status: 500 }
      )
    }

    console.log('Token received successfully')
    
    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in || TOKEN_EXPIRY,
      token_type: tokenData.token_type || 'Bearer',
      scope: tokenData.scope || scope
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}