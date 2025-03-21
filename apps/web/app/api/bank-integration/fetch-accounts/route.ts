import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
    try {
        // Get auth token from request headers
        const authToken = request.headers.get('authorization')?.replace('Bearer ', '') || 
            request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!authToken) {
            return NextResponse.json(
                { 
                    error: 'Failed to fetch accounts',
                    details: 'Authorization token is required'
                },
                { status: 401 }
            );
        }

        // Get entity_id from URL params
        const { searchParams } = new URL(request.url);
        const entityId = searchParams.get('entity_id');
        
        console.log('Received entity_id:', entityId);

        if (!entityId) {
            return NextResponse.json(
                { 
                    error: 'Failed to fetch accounts',
                    details: 'Entity ID is required'
                },
                { status: 400 }
            );
        }

        try {
            console.log(`Making request to Lean API with entity_id: ${entityId}`);
            
            const response = await axios.get(
                `https://sandbox.leantech.me/data/v2/accounts`,
                {
                    params: {
                        async: false,
                        page: 0,
                        size: 50,
                        entity_id: entityId,
                        force_refresh: false,
                        verbose: false
                    },
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Lean API response status:', response.status);
            console.log('Lean API response data structure:', 
                        Array.isArray(response.data) ? 'Array' : 
                        (response.data && typeof response.data === 'object' ? 'Object' : 'Other'));
            console.log('Full response data:', JSON.stringify(response.data, null, 2));

            // Ensure we're returning an array of accounts
            if (response.data) {
                // If response.data is already an array, return it
                if (Array.isArray(response.data)) {
                    return NextResponse.json(response.data);
                }
                
                // Check for data.accounts structure (from the Lean Tech API documentation)
                if (response.data.data && response.data.data.accounts && Array.isArray(response.data.data.accounts)) {
                    return NextResponse.json(response.data.data.accounts);
                }
                
                // If response.data has a data property that's an array, return that
                if (response.data.data && Array.isArray(response.data.data)) {
                    return NextResponse.json(response.data.data);
                }

                // Check for accounts array directly in the response
                if (response.data.accounts && Array.isArray(response.data.accounts)) {
                    return NextResponse.json(response.data.accounts);
                }
                
                // Otherwise, wrap the response in an array if it's a single object
                if (typeof response.data === 'object' && response.data !== null) {
                    // If it's a single account object (has id, name, etc.), wrap it
                    if (response.data.id) {
                        return NextResponse.json([response.data]);
                    }
                }
            }
            
            // Default to empty array if we couldn't determine the structure
            return NextResponse.json([]);
        } catch (error) {
            console.error('Error fetching accounts from Lean API:', error);
            
            if (axios.isAxiosError(error) && error.response) {
                console.error('Lean API error response:', error.response.data);
                return NextResponse.json(
                    { 
                        error: 'Failed to fetch accounts',
                        details: error.response.data || error.message,
                        status: error.response.status
                    },
                    { status: error.response.status }
                );
            }

            return NextResponse.json(
                { 
                    error: 'Failed to fetch accounts',
                    details: error instanceof Error ? error.message : 'Unknown error'
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error in fetch-accounts API route:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch accounts',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
