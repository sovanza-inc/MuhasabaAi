import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use sandbox URL for authentication
    const authUrl = 'https://auth.sandbox.leantech.me/oauth2/token';
    
    // Retrieve credentials from environment variables
    const clientId = process.env.LEAN_TECH_CLIENT_ID;
    const clientSecret = process.env.LEAN_TECH_CLIENT_SECRET;
    
    // Validate credentials
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { 
          error: 'Missing Lean Tech credentials',
          details: 'Client ID or Client Secret is not configured'
        },
        { status: 400 }
      );
    }
    
    try {
      // Perform authentication request exactly as specified in the curl command
      const tokenResponse = await axios.post(authUrl, 
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
          scope: 'api'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Return the access token and its details
      return NextResponse.json({
        access_token: tokenResponse.data.access_token,
        expires_in: tokenResponse.data.expires_in || 3599,
        token_type: tokenResponse.data.token_type || 'Bearer',
        scope: 'api'
      });
    } catch (authError) {
      // Detailed error logging
      console.error('Lean Tech Authentication Error:', 
        axios.isAxiosError(authError) 
          ? authError.response?.data 
          : authError
      );
      
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: axios.isAxiosError(authError) 
            ? authError.response?.data 
            : 'Unknown authentication error'
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in Lean Tech authentication:', error);
    
    return NextResponse.json(
      { 
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add POST method to handle potential future requirements
export async function POST() {
  // Reuse the GET method's logic for now
  return GET();
}