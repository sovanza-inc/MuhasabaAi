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
            const response = await axios.get(
                `https://sandbox.leantech.me/customers/v1/${entityId}/entities`,
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            return NextResponse.json(response.data);
        } catch (apiError: any) {
            console.error('Lean Tech API Error:', apiError.response?.data || apiError);
            return NextResponse.json(
                { 
                    error: 'Failed to fetch accounts',
                    details: apiError.response?.data?.message || 'Failed to fetch connected banks'
                },
                { status: apiError.response?.status || 401 }
            );
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch accounts',
                details: 'Failed to process request'
            },
            { status: 500 }
        );
    }
} 