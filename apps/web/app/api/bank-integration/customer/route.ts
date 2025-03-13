import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const requestBody = await request.json();
    const { app_user_id } = requestBody;

    // Validate app_user_id
    if (!app_user_id) {
      return NextResponse.json(
        { 
          error: 'Missing required parameter',
          details: 'app_user_id is required'
        },
        { status: 400 }
      );
    }

    // Extract authorization token from headers
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '') || 
      request.headers.get('Authorization')?.replace('Bearer ', '');

    // Validate auth token
    if (!authToken) {
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: 'Authorization token is required'
        },
        { status: 401 }
      );
    }

    try {
      // Call Lean Tech customer creation endpoint
      const customerResponse = await axios.post(
        'https://sandbox.leantech.me/customers/v1',
        { app_user_id: app_user_id.trim() },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Return customer ID and app_user_id
      return NextResponse.json({
        customer_id: customerResponse.data.customer_id,
        app_user_id: customerResponse.data.app_user_id
      }, { status: 201 });

    } catch (apiError) {
      // Handle Lean Tech API errors
      if (axios.isAxiosError(apiError)) {
        console.error('Lean Tech Customer Creation Error:', apiError.response?.data);
        
        return NextResponse.json(
          { 
            error: 'Customer creation failed',
            details: apiError.response?.data || 'Unknown Lean Tech API error'
          },
          { status: apiError.response?.status || 500 }
        );
      }

      // Handle unexpected errors
      console.error('Unexpected customer creation error:', apiError);
      return NextResponse.json(
        { 
          error: 'Customer creation failed',
          details: 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Handle request parsing or other unexpected errors
    console.error('Customer Creation Route Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
