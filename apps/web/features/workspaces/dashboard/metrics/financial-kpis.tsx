import React, { useEffect } from 'react';
import {
  SimpleGrid,
  Box,
  Text,
  Select,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  HStack,
} from '@chakra-ui/react';
import { AreaChart, LineChart } from '@saas-ui/charts';
import { MetricsCard } from './metrics-card';

interface Transaction {
  transaction_id: string;
  account_id: string;
  transaction_information: string;
  transaction_reference?: string | null;
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  status: string;
  booking_date_time: string;
  value_date_time?: string;
  bank_name?: string;
  bank_id?: string;
  account_type?: string;
  account_name?: string;
}

interface FinancialKPIsProps {
  transactions: Transaction[];
  timeframe?: 'monthly' | 'quarterly';
}

// Helper to generate time points for the last 6 months/quarters
const generateTimePoints = (period: string) => {
  const points: string[] = [];
  const today = new Date();
  
  if (period === 'monthly') {
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      points.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
  } else {
    const currentQuarter = Math.floor(today.getMonth() / 3);
    const currentYear = today.getFullYear();
    
    for (let i = 5; i >= 0; i--) {
      let targetQuarter = currentQuarter - i;
      let targetYear = currentYear;
      
      while (targetQuarter < 0) {
        targetQuarter += 4;
        targetYear--;
      }
      
      points.push(`${targetYear}-Q${targetQuarter + 1}`);
    }
  }
  
  return points;
};

// Helper function to format date for display
const formatPeriodLabel = (periodKey: string) => {
  if (periodKey.includes('-Q')) {
    const [year, quarter] = periodKey.split('-Q');
    return `Q${quarter} ${year}`;
  } else {
    const [year, month] = periodKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }
};

const calculateNetProfitMargin = (transactions: Transaction[], period: string) => {
  const timePoints = generateTimePoints(period);
  const periodData = transactions.reduce((acc: Record<string, { income: number; expenses: number }>, transaction) => {
    const date = new Date(transaction.booking_date_time);
    const periodKey = period === 'monthly' 
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    
    if (!acc[periodKey]) {
      acc[periodKey] = { income: 0, expenses: 0 };
    }

    const amount = Math.abs(transaction.amount.amount);
    if (transaction.credit_debit_indicator === 'CREDIT') {
      acc[periodKey].income += amount;
    } else if (transaction.credit_debit_indicator === 'DEBIT') {
      acc[periodKey].expenses += amount;
    }

    return acc;
  }, Object.fromEntries(timePoints.map(point => [point, { income: 0, expenses: 0 }])));

  return timePoints.map(period => {
    const totalIncome = periodData[period].income;
    const totalExpenses = periodData[period].expenses;
    const netProfitMargin = totalIncome === 0 ? 0 : ((totalIncome - totalExpenses) / totalIncome) * 100;
    return {
      date: formatPeriodLabel(period),
      value: netProfitMargin
    };
  });
};

const calculateOperatingCashFlow = (transactions: Transaction[], period: string) => {
  const timePoints = generateTimePoints(period);
  const periodData = transactions.reduce((acc: Record<string, { inflows: number; outflows: number }>, transaction) => {
    const date = new Date(transaction.booking_date_time);
    const periodKey = period === 'monthly' 
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    
    if (!acc[periodKey]) {
      acc[periodKey] = { inflows: 0, outflows: 0 };
    }

    const amount = Math.abs(transaction.amount.amount);
    const isOperating = !isInvestingOrFinancingTransaction(transaction);
    
    if (isOperating) {
      if (transaction.credit_debit_indicator === 'CREDIT') {
        acc[periodKey].inflows += amount;
      } else if (transaction.credit_debit_indicator === 'DEBIT') {
        acc[periodKey].outflows += amount;
      }
    }

    return acc;
  }, Object.fromEntries(timePoints.map(point => [point, { inflows: 0, outflows: 0 }])));

  return timePoints.map(period => ({
    date: formatPeriodLabel(period),
    value: periodData[period].inflows - periodData[period].outflows
  }));
};

const calculateRevenueGrowth = (transactions: Transaction[], period: string) => {
  const timePoints = generateTimePoints(period);
  const periodRevenue = transactions.reduce((acc: Record<string, number>, transaction) => {
    const date = new Date(transaction.booking_date_time);
    const periodKey = period === 'monthly' 
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    
    if (!acc[periodKey]) {
      acc[periodKey] = 0;
    }

    if (transaction.credit_debit_indicator === 'CREDIT') {
      acc[periodKey] += Math.abs(transaction.amount.amount);
    }

    return acc;
  }, Object.fromEntries(timePoints.map(point => [point, 0])));

  return timePoints.map((period, index) => {
    if (index === 0) return { date: formatPeriodLabel(period), value: 0 };
    const previousRevenue = periodRevenue[timePoints[index - 1]] || 0;
    const currentRevenue = periodRevenue[period] || 0;
    const growth = previousRevenue === 0 ? 0 : ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    return { date: formatPeriodLabel(period), value: growth };
  });
};

const calculateBurnRate = (transactions: Transaction[], period: string) => {
  const timePoints = generateTimePoints(period);
  const periodData = transactions.reduce((acc: Record<string, number>, transaction) => {
    const date = new Date(transaction.booking_date_time);
    const periodKey = period === 'monthly' 
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    
    if (!acc[periodKey]) {
      acc[periodKey] = 0;
    }

    if (transaction.credit_debit_indicator === 'DEBIT') {
      acc[periodKey] += Math.abs(transaction.amount.amount);
    }

    return acc;
  }, Object.fromEntries(timePoints.map(point => [point, 0])));

  return timePoints.map(date => ({
    date: formatPeriodLabel(date),
    value: periodData[date]
  }));
};

// Helper function to identify investing or financing transactions
const isInvestingOrFinancingTransaction = (transaction: Transaction) => {
  const info = transaction.transaction_information?.toLowerCase() || '';
  return info.includes('investment') || 
         info.includes('loan') || 
         info.includes('dividend') || 
         info.includes('equipment') || 
         info.includes('capital');
};

// Helper function to format currency without double $
const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

// Helper function to determine if a transaction is income
const isIncomeTransaction = (transaction: Transaction) => {
  // First check the credit_debit_indicator
  if (transaction.credit_debit_indicator === 'CREDIT') {
    return true;
  }

  // Then check transaction information for income-related keywords
  const info = transaction.transaction_information?.toLowerCase() || '';
  const incomeKeywords = ['salary', 'deposit', 'credit', 'inward', 'payment received', 'refund'];
  return incomeKeywords.some(keyword => info.includes(keyword));
};

// Helper function to clean and simplify transaction description
const simplifyTransactionInfo = (info: string) => {
  if (!info) return 'Bank Transaction';
  
  // Remove common prefixes and card numbers
  let simplified = info
    .replace(/POS-PURCHASE CARD NO\.\d+\*+\s*/gi, '')
    .replace(/INWARD T\/T\/REF\/MCR\/PAYMENT OF\s*/gi, '')
    .replace(/DEBIT CARD TXN AT\s*/gi, '')
    .replace(/CARD NO\.\d+\*+\s*/gi, '')
    .replace(/POS-PURCHASE\s*/gi, '')
    .replace(/DEBIT CARD TXN\s*/gi, '')
    .replace(/CONVENIENCE\s*/gi, '')
    .replace(/\.COM\s*/gi, '')
    .replace(/\s+/g, ' ') // Remove extra spaces
    .trim();

  // Capitalize first letter of each word
  simplified = simplified
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Truncate if still too long
  return simplified.length > 30 ? simplified.substring(0, 27) + '...' : simplified;
};

export const FinancialKPIs: React.FC<FinancialKPIsProps> = ({ transactions, timeframe = 'monthly' }) => {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState(timeframe);

  // Debug incoming transactions
  useEffect(() => {
    console.log('Raw Transactions:', transactions);
    if (transactions?.length > 0) {
      console.log('Sample Transaction:', transactions[0]);
      console.log('Transaction Count:', transactions.length);
      
      // Log transaction amounts and types
      const credits = transactions.filter(t => t.credit_debit_indicator === 'CREDIT');
      const debits = transactions.filter(t => t.credit_debit_indicator === 'DEBIT');
      console.log('Credit Transactions:', credits.length);
      console.log('Debit Transactions:', debits.length);
      
      // Log date range
      const dates = transactions.map(t => new Date(t.booking_date_time));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      console.log('Date Range:', { minDate, maxDate });
    } else {
      console.log('No transactions available');
    }
  }, [transactions]);

  // Process the data with validation
  const netProfitMargin = React.useMemo(() => {
    if (!transactions?.length) return generateEmptyDataPoints(selectedTimeframe);
    const result = calculateNetProfitMargin(transactions, selectedTimeframe);
    console.log('Net Profit Margin Calculation:', result);
    return result;
  }, [transactions, selectedTimeframe]);

  const operatingCashFlow = React.useMemo(() => {
    if (!transactions?.length) return generateEmptyDataPoints(selectedTimeframe);
    const result = calculateOperatingCashFlow(transactions, selectedTimeframe);
    console.log('Operating Cash Flow Calculation:', result);
    return result;
  }, [transactions, selectedTimeframe]);

  const revenueGrowth = React.useMemo(() => {
    if (!transactions?.length) return generateEmptyDataPoints(selectedTimeframe);
    const result = calculateRevenueGrowth(transactions, selectedTimeframe);
    console.log('Revenue Growth Calculation:', result);
    return result;
  }, [transactions, selectedTimeframe]);

  const burnRate = React.useMemo(() => {
    if (!transactions?.length) return generateEmptyDataPoints(selectedTimeframe);
    const result = calculateBurnRate(transactions, selectedTimeframe);
    console.log('Burn Rate Calculation:', result);
    return result;
  }, [transactions, selectedTimeframe]);

  // Get current period's values (monthly or quarterly)
  const getCurrentPeriodMetrics = React.useMemo(() => {
    const defaultMetrics = {
      netProfitMargin: 0,
      operatingCashFlow: 0,
      revenueGrowth: 0,
      burnRate: 0
    };

    if (!transactions?.length) {
      console.log('No transactions available');
      return defaultMetrics;
    }

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime()
    );

    // Get the date of the most recent transaction
    const latestDate = new Date(sortedTransactions[0].booking_date_time);
    console.log('Latest Transaction Date:', latestDate);

    // Get all transactions for the current period
    const currentPeriodTransactions = sortedTransactions.filter(transaction => {
      const txDate = new Date(transaction.booking_date_time);
      
      if (selectedTimeframe === 'monthly') {
        // For monthly view, get all transactions from the same month and year
        return txDate.getMonth() === latestDate.getMonth() && 
               txDate.getFullYear() === latestDate.getFullYear();
      } else {
        // For quarterly view, get all transactions from the same quarter
        const txQuarter = Math.floor(txDate.getMonth() / 3);
        const latestQuarter = Math.floor(latestDate.getMonth() / 3);
        return txQuarter === latestQuarter && 
               txDate.getFullYear() === latestDate.getFullYear();
      }
    });

    // Log transaction counts and amounts
    console.log('Transaction Analysis:', {
      totalTransactions: transactions.length,
      currentPeriodTransactions: currentPeriodTransactions.length,
      timeframe: selectedTimeframe,
      latestTransactionDate: latestDate,
      periodTransactions: currentPeriodTransactions.map(t => ({
        date: new Date(t.booking_date_time),
        amount: t.amount.amount,
        isIncome: isIncomeTransaction(t),
        indicator: t.credit_debit_indicator,
        info: t.transaction_information
      }))
    });

    // Calculate metrics for current period
    const periodMetrics = currentPeriodTransactions.reduce((acc, transaction) => {
      const amount = Math.abs(transaction.amount.amount);
      if (isIncomeTransaction(transaction)) {
        acc.income += amount;
      } else {
        acc.expenses += amount;
      }
      return acc;
    }, { income: 0, expenses: 0 });

    // Calculate net profit margin
    const netProfitMargin = periodMetrics.income === 0 ? 0 : 
      ((periodMetrics.income - periodMetrics.expenses) / periodMetrics.income) * 100;

    // Calculate operating cash flow
    const operatingTransactions = currentPeriodTransactions.filter(t => !isInvestingOrFinancingTransaction(t));
    const operatingCashFlow = operatingTransactions.reduce((total, t) => {
      const amount = Math.abs(t.amount.amount);
      return total + (isIncomeTransaction(t) ? amount : -amount);
    }, 0);

    // Get previous period transactions
    const previousPeriodTransactions = sortedTransactions.filter(transaction => {
      const txDate = new Date(transaction.booking_date_time);
      
      if (selectedTimeframe === 'monthly') {
        // Previous month
        const previousMonth = latestDate.getMonth() - 1;
        const previousYear = previousMonth < 0 ? latestDate.getFullYear() - 1 : latestDate.getFullYear();
        const adjustedMonth = previousMonth < 0 ? 11 : previousMonth;
        return txDate.getMonth() === adjustedMonth && txDate.getFullYear() === previousYear;
      } else {
        // Previous quarter
        const currentQuarter = Math.floor(latestDate.getMonth() / 3);
        const previousQuarter = currentQuarter - 1;
        const previousYear = previousQuarter < 0 ? latestDate.getFullYear() - 1 : latestDate.getFullYear();
        const adjustedQuarter = previousQuarter < 0 ? 3 : previousQuarter;
        const quarterStartMonth = adjustedQuarter * 3;
        const quarterEndMonth = quarterStartMonth + 2;
        
        return txDate.getFullYear() === previousYear &&
               txDate.getMonth() >= quarterStartMonth &&
               txDate.getMonth() <= quarterEndMonth;
      }
    });

    // Calculate revenue growth
    const previousPeriodIncome = previousPeriodTransactions
      .filter(isIncomeTransaction)
      .reduce((sum, t) => sum + Math.abs(t.amount.amount), 0);
    
    const revenueGrowth = previousPeriodIncome === 0 ? 0 : 
      ((periodMetrics.income - previousPeriodIncome) / previousPeriodIncome) * 100;

    // Log final calculations
    console.log('Final Calculations:', {
      timeframe: selectedTimeframe,
      currentPeriod: {
        income: periodMetrics.income,
        expenses: periodMetrics.expenses,
        netProfitMargin,
        operatingCashFlow,
        transactionCount: currentPeriodTransactions.length
      },
      previousPeriod: {
        income: previousPeriodIncome,
        transactionCount: previousPeriodTransactions.length,
        revenueGrowth
      }
    });

    return {
      netProfitMargin,
      operatingCashFlow,
      revenueGrowth,
      burnRate: periodMetrics.expenses
    };
  }, [transactions, selectedTimeframe]);

  // Helper function to generate empty data points
  const generateEmptyDataPoints = (period: string) => {
    const timePoints = generateTimePoints(period);
    return timePoints.map(date => ({
      date,
      value: 0
    }));
  };

  // If no transactions, show a message
  if (!transactions || transactions.length === 0) {
    return (
      <Box p={4}>
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Financial KPIs
        </Text>
        <Text color="gray.600">
          No transaction data available. Please connect your bank account or wait for transactions to sync.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>
        Financial KPIs
      </Text>
      <Text fontSize="md" color="gray.600" mb={6}>
        Key financial metrics and performance indicators based on your transaction data.
      </Text>
      
      <Box mb={4}>
        <Select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value as 'monthly' | 'quarterly')}
          width="200px"
          bg="green.50"
          color="green.700"
          _hover={{ borderColor: "green.300" }}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </Select>
      </Box>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {/* Net Profit Margin */}
        <MetricsCard 
          title="Net Profit Margin" 
          subtitle="Profitability after expenses"
        >
          <Box mb={2}>
            <Text fontSize="sm" color="gray.600">Current {selectedTimeframe === 'monthly' ? 'Month' : 'Quarter'}</Text>
            <Text fontSize="2xl" fontWeight="bold" color={getCurrentPeriodMetrics.netProfitMargin >= 0 ? "green.500" : "red.500"}>
              {getCurrentPeriodMetrics.netProfitMargin.toFixed(1)}%
            </Text>
          </Box>
          <LineChart
            data={netProfitMargin}
            categories={['value']}
            index="date"
            height={200}
            valueFormatter={(value: number) => `${value.toFixed(1)}%`}
            showLegend={false}
            showGrid={true}
            colors={["green"]}
          />
        </MetricsCard>

        {/* Operating Cash Flow */}
        <MetricsCard 
          title="Operating Cash Flow" 
          subtitle="Cash generated from daily operations"
        >
          <Box mb={2}>
            <Text fontSize="sm" color="gray.600">Current {selectedTimeframe === 'monthly' ? 'Month' : 'Quarter'}</Text>
            <Text fontSize="2xl" fontWeight="bold" color={getCurrentPeriodMetrics.operatingCashFlow >= 0 ? "green.500" : "red.500"}>
              ${formatCurrency(getCurrentPeriodMetrics.operatingCashFlow)}
            </Text>
          </Box>
          <LineChart
            data={operatingCashFlow}
            categories={['value']}
            index="date"
            height={200}
            valueFormatter={(value: number) => `$${formatCurrency(value)}`}
            showLegend={false}
            showGrid={true}
            colors={["blue"]}
          />
        </MetricsCard>

        {/* Revenue Growth Rate */}
        <MetricsCard 
          title="Revenue Growth Rate" 
          subtitle="Period-over-period increase in revenue"
        >
          <Box mb={2}>
            <Text fontSize="sm" color="gray.600">Current {selectedTimeframe === 'monthly' ? 'Month' : 'Quarter'}</Text>
            <Text fontSize="2xl" fontWeight="bold" color={getCurrentPeriodMetrics.revenueGrowth >= 0 ? "green.500" : "red.500"}>
              {getCurrentPeriodMetrics.revenueGrowth.toFixed(1)}%
            </Text>
          </Box>
          <LineChart
            data={revenueGrowth}
            categories={['value']}
            index="date"
            height={200}
            valueFormatter={(value: number) => `${value.toFixed(1)}%`}
            showLegend={false}
            showGrid={true}
            colors={["purple"]}
          />
        </MetricsCard>

        {/* Monthly Burn Rate */}
        <MetricsCard 
          title={`${selectedTimeframe === 'monthly' ? 'Monthly' : 'Quarterly'} Burn Rate`}
          subtitle={`Total ${selectedTimeframe === 'monthly' ? 'monthly' : 'quarterly'} cash outflows`}
        >
          <Box mb={2}>
            <Text fontSize="sm" color="gray.600">Current {selectedTimeframe === 'monthly' ? 'Month' : 'Quarter'}</Text>
            <Text fontSize="2xl" fontWeight="bold" color="orange.500">
              ${formatCurrency(getCurrentPeriodMetrics.burnRate)}
            </Text>
          </Box>
          <AreaChart
            data={burnRate}
            categories={['value']}
            index="date"
            height={200}
            valueFormatter={(value: number) => `$${formatCurrency(value)}`}
            showLegend={false}
            showGrid={true}
            colors={["orange"]}
          />
        </MetricsCard>

        {/* Recent Transactions */}
        <MetricsCard 
          title="Recent Transactions" 
          subtitle="Latest financial activities"
          gridColumn={{ md: "span 2" }}
        >
          <Box>
            <TableContainer maxHeight="400px" overflowY="auto">
              <Table variant="simple" size="sm">
                <Thead position="sticky" top={0} bg="white" zIndex={1}>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th>Type</Th>
                    <Th isNumeric>Amount</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions
                    .sort((a, b) => new Date(b.booking_date_time).getTime() - new Date(a.booking_date_time).getTime())
                    .slice(0, 10)
                    .map((transaction) => {
                      const isIncome = isIncomeTransaction(transaction);
                      const simplifiedInfo = simplifyTransactionInfo(transaction.transaction_information);

                      return (
                        <Tr key={transaction.transaction_id}>
                          <Td>{new Date(transaction.booking_date_time).toLocaleDateString()}</Td>
                          <Td maxW="300px">
                            <HStack spacing={2}>
                              <Box
                                bg={isIncome ? 'green.500' : 'red.500'}
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
                              <Text 
                                noOfLines={1} 
                                title={transaction.transaction_information}
                                fontSize="sm"
                              >
                                {simplifiedInfo}
                              </Text>
                            </HStack>
                          </Td>
                          <Td>{isIncome ? 'Income' : 'Expense'}</Td>
                          <Td isNumeric color={isIncome ? 'green.500' : 'red.500'}>
                            ${Math.abs(transaction.amount.amount).toFixed(2)}
                          </Td>
                        </Tr>
                      );
                    })}
                </Tbody>
              </Table>
            </TableContainer>
            <Text mt={4} color="gray.600" textAlign="center" fontSize="sm">
              Showing 10 most recent transactions
            </Text>
          </Box>
        </MetricsCard>
      </SimpleGrid>
    </Box>
  );
}; 