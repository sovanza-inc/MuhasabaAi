import { NextResponse } from 'next/server';

const LEAN_TECH_API_URL = 'https://sandbox.leantech.me';

export async function GET(request: Request) {
    try {
        // Get the entity_id from the query parameters
        const { searchParams } = new URL(request.url);
        const entityId = searchParams.get('entity_id');

        if (!entityId) {
            return NextResponse.json(
                { error: 'entity_id is required' },
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
            `${LEAN_TECH_API_URL}/data/v2/identity?async=false&page=0&size=50&entity_id=${entityId}&force_refresh=false`,
            {
                headers: {
                    'accept': '*/*',
                    'authorization': `Bearer ${authToken}`,
                },
            }
        );

        const data = await response.json();

        // Check if the response contains an error or no identities
        if (!response.ok || data.error || !data.data?.identities?.length) {
            console.error('Identity API Error:', data);
            return NextResponse.json(
                { 
                    error: 'Failed to fetch identity data',
                    details: data.error || data.message || 'No identity data available'
                },
                { status: response.status !== 200 ? response.status : 404 }
            );
        }

        // Return the successful response with the same structure as the Lean Tech API
        return NextResponse.json({
            status: data.status,
            data: data.data,
            message: data.message,
            results_id: data.results_id,
            timestamp: data.timestamp
        });

    } catch (error) {
        console.error('Error fetching identity data:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
} 