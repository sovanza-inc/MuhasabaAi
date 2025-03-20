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
                    error: 'Failed to fetch balance',
                    details: 'Authorization token is required'
                },
                { status: 401 }
            );
        }

        // Get account_id from URL params
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('account_id');

        // if (!accountId) {
        //     return NextResponse.json(
        //         { 
        //             error: 'Failed to fetch balance',
        //             details: 'Account ID is required'
        //         },
        //         { status: 400 }
        //     );
        // }

        try {
            const response = await axios.get(
                `https://sandbox.leantech.me/data/v2/accounts/${accountId}/balances`,
                {
                    // params: {
                    //     async: false,
                    //     page: 0,
                    //     size: 50,
                    //     force_refresh: false,
                    //     verbose: false
                    // },
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': '*/*'
                    }
                }
            );

            // If we get a successful response, return the first balance record
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                return NextResponse.json(response.data[0]);
            }

            return NextResponse.json(response.data);
        } catch (apiError: any) {
            console.error('Lean Tech API Error:', apiError.response?.data || apiError);
            return NextResponse.json(
                { 
                    error: 'Failed to fetch balance',
                    details: apiError.response?.data?.message || 'Failed to fetch bank balance'
                },
                { status: apiError.response?.status || 401 }
            );
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch balance',
                details: 'Failed to process request'
            },
            { status: 500 }
        );
    }
} 