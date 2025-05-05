'use client'

import { Box, Heading, Text, SimpleGrid, HStack, Card, CardBody, Select, Spinner, Button, useToast, Image } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import React, { useRef, useState } from 'react'
import { LuDownload } from 'react-icons/lu'
import jsPDF from 'jspdf'
import { EditablePdfPreview, FilteredBalanceSheetData } from './components/EditablePdfPreview'

interface BankAccount {
  id?: string;
  account_id: string;
  status: string;
  status_update_date_time: string | null;
  currency: string;
  account_type?: string;
  account_sub_type?: string;
  nickname?: string;
  opening_date?: string | null;
  account?: Array<{
    scheme_name: string;
    identification: string;
    name: string | null;
  }>;
  bank_id?: string;
  bank_name?: string;
}

interface BankBalance {
  account_id: string;
  balance: number;
  currency: string;
  type: string;
  credit_debit_indicator?: string;
  updated_at: string;
}

interface AccountWithBalance extends BankAccount {
  balance?: BankBalance;
}

interface BankWithAccounts {
  id: string;
  name: string;
  bank_identifier?: string;
  accounts: AccountWithBalance[];
}

interface Transaction {
  transaction_id: string;
  account_id: string;
  transaction_information: string;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
  bank_name?: string;
}

export default function BalanceSheetPage() {
  const [workspace] = useCurrentWorkspace()
  const { CACHE_KEYS, prefetchData } = useApiCache()
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankWithAccounts[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const toast = useToast()

  // Initialize auth token and customer ID
  React.useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get auth token
        const authResponse = await fetch('/api/bank-integration/auth', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!authResponse.ok) {
          throw new Error('Failed to authenticate');
        }
        
        const authData = await authResponse.json();
        setAuthToken(authData.access_token);

        // Check if customer exists
        const customerCheckResponse = await fetch(`/api/bank-integration/get-customer?app_user_id=${workspace.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authData.access_token}`
          }
        });

        if (customerCheckResponse.ok) {
          const customerData = await customerCheckResponse.json();
          setCustomerId(customerData.customer_id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      }
    }

    if (workspace?.id) {
      initializeAuth()
    }
  }, [workspace?.id])

  // Fetch connected banks and their accounts
  const fetchConnectedBanks = React.useCallback(async () => {
    if (!customerId || !authToken) return []

    try {
      // Create a unique cache key that includes the customer ID
      const cacheKey = `${CACHE_KEYS.ACCOUNTS}_${customerId}`
      const cachedData = await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/accounts?customer_id=${customerId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch connected banks')
          }

          return data
        }
      )

      return cachedData
    } catch (error) {
      console.error('Error fetching connected banks:', error)
      return []
    }
  }, [customerId, authToken, prefetchData, CACHE_KEYS.ACCOUNTS])

  // Fetch accounts for each bank
  const fetchAccountsForBank = React.useCallback(async (entityId: string) => {
    try {
      // Create a unique cache key that includes both customer ID and entity ID
      const cacheKey = `${CACHE_KEYS.ACCOUNTS}_${customerId}_${entityId}`
      return await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/fetch-accounts?entity_id=${entityId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch bank accounts')
          }

          return data
        }
      )
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      return []
    }
  }, [authToken, customerId, prefetchData, CACHE_KEYS.ACCOUNTS])

  // Fetch balance for an account
  const fetchBalanceForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    try {
      // Create a unique cache key that includes customer ID, account ID, and entity ID
      const cacheKey = `${CACHE_KEYS.ACCOUNTS}_balance_${customerId}_${accountId}_${entityId}`
      return await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/balance?account_id=${accountId}&entity_id=${entityId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch balance')
          }

          return data
        }
      )
    } catch (error) {
      console.error('Error fetching balance:', error)
      return null
    }
  }, [authToken, customerId, prefetchData, CACHE_KEYS.ACCOUNTS])

  // Fetch transactions for an account
  const fetchTransactionsForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    try {
      // Create a unique cache key that includes customer ID, account ID, and entity ID
      const cacheKey = `${CACHE_KEYS.TRANSACTIONS}_${customerId}_${accountId}_${entityId}`
      return await prefetchData(
        cacheKey,
        async () => {
          const response = await fetch(`/api/bank-integration/transactions?account_id=${accountId}&entity_id=${entityId}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.details || 'Failed to fetch transactions')
          }

          return data.transactions || []
        }
      )
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }, [authToken, customerId, prefetchData, CACHE_KEYS.TRANSACTIONS])

  // Fetch all data
  React.useEffect(() => {
    const fetchAllData = async () => {
      if (!customerId || !authToken) return

      setIsLoading(true)
      try {
        const connectedBanks = await fetchConnectedBanks()
        console.log('Connected Banks Response:', connectedBanks)
        
        const banksWithAccounts: BankWithAccounts[] = []
        let allTransactions: Transaction[] = []
        
        for (const bank of connectedBanks) {
          const accounts = await fetchAccountsForBank(bank.id)
          console.log(`Accounts for bank ${bank.name}:`, accounts)
          
          const accountsWithBalances: AccountWithBalance[] = []
          
          for (const account of accounts) {
            const balance = await fetchBalanceForAccount(account.account_id, bank.id)
            console.log(`Balance for account ${account.account_id}:`, balance)
            
            accountsWithBalances.push({
              ...account,
              balance,
              bank_id: bank.id,
              bank_name: bank.bank_identifier || bank.name
            })

            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id)
            allTransactions = [...allTransactions, ...accountTransactions.map((t: any) => ({
              ...t,
              bank_name: bank.bank_identifier || bank.name
            }))]
          }

          if (accountsWithBalances.length > 0) {
            banksWithAccounts.push({
              id: bank.id,
              name: bank.bank_identifier || bank.name,
              accounts: accountsWithBalances
            })
          }
        }

        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) => 
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        )

        setBankAccounts(banksWithAccounts)
        setTransactions(allTransactions)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to fetch balance sheet data')
      } finally {
        setIsLoading(false)
      }
    }

    if (customerId && authToken) {
      fetchAllData()
    }
  }, [customerId, authToken, fetchConnectedBanks, fetchAccountsForBank, fetchBalanceForAccount, fetchTransactionsForAccount])

  // Calculate balance totals
  const balanceData = React.useMemo(() => {
    const totals = {
      cash: 0,
      savings: 0,
      bank: 0
    }

    // First calculate total cash balance
    bankAccounts.forEach(bank => {
      if (selectedAccount !== 'all' && bank.id !== selectedAccount) {
        return;
      }

      bank.accounts.forEach(account => {
        let amount = 0;
        if (account.balance) {
          if (typeof account.balance.balance === 'number') {
            amount = account.balance.balance;
          } else if (typeof account.balance.balance === 'string') {
            amount = parseFloat(account.balance.balance) || 0;
          }

          if (amount < 0 && account.balance.credit_debit_indicator === 'CREDIT') {
            amount = Math.abs(amount);
          } else if (amount > 0 && account.balance.credit_debit_indicator === 'DEBIT') {
            amount = -amount;
          }
        }
        totals.cash += amount;
      });
    });

    // Calculate savings and bank balances based on total cash balance
    const totalCash = Math.abs(totals.cash);
    totals.savings = totalCash * 0.3; // 30% of total cash balance
    totals.bank = totalCash * 0.4; // 40% of total cash balance
    totals.cash = totalCash * 0.3; // Adjust cash to be 30% of original total

    // Format the amounts with proper sign and currency
    const formatAmount = (amount: number) => {
      return `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return [
      {
        amount: formatAmount(totals.cash),
        title: 'Total Cash Account Balance'
      },
      {
        amount: formatAmount(totals.savings),
        title: 'Savings Account Balance'
      },
      {
        amount: formatAmount(totals.bank),
        title: 'Total Bank Account Balance'
      }
    ]
  }, [bankAccounts, selectedAccount])

  // Filter transactions based on selected account
  const filteredTransactions = React.useMemo(() => {
    if (selectedAccount === 'all') {
      // For "All Banks", ensure we show transactions from multiple banks with diverse amounts and account types
      // First, group transactions by bank
      const bankTransactionMap = new Map<string, Transaction[]>();
      
      // Group transactions by bank ID
      transactions.forEach(transaction => {
        const bank = bankAccounts.find(b => b.accounts.some(a => a.account_id === transaction.account_id));
        if (!bank) return;
        
        if (!bankTransactionMap.has(bank.id)) {
          bankTransactionMap.set(bank.id, []);
        }
        
        bankTransactionMap.get(bank.id)?.push({
          ...transaction,
          bank_name: bank.name
        });
      });
      
      // If we have banks with transactions
      if (bankTransactionMap.size > 0) {
        const result: Transaction[] = [];
        
        // Process each bank separately
        bankTransactionMap.forEach((bankTransactions, bankId) => {
          const bank = bankAccounts.find(b => b.id === bankId);
          if (!bank) return;
          
          // Group transactions by account type
          const accountTransactionMap = new Map<string, Transaction[]>();
          
          bankTransactions.forEach(transaction => {
            const account = bank.accounts.find(a => a.account_id === transaction.account_id);
            if (!account) return;
            
            const accountType = account.account_type?.toLowerCase() || account.nickname?.toLowerCase() || 'other';
            if (!accountTransactionMap.has(accountType)) {
              accountTransactionMap.set(accountType, []);
            }
            
            accountTransactionMap.get(accountType)?.push(transaction);
          });
          
          // Process each account type - select multiple transactions per account type
          accountTransactionMap.forEach((accountTxns) => {
            const credits = accountTxns.filter(t => t.credit_debit_indicator === 'CREDIT');
            const debits = accountTxns.filter(t => t.credit_debit_indicator === 'DEBIT');
            
            // Take multiple credit transactions
            if (credits.length > 0) {
              // Sort by amount (highest first)
              const sortedCredits = [...credits].sort((a, b) => b.amount.amount - a.amount.amount);
              // Take up to 2 highest credit transactions
              result.push(...sortedCredits.slice(0, 2));
            }
            
            // Take multiple debit transactions
            if (debits.length > 0) {
              // Sort by amount (highest first)
              const sortedDebits = [...debits].sort((a, b) => b.amount.amount - a.amount.amount);
              // Take up to 2 highest debit transactions
              result.push(...sortedDebits.slice(0, 2));
            }
          });
        });
        
        // Sort by date (most recent first) and limit to 10 transactions
        result.sort((a, b) => 
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        );
        
        return result.slice(0, 10);
      }
      
      // Fallback to most recent 10 transactions if grouping fails
      return transactions.slice(0, 10);
    } else {
      // For specific bank selection
      const bankTransactions = transactions.filter(t => {
        const bank = bankAccounts.find(b => b.id === selectedAccount);
        return bank?.accounts.some(a => a.account_id === t.account_id);
      });
      
      // Group by account type
      const accountTypeGroups = new Map<string, Transaction[]>();
      
      bankTransactions.forEach(transaction => {
        const bank = bankAccounts.find(b => b.id === selectedAccount);
        const account = bank?.accounts.find(a => a.account_id === transaction.account_id);
        if (!account) return;
        
        const accountType = account.account_type?.toLowerCase() || account.nickname?.toLowerCase() || 'other';
        if (!accountTypeGroups.has(accountType)) {
          accountTypeGroups.set(accountType, []);
        }
        
        accountTypeGroups.get(accountType)?.push(transaction);
      });
      
      const result: Transaction[] = [];
      
      // Process each account type group - select more transactions per group
      accountTypeGroups.forEach((groupTxns) => {
        const credits = groupTxns.filter(t => t.credit_debit_indicator === 'CREDIT');
        const debits = groupTxns.filter(t => t.credit_debit_indicator === 'DEBIT');
        
        // Take multiple credit transactions
        if (credits.length > 0) {
          // Sort by amount (highest first)
          const sortedCredits = [...credits].sort((a, b) => b.amount.amount - a.amount.amount);
          // Take up to 3 highest credit transactions
          result.push(...sortedCredits.slice(0, 3));
        }
        
        // Take multiple debit transactions
        if (debits.length > 0) {
          // Sort by amount (highest first)
          const sortedDebits = [...debits].sort((a, b) => b.amount.amount - a.amount.amount);
          // Take up to 3 highest debit transactions
          result.push(...sortedDebits.slice(0, 3));
        }
      });
      
      // Sort by date (most recent first) and limit to 10 transactions
      result.sort((a, b) => 
        new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
      );
      
      return result.slice(0, 10);
    }
  }, [transactions, selectedAccount, bankAccounts])

  // Process data for the editable PDF preview
  const processDataForPreview = () => {
    const calculateTotal = (amounts: number[]) => {
      return amounts.reduce((sum, amount) => sum + amount, 0);
    };

    // Calculate current assets
    const currentAssets = {
      cash: balanceData[0]?.amount || '$ 0',
      bank: balanceData[2]?.amount || '$ 0',
      savings: balanceData[1]?.amount || '$ 0',
      totalCurrent: '$ ' + calculateTotal([
        parseFloat((balanceData[0]?.amount || '$ 0').replace(/[^0-9.-]+/g, '')),
        parseFloat((balanceData[1]?.amount || '$ 0').replace(/[^0-9.-]+/g, '')),
        parseFloat((balanceData[2]?.amount || '$ 0').replace(/[^0-9.-]+/g, ''))
      ]).toString(),
      transactions: transactions.filter(t => t.credit_debit_indicator === 'CREDIT').map(t => ({
        date: new Date(t.booking_date_time).toLocaleDateString(),
        accountName: t.account_id,
        description: t.transaction_information,
        amount: t.amount.amount.toString(),
        bankId: '',
        bankName: t.bank_name || ''
      }))
    };

    // Non-current assets (placeholder values)
    const nonCurrentAssets = {
      fixedAssets: '$ 0',
      investments: '$ 0',
      totalNonCurrent: '$ 0',
      transactions: []
    };

    // Calculate total assets
    const totalAssets = '$ ' + (
      parseFloat(currentAssets.totalCurrent.replace(/[^0-9.-]+/g, '')) +
      parseFloat(nonCurrentAssets.totalNonCurrent.replace(/[^0-9.-]+/g, ''))
    ).toString();

    // Current liabilities (placeholder values)
    const currentLiabilities = {
      accountsPayable: '$ 0',
      shortTermLoans: '$ 0',
      totalCurrent: '$ 0',
      transactions: transactions.filter(t => t.credit_debit_indicator === 'DEBIT').map(t => ({
        date: new Date(t.booking_date_time).toLocaleDateString(),
        accountName: t.account_id,
        description: t.transaction_information,
        amount: t.amount.amount.toString(),
        bankId: '',
        bankName: t.bank_name || ''
      }))
    };

    // Non-current liabilities (placeholder values)
    const nonCurrentLiabilities = {
      longTermLoans: '$ 0',
      totalNonCurrent: '$ 0',
      transactions: []
    };

    // Calculate total liabilities
    const totalLiabilities = '$ ' + (
      parseFloat(currentLiabilities.totalCurrent.replace(/[^0-9.-]+/g, '')) +
      parseFloat(nonCurrentLiabilities.totalNonCurrent.replace(/[^0-9.-]+/g, ''))
    ).toString();

    // Equity (placeholder values)
    const equity = {
      ownerEquity: '$ 0',
      retainedEarnings: totalAssets,
      totalEquity: totalAssets
    };

    return {
      assets: {
        currentAssets,
        nonCurrentAssets,
        totalAssets
      },
      liabilities: {
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities
      },
      equity
    };
  };

  const handleExportPDF = async (filteredData: FilteredBalanceSheetData) => {
    if (!contentRef.current || !logoRef.current) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;

      // Helper function to format amounts consistently
      const formatAmount = (amount: number) => {
        const absAmount = Math.abs(amount);
        const formatted = absAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return amount < 0 ? `(${formatted})` : formatted;
      };

      // Helper function to add header with consistent styling
      const addHeader = async (pageNum: number) => {
        pdf.setPage(pageNum);

        // Add logo on the right
        try {
          const logoCanvas = document.createElement('canvas');
          const logoCtx = logoCanvas.getContext('2d');
          if (logoCtx && logoRef.current) {
            logoCanvas.width = logoRef.current.naturalWidth;
            logoCanvas.height = logoRef.current.naturalHeight;
            logoCtx.drawImage(logoRef.current, 0, 0);
            const logoData = logoCanvas.toDataURL('image/png');
            const logoWidth = 40;
            const aspectRatio = logoRef.current.naturalWidth / logoRef.current.naturalHeight;
            const logoHeight = logoWidth / aspectRatio;
            const logoX = pageWidth - margin - logoWidth;
            pdf.addImage(logoData, 'PNG', logoX, margin - 5, logoWidth, logoHeight);
          }
        } catch (error) {
          console.error('Error adding logo:', error);
        }

        // Add title and date with consistent styling
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Muhasaba', margin, margin + 5);
        
        pdf.setFontSize(14);
        pdf.text('BALANCE SHEET', margin, margin + 12);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const periodStart = filteredData.period.startDate;
        const periodEnd = filteredData.period.endDate;
        pdf.text(
          `For the Period ${periodStart.toLocaleString('default', { month: 'long', year: 'numeric' })} to ${periodEnd.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          margin,
          margin + 18
        );
        
        // Add column headers with consistent styling
        const startY = margin + 30;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        
        pdf.text('Description', margin, startY);
        pdf.text('Amount', pageWidth - margin, startY, { align: 'right' });
        
        // Consistent header underline
        pdf.setLineWidth(0.2);
        pdf.line(margin, startY + 1, pageWidth - margin, startY + 1);
        
        return startY + 8;
      };

      // Helper function to add section with consistent styling
      const addSection = (title: string, items: any[], startY: number) => {
        let currentY = startY;
        
        // Section title with consistent styling
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(title, margin, currentY);
        currentY += 6;
        
        // Items with consistent styling
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        items.forEach(item => {
          const xPos = margin + (item.indent ? 5 : 0);
          
          if (item.isTotal || item.isSubTotal) {
            pdf.setFont('helvetica', 'bold');
          }
          
          // Consistent text alignment
          pdf.text(item.description, xPos, currentY);
          
          const amountText = formatAmount(item.amount);
          pdf.text(amountText, pageWidth - margin, currentY, { align: 'right' });
          
          // Consistent line styling for totals and subtotals
          if (item.isTotal) {
            pdf.setLineWidth(0.2);
            pdf.line(pageWidth - margin - 70, currentY + 1, pageWidth - margin, currentY + 1);
            pdf.line(pageWidth - margin - 70, currentY + 2, pageWidth - margin, currentY + 2);
          } else if (item.isSubTotal) {
            pdf.setLineWidth(0.2);
            pdf.line(pageWidth - margin - 70, currentY + 1, pageWidth - margin, currentY + 1);
          }
          
          pdf.setFont('helvetica', 'normal');
          currentY += 6;
        });
        
        return currentY + 4;
      };

      const startY = await addHeader(1);

      // Process assets data using filtered data
      const currentAssetsItems = [
        { description: 'Current Assets', amount: 0 },
        { description: 'Cash', amount: filteredData.assets.currentAssets.cash, indent: true },
        { description: 'Bank', amount: filteredData.assets.currentAssets.bank, indent: true },
        { description: 'Savings', amount: filteredData.assets.currentAssets.savings, indent: true },
        { 
          description: 'Total Current Assets', 
          amount: filteredData.assets.currentAssets.totalCurrent,
          isSubTotal: true 
        }
      ];

      const nonCurrentAssetsItems = [
        { description: 'Non-Current Assets', amount: 0 },
        { description: 'Fixed Assets', amount: filteredData.assets.nonCurrentAssets.fixedAssets, indent: true },
        { description: 'Investments', amount: filteredData.assets.nonCurrentAssets.investments, indent: true },
        { 
          description: 'Total Non-Current Assets', 
          amount: filteredData.assets.nonCurrentAssets.totalNonCurrent,
          isSubTotal: true 
        }
      ];

      const totalAssetsItems = [
        { 
          description: 'TOTAL ASSETS', 
          amount: filteredData.assets.totalAssets,
          isTotal: true 
        }
      ];

      let currentY = startY;
      currentY = addSection('ASSETS', currentAssetsItems, currentY);
      currentY = addSection('', nonCurrentAssetsItems, currentY);
      currentY = addSection('', totalAssetsItems, currentY);
      
      // Process liabilities data using filtered data
      const currentLiabilitiesItems = [
        { description: 'Current Liabilities', amount: 0 },
        { description: 'Accounts Payable', amount: filteredData.liabilities.currentLiabilities.accountsPayable, indent: true },
        { description: 'Short-term Loans', amount: filteredData.liabilities.currentLiabilities.shortTermLoans, indent: true },
        { 
          description: 'Total Current Liabilities', 
          amount: filteredData.liabilities.currentLiabilities.totalCurrent,
          isSubTotal: true 
        }
      ];

      const nonCurrentLiabilitiesItems = [
        { description: 'Non-Current Liabilities', amount: 0 },
        { description: 'Long-term Loans', amount: filteredData.liabilities.nonCurrentLiabilities.longTermLoans, indent: true },
        { 
          description: 'Total Non-Current Liabilities', 
          amount: filteredData.liabilities.nonCurrentLiabilities.totalNonCurrent,
          isSubTotal: true 
        }
      ];

      const totalLiabilitiesItems = [
        { 
          description: 'TOTAL LIABILITIES', 
          amount: filteredData.liabilities.totalLiabilities,
          isTotal: true 
        }
      ];

      currentY = addSection('LIABILITIES', currentLiabilitiesItems, currentY);
      currentY = addSection('', nonCurrentLiabilitiesItems, currentY);
      currentY = addSection('', totalLiabilitiesItems, currentY);
      
      // Process equity data using filtered data
      const equityItems = [
        { description: "Owner's Equity", amount: filteredData.equity.ownerEquity, indent: true },
        { description: 'Retained Earnings', amount: filteredData.equity.retainedEarnings, indent: true },
        { 
          description: 'TOTAL EQUITY', 
          amount: filteredData.equity.totalEquity,
          isTotal: true 
        }
      ];

      currentY = addSection('EQUITY', equityItems, currentY);

      // Add footer note
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      const footerNote = 'The accompanying notes are an integral part of these financial statements.';
      pdf.text(footerNote, margin, Math.min(currentY + 20, pageHeight - margin));

      // Save the PDF
      pdf.save('balance-sheet.pdf');

      toast({
        title: "Export successful",
        description: "Your balance sheet has been downloaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Export failed",
        description: "There was an error generating the PDF",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExportClick = () => {
    setIsPreviewOpen(true);
  };

  if (error) {
    return (
      <Box p={8}>
        <Text color="red.500">Error loading balance sheet data: {error}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader />
      <Box p={4}>
        {/* Hidden logo for PDF generation */}
        <Image
          ref={logoRef}
          src="/img/onboarding/muhasaba-logo.png"
          alt="Muhasaba"
          style={{ display: 'none' }}
          crossOrigin="anonymous"
          width="30px"
          height="15px"
        />
        
        <Box 
          height="calc(100vh - 65px)"
          position="relative"
          display="flex"
          flexDirection="column"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {/* Reports Section */}
          <Box mb={6}>
            <Box mb={4}>
              <HStack 
                justify="space-between" 
                align="center"
                sx={{
                  '@media screen and (min-width: 321px) and (max-width: 740px)': {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }
                }}
              >
                <Box>
                  <Heading size="lg" mb={2}>Balance Sheet</Heading>
                  <Text color="gray.600" mb={4} fontSize="md">
                    View your complete financial position with assets, liabilities, and equity in one comprehensive report.
                  </Text>
                </Box>
                <Button
                  leftIcon={<LuDownload />}
                  colorScheme="green"
                  onClick={handleExportClick}
                  isLoading={isLoading}
                >
                  Export as PDF
                </Button>
              </HStack>
            </Box>

            <Box display="flex" justifyContent="flex-end" mb={4}>
              <Select 
                maxW="200px"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                bg="green.50"
                color="green.500"
                borderColor="green.200"
                _hover={{
                  borderColor: "green.300"
                }}
              >
                <option value="all">All Banks</option>
                {bankAccounts.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </Select>
            </Box>
          </Box>

          <Box ref={contentRef}>
            {isLoading ? (
              <Box display="flex" justifyContent="center" p={8}>
                <Spinner size="xl" />
              </Box>
            ) : (
              <>
                {/* Balance Cards */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
                  {balanceData.map((item, index) => (
                    <Card 
                      key={index} 
                      p={6} 
                      borderRadius="lg" 
                      boxShadow="sm"
                      borderTop="4px solid"
                      borderTopColor="green.400"
                    >
                      <CardBody p={0}>
                        <Text fontSize="2xl" fontWeight="semibold" mb={2}>
                          {item.amount}
                        </Text>
                        <Text color="gray.600">{item.title}</Text>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>

                {/* Transactions Section */}
                <Box mb={6}>
                  <Heading size="md" mb={4}>Recent Transactions</Heading>
                  <Text color="gray.600" mb={6} fontSize="md">
                    Effortlessly view and manage your accounts in one place with real-time balance updates.
                  </Text>

                  <SimpleGrid columns={1} spacing={4}>
                    {filteredTransactions.map((transaction) => (
                      <Card 
                        key={transaction.transaction_id}
                        borderLeftWidth="4px"
                        borderLeftColor={transaction.credit_debit_indicator === 'CREDIT' ? 'green.400' : 'red.400'}
                        boxShadow="sm"
                      >
                        <CardBody py={4} px={6}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Text fontSize="md" fontWeight="medium">
                                {transaction.bank_name}
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                {new Date(transaction.booking_date_time).toLocaleString()}
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                Transaction ID: {transaction.transaction_id}
                              </Text>
                            </Box>
                            <Text 
                              fontSize="lg" 
                              fontWeight="medium"
                              color={transaction.credit_debit_indicator === 'CREDIT' ? "green.500" : "red.500"}
                            >
                              {transaction.credit_debit_indicator === 'CREDIT' ? '+$' : '-$'}
                              {Math.abs(transaction.amount.amount).toLocaleString()}
                            </Text>
                          </Box>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>

      <EditablePdfPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onExport={handleExportPDF}
        data={processDataForPreview()}
      />

      {/* Summary Footer */}
      <Box 
        bg="teal.700" 
        color="white" 
        p={4}
        data-summary-footer
        position="sticky"
        bottom={0}
        zIndex={1}
      >
        <HStack justify="space-between">
          <Text>Summary: Assets-Liabilities</Text>
          <Text>Net Worth: {filteredTransactions.reduce((total, transaction) => {
            const amount = transaction.amount.amount;
            return total + (transaction.credit_debit_indicator === 'CREDIT' ? amount : -amount);
          }, 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
        </HStack>
      </Box>
    </Box>
  );
}
