import {
  Modal,
  ModalOverlay,
  ModalContent,
  Box,
  HStack,
  IconButton,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { ProfitLossData, FilteredProfitLossData } from '../types';

interface EditablePdfPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (filteredData: FilteredProfitLossData) => void;
  data: ProfitLossData;
}

export const EditablePdfPreview: React.FC<EditablePdfPreviewProps> = ({
  isOpen,
  onClose,
  onExport,
  data
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'3mo' | '6mo' | '12mo'>('6mo');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get the months for display based on selected period
  const getMonthsData = () => {
    const months = [];
    const periodMonths = selectedPeriod === '3mo' ? 3 : selectedPeriod === '6mo' ? 6 : 12;
    
    for (let i = periodMonths - 1; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear().toString().slice(-2),
        date: date
      });
    }
    return months;
  };

  const monthsData = getMonthsData();

  // Process transactions for each month
  const processTransactions = () => {
    const revenuesByMonth: { [key: string]: number } = {};
    const expensesByMonth: { [key: string]: number } = {};
    const otherIncomeByMonth: { [key: string]: number } = {};

    // Initialize months
    monthsData.forEach(month => {
      const key = `${month.month}-${month.year}`;
      revenuesByMonth[key] = 0;
      expensesByMonth[key] = 0;
      otherIncomeByMonth[key] = 0;
    });

    // Get date range for filtering
    const startDate = monthsData[0].date;
    const endDate = monthsData[monthsData.length - 1].date;
    endDate.setMonth(endDate.getMonth() + 1); // Include the full last month

    // Filter and process revenue transactions
    const filteredRevenueTransactions = data?.revenues?.transactions?.filter(transaction => {
      const transDate = new Date(transaction.date);
      return transDate >= startDate && transDate < endDate;
    }) || [];

    filteredRevenueTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const key = `${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear().toString().slice(-2)}`;
      if (Object.prototype.hasOwnProperty.call(revenuesByMonth, key)) {
        const amount = parseFloat(transaction.amount.toString().replace(/[^0-9.-]+/g, ''));
        if (transaction.description?.toLowerCase().includes('other income') ||
            transaction.description?.toLowerCase().includes('misc income') ||
            transaction.description?.toLowerCase().includes('miscellaneous income')) {
          otherIncomeByMonth[key] += amount;
        } else {
          revenuesByMonth[key] += amount;
        }
      }
    });

    // Filter and process expense transactions
    const filteredExpenseTransactions = data?.expenses?.transactions?.filter(transaction => {
      const transDate = new Date(transaction.date);
      return transDate >= startDate && transDate < endDate;
    }) || [];

    filteredExpenseTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const key = `${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear().toString().slice(-2)}`;
      if (Object.prototype.hasOwnProperty.call(expensesByMonth, key)) {
        expensesByMonth[key] += parseFloat(transaction.amount.toString().replace(/[^0-9.-]+/g, ''));
      }
    });

    const totalRevenue = Object.values(revenuesByMonth).reduce((sum, val) => sum + val, 0);
    const totalOtherIncome = Object.values(otherIncomeByMonth).reduce((sum, val) => sum + val, 0);
    const totalExpenses = Object.values(expensesByMonth).reduce((sum, val) => sum + val, 0);

    // Calculate operating expenses components
    const salariesAndWages = totalExpenses * 0.25;
    const rentAndUtilities = totalExpenses * 0.15;
    const marketingAndAdvertising = totalExpenses * 0.1;
    const administrativeExpenses = totalExpenses * 0.1;
    const depreciation = 100000 / 5; // Example: Asset cost 100,000 AED, 5 years life
    const amortization = 50000 / 3; // Example: Intangible cost 50,000 AED, 3 years life
    const financeCosts = (1000000 * 0.05 / 12) + (500000 * 0.06 / 12); // Monthly finance costs

    // Calculate COGS
    const cogs = totalExpenses * 0.4;

    // Calculate profits
    const grossProfit = totalRevenue - cogs;
    const operatingExpenses = salariesAndWages + rentAndUtilities + marketingAndAdvertising + 
                             administrativeExpenses + depreciation + amortization;
    const operatingProfit = grossProfit - operatingExpenses;
    const netProfit = operatingProfit - financeCosts;

    return {
      revenuesByMonth,
      expensesByMonth,
      otherIncomeByMonth,
      filteredData: {
        revenues: {
          projectCost: totalRevenue,
          totalSpending: totalRevenue + totalOtherIncome,
          transactions: filteredRevenueTransactions.map(t => ({
            ...t,
            amount: parseFloat(t.amount.toString().replace(/[^0-9.-]+/g, ''))
          }))
        },
        expenses: {
          projectCost: totalExpenses,
          totalSpending: totalExpenses,
          transactions: filteredExpenseTransactions.map(t => ({
            ...t,
            amount: parseFloat(t.amount.toString().replace(/[^0-9.-]+/g, ''))
          }))
        },
        netProfit,
        period: {
          startDate,
          endDate: new Date(endDate.getTime() - 1) // End of the last day of the period
        },
        calculations: {
          cogs,
          grossProfit,
          operatingExpenses: {
            salariesAndWages,
            rentAndUtilities,
            marketingAndAdvertising,
            administrativeExpenses,
            depreciation,
            amortization,
            total: operatingExpenses
          },
          operatingProfit,
          financeCosts,
          otherIncome: totalOtherIncome
        }
      }
    };
  };

  const { revenuesByMonth, expensesByMonth, otherIncomeByMonth, filteredData } = processTransactions();

  // Calculate deltas
  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Get data for display
  const getDisplayData = () => {
    const monthKeys = monthsData.map(m => `${m.month}-${m.year}`);
    
    const revenueData = [
      {
        name: 'Sales / Service Income',
        amounts: monthKeys.map(key => revenuesByMonth[key] || 0),
        delta: calculateDelta(revenuesByMonth[monthKeys[monthKeys.length - 1]] || 0, revenuesByMonth[monthKeys[monthKeys.length - 2]] || 0)
      },
      {
        name: 'Other Operating Income',
        amounts: monthKeys.map(key => otherIncomeByMonth[key] || 0),
        delta: calculateDelta(otherIncomeByMonth[monthKeys[monthKeys.length - 1]] || 0, otherIncomeByMonth[monthKeys[monthKeys.length - 2]] || 0)
      }
    ];

    const expenseData = [
      {
        name: 'Cost of Goods Sold',
        amounts: monthKeys.map(key => (expensesByMonth[key] || 0) * 0.4),
        delta: calculateDelta(
          (expensesByMonth[monthKeys[monthKeys.length - 1]] || 0) * 0.4,
          (expensesByMonth[monthKeys[monthKeys.length - 2]] || 0) * 0.4
        )
      },
      {
        name: 'Operating Expenses',
        amounts: monthKeys.map(key => {
          const monthExpense = expensesByMonth[key] || 0;
          return (
            monthExpense * 0.25 + // Salaries
            monthExpense * 0.15 + // Rent
            monthExpense * 0.1 +  // Marketing
            monthExpense * 0.1 +  // Admin
            (100000 / 5 / 12) +   // Monthly Depreciation
            (50000 / 3 / 12)      // Monthly Amortization
          );
        }),
        delta: calculateDelta(
          ((expensesByMonth[monthKeys[monthKeys.length - 1]] || 0) * 0.6 + (100000 / 5 / 12) + (50000 / 3 / 12)),
          ((expensesByMonth[monthKeys[monthKeys.length - 2]] || 0) * 0.6 + (100000 / 5 / 12) + (50000 / 3 / 12))
        )
      },
      {
        name: 'Finance Costs',
        amounts: monthKeys.map(() => (1000000 * 0.05 / 12) + (500000 * 0.06 / 12)),
        delta: 0 // Finance costs are fixed monthly
      }
    ];

    // Calculate monthly totals
    const totalRevenue = monthKeys.map(key => 
      (revenuesByMonth[key] || 0) + (otherIncomeByMonth[key] || 0)
    );
    
    const totalExpenses = monthKeys.map(key => {
      const monthExpense = expensesByMonth[key] || 0;
      return (
        monthExpense * 0.4 + // COGS
        monthExpense * 0.25 + // Salaries
        monthExpense * 0.15 + // Rent
        monthExpense * 0.1 +  // Marketing
        monthExpense * 0.1 +  // Admin
        (100000 / 5 / 12) +   // Monthly Depreciation
        (50000 / 3 / 12) +    // Monthly Amortization
        ((1000000 * 0.05 / 12) + (500000 * 0.06 / 12)) // Finance Costs
      );
    });

    const netProfit = monthKeys.map((_, i) => totalRevenue[i] - totalExpenses[i]);

    return {
      revenueData,
      expenseData,
      totalRevenue,
      totalExpenses,
      netProfit
    };
  };

  const displayData = getDisplayData();

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleExport = () => {
    onExport(filteredData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay bg="whiteAlpha.800" backdropFilter="blur(2px)" />
      <ModalContent maxW="1200px" mx="4" rounded="lg" overflow="hidden">
        <Box bg="white" px="6" py="4" borderBottom="1px" borderColor="gray.100">
          <HStack justify="space-between">
            <HStack spacing="4">
              <IconButton
                aria-label="Previous month"
                icon={<LuChevronLeft />}
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                color="gray.600"
              />
              <Text fontSize="md" fontWeight="medium" color="gray.700">
                {monthsData[monthsData.length - 1].month} {monthsData[monthsData.length - 1].year}
              </Text>
              <IconButton
                aria-label="Next month"
                icon={<LuChevronRight />}
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                color="gray.600"
              />
            </HStack>

            <HStack spacing="2">
              <Button
                size="sm"
                variant={selectedPeriod === '3mo' ? 'solid' : 'outline'}
                colorScheme={selectedPeriod === '3mo' ? 'blue' : 'gray'}
                onClick={() => setSelectedPeriod('3mo')}
                fontWeight="medium"
              >
                3mo
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === '6mo' ? 'solid' : 'outline'}
                colorScheme={selectedPeriod === '6mo' ? 'blue' : 'gray'}
                onClick={() => setSelectedPeriod('6mo')}
                fontWeight="medium"
              >
                6mo
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === '12mo' ? 'solid' : 'outline'}
                colorScheme={selectedPeriod === '12mo' ? 'blue' : 'gray'}
                onClick={() => setSelectedPeriod('12mo')}
                fontWeight="medium"
              >
                12mo
              </Button>
              <Button
                size="sm"
                colorScheme="green"
                onClick={handleExport}
                ml="2"
                px="4"
              >
                Export PDF
              </Button>
            </HStack>
          </HStack>
        </Box>

        <Box>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th 
                  py="4" 
                  pl="6" 
                  color="gray.600" 
                  fontSize="xs" 
                  textTransform="uppercase" 
                  fontWeight="medium"
                  borderBottom="1px"
                  borderColor="gray.200"
                >
                  Account
                </Th>
                {monthsData.map((month) => (
                  <Th
                    key={`${month.month}-${month.year}`}
                    isNumeric
                    py="4"
                    color="gray.600"
                    fontSize="xs"
                    textTransform="uppercase"
                    fontWeight="medium"
                    borderBottom="1px"
                    borderColor="gray.200"
                  >
                    {month.month} &apos;{month.year}
                  </Th>
                ))}
                <Th
                  isNumeric
                  py="4"
                  pr="6"
                  color="gray.600"
                  fontSize="xs"
                  textTransform="uppercase"
                  fontWeight="medium"
                  borderBottom="1px"
                  borderColor="gray.200"
                >
                  Δ Avg (%)
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {/* Revenue Section */}
              <Tr>
                <Td py="3" pl="6" fontWeight="semibold" color="gray.700">
                  REVENUE
                </Td>
                {monthsData.map((_, i) => <Td key={i}></Td>)}
                <Td></Td>
              </Tr>
              {displayData.revenueData.map(item => (
                <Tr key={item.name}>
                  <Td py="3" pl="10" color="gray.700">
                    {item.name}
                  </Td>
                  {item.amounts.map((amount, i) => (
                    <Td
                      key={i}
                      isNumeric
                      py="3"
                      color={amount < 0 ? "red.500" : "gray.700"}
                    >
                      {formatAmount(amount)}
                    </Td>
                  ))}
                  <Td
                    isNumeric
                    py="3"
                    pr="6"
                    color={item.delta < 0 ? "red.500" : "green.500"}
                    fontWeight="medium"
                  >
                    {item.delta.toFixed(0)}%
                  </Td>
                </Tr>
              ))}
              <Tr>
                <Td py="3" pl="6" fontWeight="semibold" color="gray.700">
                  TOTAL REVENUE
                </Td>
                {displayData.totalRevenue.map((amount, i) => (
                  <Td
                    key={i}
                    isNumeric
                    py="3"
                    fontWeight="semibold"
                    color={amount < 0 ? "red.500" : "gray.700"}
                  >
                    {formatAmount(amount)}
                  </Td>
                ))}
                <Td
                  isNumeric
                  py="3"
                  pr="6"
                  color="gray.700"
                  fontWeight="semibold"
                >
                  {calculateDelta(
                    displayData.totalRevenue[displayData.totalRevenue.length - 1],
                    displayData.totalRevenue[displayData.totalRevenue.length - 2]
                  ).toFixed(0)}%
                </Td>
              </Tr>

              {/* Expenses Section */}
              <Tr>
                <Td py="3" pl="6" fontWeight="semibold" color="gray.700">
                  EXPENSES
                </Td>
                {monthsData.map((_, i) => <Td key={i}></Td>)}
                <Td></Td>
              </Tr>
              {displayData.expenseData.map(item => (
                <Tr key={item.name}>
                  <Td py="3" pl="10" color="gray.700">
                    {item.name}
                  </Td>
                  {item.amounts.map((amount, i) => (
                    <Td
                      key={i}
                      isNumeric
                      py="3"
                      color={amount < 0 ? "red.500" : "gray.700"}
                    >
                      {formatAmount(amount)}
                    </Td>
                  ))}
                  <Td
                    isNumeric
                    py="3"
                    pr="6"
                    color={item.delta < 0 ? "red.500" : "green.500"}
                    fontWeight="medium"
                  >
                    {item.delta.toFixed(0)}%
                  </Td>
                </Tr>
              ))}
              <Tr>
                <Td py="3" pl="6" fontWeight="semibold" color="gray.700">
                  TOTAL EXPENSES
                </Td>
                {displayData.totalExpenses.map((amount, i) => (
                  <Td
                    key={i}
                    isNumeric
                    py="3"
                    fontWeight="semibold"
                    color={amount < 0 ? "red.500" : "gray.700"}
                  >
                    {formatAmount(amount)}
                  </Td>
                ))}
                <Td
                  isNumeric
                  py="3"
                  pr="6"
                  color="gray.700"
                  fontWeight="semibold"
                >
                  {calculateDelta(
                    displayData.totalExpenses[displayData.totalExpenses.length - 1],
                    displayData.totalExpenses[displayData.totalExpenses.length - 2]
                  ).toFixed(0)}%
                </Td>
              </Tr>

              {/* Net Profit Section */}
              <Tr>
                <Td py="3" pl="6" fontWeight="semibold" color="gray.700">
                  NET PROFIT/(LOSS)
                </Td>
                {displayData.netProfit.map((amount, i) => (
                  <Td
                    key={i}
                    isNumeric
                    py="3"
                    fontWeight="semibold"
                    color={amount < 0 ? "red.500" : "green.500"}
                  >
                    {formatAmount(amount)}
                  </Td>
                ))}
                <Td
                  isNumeric
                  py="3"
                  pr="6"
                  color="gray.700"
                  fontWeight="semibold"
                >
                  {calculateDelta(
                    displayData.netProfit[displayData.netProfit.length - 1],
                    displayData.netProfit[displayData.netProfit.length - 2]
                  ).toFixed(0)}%
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
        <Text>Don&apos;t forget to review before exporting</Text>
      </ModalContent>
    </Modal>
  );
}; 