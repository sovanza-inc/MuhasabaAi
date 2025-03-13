import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { customer_id } = await request.json();

    if (!customer_id) {
      return NextResponse.json(
        { 
          error: 'Missing required parameter',
          details: 'customer_id is required'
        },
        { status: 400 }
      );
    }

    // Get environment variables
    const clientId = process.env.LEAN_TECH_CLIENT_ID;
    const clientSecret = process.env.LEAN_TECH_CLIENT_SECRET;

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
      // Create form data with customer-specific scope
      const formData = new URLSearchParams();
      formData.append('client_id', clientId);
      formData.append('client_secret', clientSecret);
      formData.append('grant_type', 'client_credentials');
      formData.append('scope', `customer.${customer_id}`);

      // Call Lean Tech token endpoint for customer-specific token
      const tokenResponse = await axios.post(
        'https://auth.sandbox.leantech.me/oauth2/token',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Return the access token response
      return NextResponse.json({
        access_token: tokenResponse.data.access_token,
        expires_in: tokenResponse.data.expires_in || 3599, // Default from memories
        token_type: tokenResponse.data.token_type || 'Bearer',
        scope: tokenResponse.data.scope
      });

    } catch (apiError) {
      if (axios.isAxiosError(apiError)) {
        console.error('Lean Tech Customer Token Error:', apiError.response?.data);
        
        return NextResponse.json(
          { 
            error: 'Failed to get customer token',
            details: apiError.response?.data || 'Unknown Lean Tech API error'
          },
          { status: apiError.response?.status || 500 }
        );
      }

      console.error('Unexpected customer token error:', apiError);
      return NextResponse.json(
        { 
          error: 'Failed to get customer token',
          details: 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Customer Token Route Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
