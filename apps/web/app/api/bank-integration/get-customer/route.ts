import { NextResponse } from 'next/server';

const LEAN_TECH_API_URL = 'https://sandbox.leantech.me';

export async function GET(request: Request) {
    try {
        // Get the app_user_id from the query parameters
        const { searchParams } = new URL(request.url);
        const appUserId = searchParams.get('app_user_id');

        if (!appUserId) {
            return NextResponse.json(
                { error: 'app_user_id is required' },
                { status: 400 }
            );
        }

        // Get the authorization token from request header
        const authToken = request.headers.get('authorization')?.replace('Bearer ', '') || 
                         request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!authToken) {
            return NextResponse.json(
                { error: 'Authorization token is required' },
                { status: 401 }
            );
        }

        // Make the request to Lean Tech API
        const response = await fetch(
            `${LEAN_TECH_API_URL}/customers/v1/app-user-id/${appUserId}`,
            {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${authToken}`,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch customer data' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching customer data:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 