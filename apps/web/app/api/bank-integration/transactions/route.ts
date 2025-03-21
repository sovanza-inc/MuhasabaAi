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
                    error: 'Failed to fetch transactions',
                    details: 'Authorization token is required'
                },
                { status: 401 }
            );
        }

        // Get account_id and entity_id from URL params
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('account_id');
        const entityId = searchParams.get('entity_id');

        if (!accountId) {
            return NextResponse.json(
                { 
                    error: 'Failed to fetch transactions',
                    details: 'Account ID is required'
                },
                { status: 400 }
            );
        }

        if (!entityId) {
            return NextResponse.json(
                { 
                    error: 'Failed to fetch transactions',
                    details: 'Entity ID is required'
                },
                { status: 400 }
            );
        }

        console.log(`Fetching transactions for account: ${accountId} with entity: ${entityId}`);

        try {
            const response = await axios.get(
                `https://sandbox.leantech.me/data/v2/accounts/${accountId}/transactions`,
                {
                    params: {
                        async: false,
                        page: 0,
                        size: 50,
                        entity_id: entityId,
                        verbose: false
                    },
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': '*/*'
                    }
                }
            );

            console.log('Transactions API response status:', response.status);
            console.log('Full transactions response data:', JSON.stringify(response.data, null, 2));

            // Handle the nested structure from the Lean Tech API
            if (response.data && response.data.data && response.data.data.transactions) {
                return NextResponse.json({
                    transactions: response.data.data.transactions,
                    timestamp: response.data.timestamp
                });
            }

            // If response.data is already an array of transactions
            if (Array.isArray(response.data)) {
                return NextResponse.json({
                    transactions: response.data,
                    timestamp: new Date().toISOString()
                });
            }

            // If we couldn't find any transaction data
            return NextResponse.json(
                { 
                    error: 'No transaction data found',
                    details: 'The API returned a successful response but no transaction data was found'
                },
                { status: 404 }
            );
        } catch (apiError: any) {
            console.error('Lean Tech API Error:', apiError.response?.data || apiError);
            return NextResponse.json(
                { 
                    error: 'Failed to fetch transactions',
                    details: apiError.response?.data?.message || 'Failed to fetch bank transactions'
                },
                { status: apiError.response?.status || 401 }
            );
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch transactions',
                details: 'Failed to process request'
            },
            { status: 500 }
        );
    }
} 