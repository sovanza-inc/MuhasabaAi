'use client'

import { Box, Heading, Text, SimpleGrid, HStack, Card, CardBody, Select, Spinner, Button, useToast, Image } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import { useApiCache } from '#features/common/hooks/use-api-cache'
import React from 'react'
import { LuDownload } from 'react-icons/lu'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  const [selectedAccount, setSelectedAccount] = React.useState('all')
  const [isLoading, setIsLoading] = React.useState(true)
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [bankAccounts, setBankAccounts] = React.useState<BankWithAccounts[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const contentRef = React.useRef<HTMLDivElement>(null)
  const logoRef = React.useRef<HTMLImageElement>(null)
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
      } catch (error) {
        console.error('Error fetching data:', error)
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

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    try {
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '1024px';
      tempContainer.style.minHeight = '2000px'; // Set minimum height
      tempContainer.style.height = 'auto'; // Allow height to grow

      // Add logo image (hidden) for header generation
      const logoImg = document.createElement('img');
      logoImg.src = logoRef.current?.src || '';
      logoImg.style.display = 'none';
      tempContainer.appendChild(logoImg);

      document.body.appendChild(tempContainer);

      // 1. Clone the main content (contentRef)
      const contentClone = contentRef.current.cloneNode(true) as HTMLElement;
      // Ensure content is fully visible
      contentClone.style.height = 'auto';
      contentClone.style.overflow = 'visible';
      tempContainer.appendChild(contentClone);

      // Wait a moment for content to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. Generate PDF canvas from the temporary container
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        logging: false,
        useCORS: true,
        width: 1024,
        height: Math.max(tempContainer.scrollHeight, tempContainer.offsetHeight, 2000), // Use maximum height
        windowWidth: 1024,
        windowHeight: Math.max(tempContainer.scrollHeight, tempContainer.offsetHeight, 2000)
      });

      // Clean up temporary container
      document.body.removeChild(tempContainer);

      // 3. Proceed with page splitting and PDF creation
      const imgWidth = 190;
      const pageHeight = 297;
      const marginX = 10;
      const marginY = 20;
      const footerMargin = 15;
      const headerHeight = 15;
      const pageNumberHeight = 15;
      const contentStartY = marginY + headerHeight;
      
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // --- Helper Functions (addHeader, addFooter - Keep definitions) ---
      async function addHeader(pageNum: number): Promise<void> {
        pdf.setPage(pageNum);
        try {
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = logoImg.naturalWidth;
            tempCanvas.height = logoImg.naturalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.drawImage(logoImg, 0, 0);
              const logoData = tempCanvas.toDataURL('image/png');
              const logoWidth = 34;
              const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
              const logoHeight = logoWidth / aspectRatio;
              const logoX = (pdf.internal.pageSize.width - logoWidth) / 2;
              pdf.addImage(logoData, 'PNG', logoX, 5, logoWidth, logoHeight);
            }
          }
        } catch (error) {
          console.error('Error adding logo:', error);
        }
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Balance Sheet Report', pdf.internal.pageSize.width / 2, marginY + 5, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.width / 2, marginY + 10, { align: 'center' });
      }

      function addFooter(pageNum: number, totalPages: number): void {
        pdf.setPage(pageNum);
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pdf.internal.pageSize.width / 2, pdf.internal.pageSize.height - (footerMargin / 2), { align: 'center' });
      }
      // --- End Helper Functions ---

      // Split content into pages
      let pageNum = 1;
      let currentY = contentStartY;
      let remainingHeight = imgHeight;

      while (remainingHeight > 0) {
        if (pageNum > 1) {
          pdf.addPage();
          currentY = contentStartY;
        }

        await addHeader(pageNum);

        // Calculate available height (no need to account for separate footer image)
        const availableHeight = pageHeight - currentY - footerMargin - pageNumberHeight + 10;
        const heightToDraw = Math.min(remainingHeight, availableHeight);

        // Calculate source rect from the main canvas (which no longer includes the footer)
        const sourceY = ((imgHeight - remainingHeight) / imgHeight) * canvas.height;
        const sourceHeight = (heightToDraw / imgHeight) * canvas.height;

        // Draw portion of content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(
            canvas, 
            0, sourceY, canvas.width, sourceHeight, 
            0, 0, canvas.width, sourceHeight
          );
          const portionImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(
            portionImgData,
            'PNG',
            marginX,
            currentY,
            imgWidth,
            heightToDraw
          );
        }

        remainingHeight -= heightToDraw;
        if (remainingHeight > 0) {
          pageNum++;
        }
      }

      // Add page numbers to all pages
      for (let i = 1; i <= pageNum; i++) {
        addFooter(i, pageNum);
      }

      pdf.save('balance-sheet-report.pdf');

      toast({
        title: "Export successful",
        description: "Your balance sheet report has been downloaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your report",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <PageHeader />
      <Box p={4}>
        {/* Hidden logo for PDF generation */}
        <Image
          ref={logoRef}
          src="/img/onboarding/muhasaba-logo.png"
          alt="Muhasaba Logo"
          style={{ display: 'none' }}
          crossOrigin="anonymous"
          width="120px"
          height="auto"
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
                  onClick={handleExportPDF}
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
  )
}
