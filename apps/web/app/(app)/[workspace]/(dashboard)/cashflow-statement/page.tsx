'use client'

import {
  Box,
  Heading,
  Text,
  HStack,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Icon,
  Badge,
  ButtonGroup,
  Button,
  Spinner,
  useToast,
  Image
} from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { PageHeader } from '#features/common/components/page-header'
import { AreaChart } from '@saas-ui/charts'
import React from 'react'
import { LuChevronsUpDown, LuDownload } from 'react-icons/lu'
import { useCurrentWorkspace } from '#features/common/hooks/use-current-workspace'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface BankTransaction {
  transaction_id: string;
  account_id: string;
  transaction_information: string;
  transaction_reference: string | null;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
  value_date_time: string;
  bank_name?: string;
  bank_id?: string;
  account_type?: string;
  account_name?: string;
}

interface Bank {
  id: string;
  bank_identifier: string;
  name: string;
}

export default function CashflowStatementPage() {
  const toast = useToast()
  const [workspace] = useCurrentWorkspace()
  const [isLoading, setIsLoading] = React.useState(true)
  const [transactions, setTransactions] = React.useState<BankTransaction[]>([])
  const [authToken, setAuthToken] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [connectedBanks, setConnectedBanks] = React.useState<Bank[]>([])
  const [selectedBankId, setSelectedBankId] = React.useState<string>('all')
  const [selectedMonth, setSelectedMonth] = React.useState('all')
  const [selectedStatus, setSelectedStatus] = React.useState('All')
  const [selectedType, setSelectedType] = React.useState('All')
  const contentRef = React.useRef<HTMLDivElement>(null)
  const logoRef = React.useRef<HTMLImageElement>(null)

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
        toast({
          title: 'Error',
          description: 'Failed to initialize authentication',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    initializeAuth()
  }, [workspace?.id, toast])

  // Fetch connected banks and their accounts
  const fetchConnectedBanks = React.useCallback(async () => {
    if (!customerId || !authToken) return []

    try {
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

      setConnectedBanks(data)
      return data
    } catch (error) {
      console.error('Error fetching connected banks:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch connected banks',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return []
    }
  }, [customerId, authToken, toast])

  // Fetch accounts for each bank
  const fetchAccountsForBank = React.useCallback(async (entityId: string) => {
    try {
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
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      return []
    }
  }, [authToken])

  // Fetch transactions for an account
  const fetchTransactionsForAccount = React.useCallback(async (accountId: string, entityId: string) => {
    try {
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
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }, [authToken])

  // Fetch all transactions
  React.useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!customerId || !authToken) return;

      setIsLoading(true);
      try {
        const banks = await fetchConnectedBanks();
        let allTransactions: BankTransaction[] = [];

        for (const bank of banks) {
          const accounts = await fetchAccountsForBank(bank.id);

          for (const account of accounts) {
            const accountTransactions = await fetchTransactionsForAccount(account.account_id, bank.id);
            const transactionsWithBank = accountTransactions.map((transaction: BankTransaction) => ({
              ...transaction,
              bank_name: bank.bank_identifier || bank.name,
              bank_id: bank.id
            }));

            allTransactions = [...allTransactions, ...transactionsWithBank];
          }
        }

        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) =>
          new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
        );

        setTransactions(allTransactions);
      } catch (error) {
        console.error('Error fetching all transactions:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch transactions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTransactions();
  }, [customerId, authToken, fetchConnectedBanks, fetchAccountsForBank, fetchTransactionsForAccount, toast]);

  // Filter transactions based on selected bank, month, status, and type
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((transaction: BankTransaction) => {
      // Filter by bank
      if (selectedBankId !== 'all' && transaction.bank_id !== selectedBankId) {
        return false;
      }

      // Filter by month
      if (selectedMonth !== 'all') {
        const transactionMonth = new Date(transaction.booking_date_time).toLocaleString('default', { month: 'long' });
        if (transactionMonth !== selectedMonth) {
          return false;
        }
      }

      // Filter by status
      if (selectedStatus !== 'All' && transaction.status !== selectedStatus.toUpperCase()) {
        return false;
      }

      // Filter by type
      if (selectedType !== 'All') {
        const isCredit = transaction.credit_debit_indicator === 'CREDIT' ||
          transaction.credit_debit_indicator === 'C' ||
          transaction.transaction_information?.includes('SALARY') ||
          transaction.transaction_information?.includes('CREDIT') ||
          transaction.transaction_information?.includes('DEPOSIT');

        if (selectedType === 'Income' && !isCredit) {
          return false;
        }
        if (selectedType === 'Expenses' && isCredit) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedBankId, selectedMonth, selectedStatus, selectedType]);

  // Calculate daily cash flow data for the chart
  const chartData = React.useMemo(() => {
    const dailyData: { [key: string]: { income: number; spending: number } } = {}

    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.booking_date_time).toISOString().split('T')[0]
      const amount = transaction.amount.amount

      if (!dailyData[date]) {
        dailyData[date] = { income: 0, spending: 0 }
      }

      const isCredit = transaction.credit_debit_indicator === 'CREDIT' ||
        transaction.credit_debit_indicator === 'C' ||
        transaction.transaction_information?.includes('SALARY') ||
        transaction.transaction_information?.includes('CREDIT') ||
        transaction.transaction_information?.includes('DEPOSIT');

      if (isCredit) {
        dailyData[date].income += amount
      } else {
        dailyData[date].spending += amount
      }
    })

    // Convert to array and sort by date
    return Object.entries(dailyData)
      .map(([day, values]) => ({
        day,
        value: values.income - values.spending // Net value for the day
      }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-30) // Show last 30 days
  }, [filteredTransactions])

  // Get available months from transactions
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>()
    transactions.forEach(transaction => {
      const month = new Date(transaction.booking_date_time).toLocaleString('default', { month: 'long' })
      months.add(month)
    })
    return Array.from(months).sort()
  }, [transactions])

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    try {
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '1400px';
      tempContainer.style.padding = '40px';
      tempContainer.style.backgroundColor = 'white';

      // Add logo image (hidden) to the container for the header generation later
      const logoImg = document.createElement('img');
      logoImg.src = logoRef.current?.src || '';
      logoImg.style.display = 'none';
      tempContainer.appendChild(logoImg);

      document.body.appendChild(tempContainer);

      // 1. Clone the main content and apply PDF styles
      const contentClone = contentRef.current.cloneNode(true) as HTMLElement;

      // --- Start of Styling Logic (MUST BE PRESERVED) ---
      // Adjust table styles for better rendering
      const tables = contentClone.getElementsByTagName('table');
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        table.style.width = '100%';
        table.style.tableLayout = 'fixed';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '28px';
      }

      // Set consistent column widths
      const headerRow = contentClone.querySelector('thead tr') as HTMLTableRowElement;
      if (headerRow) {
        const cells = headerRow.cells;
        if (cells.length >= 6) {
          cells[0].style.width = '20%';  // Ref ID
          cells[1].style.width = '12%';  // Date
          cells[2].style.width = '38%';  // Description
          cells[3].style.width = '10%';  // Type
          cells[4].style.width = '10%';  // Amount
          cells[5].style.width = '10%';  // Status
        }
      }

      // Adjust all table headers
      const headers = contentClone.getElementsByTagName('th');
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i] as HTMLTableCellElement;
        header.style.padding = '20px 16px';
        header.style.fontSize = '20px';
        header.style.fontWeight = '600';
        header.style.backgroundColor = '#f7fafc';
        header.style.borderBottom = '2px solid #e2e8f0';
        header.style.whiteSpace = 'nowrap';
        header.style.color = '#2D3748';
      }

      // Adjust all table cells
      const cells = contentClone.getElementsByTagName('td');
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j] as HTMLTableCellElement;
        cell.style.padding = '20px 16px';
        cell.style.fontSize = '18px';
        cell.style.lineHeight = '1.6';
        cell.style.borderBottom = '1px solid #e2e8f0';
        cell.style.whiteSpace = 'normal';
        cell.style.wordBreak = 'break-word';
        cell.style.verticalAlign = 'middle';
        cell.style.color = '#2D3748';
      }

      // Adjust bank header rows
      const bankHeaders = contentClone.querySelectorAll('td[colspan="6"]');
      bankHeaders.forEach(header => {
        const headerElement = header as HTMLTableCellElement;
        headerElement.style.backgroundColor = '#f7fafc';
        headerElement.style.padding = '20px 16px';
        headerElement.style.fontSize = '20px';
        headerElement.style.fontWeight = '600';
        headerElement.style.color = '#2D3748';
      });

      // Adjust badge styles for better visibility
      const badges = contentClone.getElementsByTagName('span');
      for (let i = 0; i < badges.length; i++) {
        const badge = badges[i] as HTMLSpanElement;
        if (badge.classList.contains('chakra-badge')) {
          badge.style.fontSize = '16px';
          badge.style.padding = '6px 12px';
          badge.style.fontWeight = '500';
          badge.style.borderRadius = '6px';
          badge.style.display = 'inline-block';
          badge.style.minWidth = '90px';
          badge.style.textAlign = 'center';
        }
      }

      // Adjust text elements for better readability
      const texts = contentClone.getElementsByTagName('p');
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i] as HTMLParagraphElement;
        text.style.fontSize = '18px';
        text.style.lineHeight = '1.6';
        text.style.color = '#2D3748';
      }

      // Adjust heading sizes
      const headings = contentClone.getElementsByTagName('h2');
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i] as HTMLHeadingElement;
        heading.style.fontSize = '20px';
        heading.style.marginBottom = '16px';
        heading.style.color = '#1A202C';
        heading.style.fontWeight = '600';
      }

      // Adjust amounts and numbers for better visibility
      const numericCells = contentClone.querySelectorAll('td[isNumeric]');
      numericCells.forEach(cell => {
        const numericCell = cell as HTMLTableCellElement;
        numericCell.style.fontSize = '18px';
        numericCell.style.fontWeight = '600';
        numericCell.style.fontFamily = 'monospace';
      });

      // Ensure consistent font size for transaction IDs
      const refIdCells = contentClone.querySelectorAll('td:first-child');
      refIdCells.forEach(cell => {
        const refCell = cell as HTMLTableCellElement;
        refCell.style.fontSize = '18px';
        refCell.style.fontFamily = 'monospace';
      });
      // --- End of Styling Logic ---

      tempContainer.appendChild(contentClone); // Add styled content clone

      // 3. Generate PDF from the entire container (now only containing the main content)
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        logging: false,
        useCORS: true,
        width: 1400,
        height: tempContainer.offsetHeight,
        windowWidth: 1400,
        windowHeight: tempContainer.offsetHeight,
        backgroundColor: '#ffffff'
      });

      // Clean up the temporary container from DOM
      document.body.removeChild(tempContainer);

      // 4. Proceed with page splitting and PDF creation using the single canvas
      const imgWidth = 190;
      const pageHeight = 297;
      const marginX = 10;
      const marginY = 15;
      const footerMargin = 10;
      const headerHeight = 15;
      const pageNumberHeight = 8;
      const contentStartY = marginY + headerHeight;

      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // --- Helper Functions (MUST REMAIN) ---
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
              const logoWidth = 25;
              const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
              const logoHeight = logoWidth / aspectRatio;
              const logoX = (pdf.internal.pageSize.width - logoWidth) / 2;
              pdf.addImage(logoData, 'PNG', logoX, 5, logoWidth, logoHeight);
            }
          }
        } catch (error) {
          console.error('Error adding logo:', error);
        }
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Cash Flow Statement', pdf.internal.pageSize.width / 2, marginY + 3, { align: 'center' });
        pdf.setFontSize(8);
        pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.width / 2, marginY + 7, { align: 'center' });
      }

      function addFooter(pageNum: number, totalPages: number): void {
        pdf.setPage(pageNum);
        pdf.setFontSize(8);
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

        await addHeader(pageNum); // Call addHeader

        // Calculate available height for content on this page
        const availableHeight = pageHeight - currentY - footerMargin - pageNumberHeight;
        const heightToDraw = Math.min(remainingHeight, availableHeight);

        // Calculate the portion of the image to draw
        const sourceY = ((imgHeight - remainingHeight) / imgHeight) * canvas.height;
        const sourceHeight = (heightToDraw / imgHeight) * canvas.height;

        // Draw the portion
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
        addFooter(i, pageNum); // Call addFooter
      }

      pdf.save('cashflow-statement-report.pdf');

      toast({ title: "Export successful", description: "Your cash flow statement report has been downloaded", status: "success", duration: 3000, isClosable: true });

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ title: "Export failed", description: "There was an error exporting your report", status: "error", duration: 3000, isClosable: true });
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
          {/* Header Section */}
          <Box mb={6}>
            <Box mb={4}>
              <HStack justify="space-between" align="center">
                <Box>
                  <Heading size="lg" mb={2}>Cash Flow Statement</Heading>
                  <Text color="gray.600" mb={4} fontSize="md">
                    Track your cash inflows and outflows with detailed transaction history and analysis.
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
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                bg="green.50"
                color="green.500"
                borderColor="green.200"
                _hover={{ borderColor: "green.300" }}
              >
                <option value="all">All Banks</option>
                {connectedBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_identifier || bank.name}
                  </option>
                ))}
              </Select>
            </Box>
          </Box>

          {/* Main Content */}
          <Box ref={contentRef}>
            {isLoading ? (
              <Box display="flex" justifyContent="center" p={8}>
                <Spinner size="xl" />
              </Box>
            ) : (
              <>
                {/* Cashflow Chart */}
                <Card mb={8}>
                  <CardBody>
                    <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Heading size="md">Cash Flow Summary</Heading>
                        <Text color="gray.600">{filteredTransactions.length} Transactions</Text>
                      </Box>

                      <Select
                        size="sm"
                        maxW="120px"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        borderColor="gray.200"
                      >
                        <option value="all">All Months</option>
                        {availableMonths.map((month) => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </Select>
                    </Box>

                    <Box position="relative" height="300px">
                      <AreaChart
                        data={chartData}
                        categories={['value']}
                        index="day"
                        colors={['#38B2AC']}
                        yAxisWidth={65}
                        valueFormatter={formatCurrency}
                        height="300px"
                        showLegend={false}
                        showGrid={true}
                        showYAxis={true}
                        variant="gradient"
                        strokeWidth="2"
                        minValue={Math.min(...chartData.map(d => d.value)) * 1.1}
                        maxValue={Math.max(...chartData.map(d => d.value)) * 1.1}
                      />

                      {chartData.length > 0 && (
                        <Box
                          position="absolute"
                          top="20%"
                          left="30%"
                          bg="green.500"
                          color="white"
                          px={3}
                          py={1}
                          borderRadius="md"
                          boxShadow="md"
                        >
                          Peak: {formatCurrency(Math.max(...chartData.map(d => d.value)))}
                        </Box>
                      )}
                    </Box>
                  </CardBody>
                </Card>

                {/* Transactions Table */}
                <Box>
                  {/* Filters */}
                  <HStack mb={4} spacing={4}>
                    <ButtonGroup size="sm" isAttached variant="outline">
                      <Button
                        isActive={selectedType === 'All'}
                        onClick={() => setSelectedType('All')}
                      >
                        All
                      </Button>
                      <Button
                        isActive={selectedType === 'Income'}
                        onClick={() => setSelectedType('Income')}
                      >
                        Income
                      </Button>
                      <Button
                        isActive={selectedType === 'Expenses'}
                        onClick={() => setSelectedType('Expenses')}
                      >
                        Expenses
                      </Button>
                    </ButtonGroup>

                    <Box flex="1" />

                    <Select
                      size="sm"
                      maxW="150px"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="All">Status: All</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="PENDING">Pending</option>
                    </Select>
                  </HStack>

                  {/* Table */}
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr borderBottom="1px" borderColor="gray.200">
                          <Th width="180px">
                            <HStack spacing={1}>
                              <Text>Ref ID</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                          <Th width="120px">
                            <HStack spacing={1}>
                              <Text>Date</Text>
                              <Icon as={LuChevronsUpDown} boxSize={3} color="gray.400" />
                            </HStack>
                          </Th>
                          <Th>Description</Th>
                          <Th width="100px">Type</Th>
                          <Th width="100px" isNumeric>Amount</Th>
                          <Th width="100px">Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedBankId === 'all' ? (
                          // Group transactions by bank when showing all banks
                          connectedBanks.map(bank => {
                            // Get transactions for this bank
                            const bankTransactions = filteredTransactions.filter(t => t.bank_id === bank.id);

                            // Skip banks with no transactions
                            if (bankTransactions.length === 0) return null;

                            // For each bank, select a diverse set of transactions
                            const diverseTransactions = [];

                            // Try to get both credit and debit transactions with diverse amounts
                            const credits = bankTransactions.filter(t => t.credit_debit_indicator === 'CREDIT');
                            const debits = bankTransactions.filter(t => t.credit_debit_indicator === 'DEBIT');

                            // Take highest amount credit transaction if available
                            if (credits.length > 0) {
                              const highestCredit = [...credits].sort((a, b) => b.amount.amount - a.amount.amount)[0];
                              diverseTransactions.push(highestCredit);

                              // If we have more credits, also take a lower amount one
                              if (credits.length > 1) {
                                const lowestCredit = [...credits].sort((a, b) => a.amount.amount - b.amount.amount)[0];
                                if (lowestCredit.transaction_id !== highestCredit.transaction_id) {
                                  diverseTransactions.push(lowestCredit);
                                }
                              }
                            }

                            // Take highest amount debit transaction if available
                            if (debits.length > 0) {
                              const highestDebit = [...debits].sort((a, b) => b.amount.amount - a.amount.amount)[0];
                              diverseTransactions.push(highestDebit);

                              // If we have more debits, also take a lower amount one
                              if (debits.length > 1) {
                                const lowestDebit = [...debits].sort((a, b) => a.amount.amount - b.amount.amount)[0];
                                if (lowestDebit.transaction_id !== highestDebit.transaction_id) {
                                  diverseTransactions.push(lowestDebit);
                                }
                              }
                            }

                            // If we didn't get enough transactions, add more from the original list
                            if (diverseTransactions.length < 5) {
                              const existingIds = new Set(diverseTransactions.map(t => t.transaction_id));
                              const remainingTransactions = bankTransactions
                                .filter(t => !existingIds.has(t.transaction_id))
                                .slice(0, 5 - diverseTransactions.length);

                              diverseTransactions.push(...remainingTransactions);
                            }

                            // Sort by date (most recent first)
                            diverseTransactions.sort((a, b) =>
                              new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
                            );

                            // Limit to 5 transactions per bank
                            const selectedTransactions = diverseTransactions.slice(0, 5);

                            return selectedTransactions.length > 0 ? (
                              <React.Fragment key={bank.id}>
                                <Tr>
                                  <Td
                                    colSpan={6}
                                    bg="gray.50"
                                    fontWeight="medium"
                                    py={2}
                                  >
                                    {bank.bank_identifier || bank.name}
                                  </Td>
                                </Tr>
                                {selectedTransactions.map((transaction) => (
                                  <Tr key={transaction.transaction_id}>
                                    <Td>
                                      <Text noOfLines={1} title={transaction.transaction_id}>
                                        {transaction.transaction_id.slice(0, 8)}...
                                      </Text>
                                    </Td>
                                    <Td>{new Date(transaction.booking_date_time).toLocaleDateString()}</Td>
                                    <Td maxW="400px">
                                      <HStack>
                                        <Box
                                          bg={transaction.credit_debit_indicator === 'CREDIT' ? 'green.500' : 'red.500'}
                                          color="white"
                                          w="24px"
                                          h="24px"
                                          flexShrink={0}
                                          borderRadius="full"
                                          display="flex"
                                          alignItems="center"
                                          justifyContent="center"
                                        >
                                          {transaction.bank_name?.[0] || 'B'}
                                        </Box>
                                        <Text noOfLines={1} title={transaction.transaction_information}>
                                          {transaction.transaction_information?.replace(/POS-PURCHASE CARD NO\.\d+\*+ /, '')
                                            .replace(/INWARD T\/T\/REF\/MCR\/PAYMENT OF /, '')
                                            || 'Bank Transaction'}
                                        </Text>
                                      </HStack>
                                    </Td>
                                    <Td>{transaction.credit_debit_indicator === 'CREDIT' ? 'Income' : 'Expense'}</Td>
                                    <Td isNumeric color={transaction.credit_debit_indicator === 'CREDIT' ? 'green.500' : 'red.500'}>
                                      ${((transaction.credit_debit_indicator === 'CREDIT' ? 1 : -1) * transaction.amount.amount).toFixed(2)}
                                    </Td>
                                    <Td>
                                      <Badge
                                        colorScheme={transaction.status === 'BOOKED' ? 'green' : 'yellow'}
                                      >
                                        {transaction.status}
                                      </Badge>
                                    </Td>
                                  </Tr>
                                ))}
                              </React.Fragment>
                            ) : null;
                          })
                        ) : (
                          // For single bank view, also use diverse transaction selection
                          (() => {
                            const bankTransactions = filteredTransactions;

                            // Try to get both credit and debit transactions with diverse amounts
                            const credits = bankTransactions.filter(t => t.credit_debit_indicator === 'CREDIT');
                            const debits = bankTransactions.filter(t => t.credit_debit_indicator === 'DEBIT');

                            const diverseTransactions = [];

                            // Take highest and lowest amount credit transactions if available
                            if (credits.length > 0) {
                              // Sort by amount descending and take highest
                              const highestCredit = [...credits].sort((a, b) => b.amount.amount - a.amount.amount)[0];
                              diverseTransactions.push(highestCredit);

                              // If we have more than one, take lowest amount too
                              if (credits.length > 1) {
                                const lowestCredit = [...credits].sort((a, b) => a.amount.amount - b.amount.amount)[0];
                                if (lowestCredit.transaction_id !== highestCredit.transaction_id) {
                                  diverseTransactions.push(lowestCredit);
                                }
                              }
                            }

                            // Take highest and lowest amount debit transactions if available
                            if (debits.length > 0) {
                              // Sort by amount descending and take highest
                              const highestDebit = [...debits].sort((a, b) => b.amount.amount - a.amount.amount)[0];
                              diverseTransactions.push(highestDebit);

                              // If we have more than one, take lowest amount too
                              if (debits.length > 1) {
                                const lowestDebit = [...debits].sort((a, b) => a.amount.amount - b.amount.amount)[0];
                                if (lowestDebit.transaction_id !== highestDebit.transaction_id) {
                                  diverseTransactions.push(lowestDebit);
                                }
                              }
                            }

                            // If we didn't get enough transactions, add more from the original list
                            if (diverseTransactions.length < 10) {
                              const existingIds = new Set(diverseTransactions.map(t => t.transaction_id));
                              const remainingTransactions = bankTransactions
                                .filter(t => !existingIds.has(t.transaction_id))
                                .slice(0, 10 - diverseTransactions.length);

                              diverseTransactions.push(...remainingTransactions);
                            }

                            // Sort by date (most recent first)
                            diverseTransactions.sort((a, b) =>
                              new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
                            );

                            // Limit to 10 transactions
                            return diverseTransactions.slice(0, 10).map((transaction) => (
                              <Tr key={transaction.transaction_id}>
                                <Td>
                                  <Text noOfLines={1} title={transaction.transaction_id}>
                                    {transaction.transaction_id.slice(0, 8)}...
                                  </Text>
                                </Td>
                                <Td>{new Date(transaction.booking_date_time).toLocaleDateString()}</Td>
                                <Td maxW="400px">
                                  <HStack>
                                    <Box
                                      bg={transaction.credit_debit_indicator === 'CREDIT' ? 'green.500' : 'red.500'}
                                      color="white"
                                      w="24px"
                                      h="24px"
                                      flexShrink={0}
                                      borderRadius="full"
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                    >
                                      {transaction.bank_name?.[0] || 'B'}
                                    </Box>
                                    <Text noOfLines={1} title={transaction.transaction_information}>
                                      {transaction.transaction_information?.replace(/POS-PURCHASE CARD NO\.\d+\*+ /, '')
                                        .replace(/INWARD T\/T\/REF\/MCR\/PAYMENT OF /, '')
                                        || 'Bank Transaction'}
                                    </Text>
                                  </HStack>
                                </Td>
                                <Td>{transaction.credit_debit_indicator === 'CREDIT' ? 'Income' : 'Expense'}</Td>
                                <Td isNumeric color={transaction.credit_debit_indicator === 'CREDIT' ? 'green.500' : 'red.500'}>
                                  ${((transaction.credit_debit_indicator === 'CREDIT' ? 1 : -1) * transaction.amount.amount).toFixed(2)}
                                </Td>
                                <Td>
                                  <Badge
                                    colorScheme={transaction.status === 'BOOKED' ? 'green' : 'yellow'}
                                  >
                                    {transaction.status}
                                  </Badge>
                                </Td>
                              </Tr>
                            ));
                          })()
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                  {selectedBankId === 'all' ? (
                    <Text mt={4} color="gray.600" textAlign="center">
                      Showing up to 5 recent transactions per bank ({filteredTransactions.length} total transactions)
                    </Text>
                  ) : filteredTransactions.length > 10 && (
                    <Text mt={4} color="gray.600" textAlign="center">
                      Showing 10 of {filteredTransactions.length} transactions
                    </Text>
                  )}
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
          <Text>Summary: Cash Flow</Text>
          <Text>Net Cash Flow: {filteredTransactions.reduce((total, transaction) => {
            const amount = transaction.amount.amount;
            return total + (transaction.credit_debit_indicator === 'CREDIT' ? amount : -amount);
          }, 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' })}</Text>
        </HStack>
      </Box>
    </Box>
  )
}
