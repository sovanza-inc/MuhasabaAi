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
        const entityId = searchParams.get('entity_id');

        if (!accountId) {
            return NextResponse.json(
                { 
                    error: 'Failed to fetch balance',
                    details: 'Account ID is required'
                },
                { status: 400 }
            );
        }

        if (!entityId) {
            return NextResponse.json(
                { 
                    error: 'Failed to fetch balance',
                    details: 'Entity ID is required'
                },
                { status: 400 }
            );
        }

        console.log(`Fetching balance for account: ${accountId} with entity: ${entityId}`);

        try {
            const response = await axios.get(
                `https://sandbox.leantech.me/data/v2/accounts/${accountId}/balances`,
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
                        'Accept': '*/*'
                    }
                }
            );

            console.log('Balance API response status:', response.status);
            console.log('Balance API response data structure:', 
                      Array.isArray(response.data) ? 'Array' : 
                      (response.data && typeof response.data === 'object' ? 'Object' : 'Other'));
            console.log('Full balance response data:', JSON.stringify(response.data, null, 2));

            // Handle the nested structure from the Lean Tech API
            if (response.data && response.data.data && response.data.data.balances && 
                Array.isArray(response.data.data.balances) && response.data.data.balances.length > 0) {
                const balanceData = response.data.data.balances[0];
                
                // Format the balance data for the frontend
                const formattedBalance = {
                    account_id: balanceData.account_id,
                    balance: balanceData.amount?.amount,
                    currency: balanceData.amount?.currency,
                    type: balanceData.type,
                    credit_debit_indicator: balanceData.credit_debit_indicator,
                    updated_at: response.data.timestamp || new Date().toISOString()
                };
                
                return NextResponse.json(formattedBalance);
            }

            // If we get a successful response but can't find the expected structure, try other formats
            if (response.data) {
                // If response.data is already a balance object
                if (response.data.amount || response.data.balance) {
                    return NextResponse.json(response.data);
                }
                
                // If response.data has a balances array
                if (response.data.balances && Array.isArray(response.data.balances) && response.data.balances.length > 0) {
                    return NextResponse.json(response.data.balances[0]);
                }
                
                // If response.data is an array of balances
                if (Array.isArray(response.data) && response.data.length > 0) {
                    return NextResponse.json(response.data[0]);
                }
            }

            // If we couldn't find any balance data
            return NextResponse.json(
                { 
                    error: 'No balance data found',
                    details: 'The API returned a successful response but no balance data was found'
                },
                { status: 404 }
            );
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