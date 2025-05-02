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

interface BalanceSheetData {
  assets: {
    currentAssets: {
      cash: string;
      bank: string;
      savings: string;
      totalCurrent: string;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    nonCurrentAssets: {
      fixedAssets: string;
      investments: string;
      totalNonCurrent: string;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    totalAssets: string;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: string;
      shortTermLoans: string;
      totalCurrent: string;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    nonCurrentLiabilities: {
      longTermLoans: string;
      totalNonCurrent: string;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: string;
        bankId: string;
        bankName: string;
      }>;
    };
    totalLiabilities: string;
  };
  equity: {
    ownerEquity: string;
    retainedEarnings: string;
    totalEquity: string;
  };
}

export interface FilteredBalanceSheetData {
  assets: {
    currentAssets: {
      cash: number;
      bank: number;
      savings: number;
      totalCurrent: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: number;
      }>;
    };
    nonCurrentAssets: {
      fixedAssets: number;
      investments: number;
      totalNonCurrent: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: number;
      }>;
    };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      shortTermLoans: number;
      totalCurrent: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: number;
      }>;
    };
    nonCurrentLiabilities: {
      longTermLoans: number;
      totalNonCurrent: number;
      transactions: Array<{
        date: string;
        accountName: string;
        description: string;
        amount: number;
      }>;
    };
    totalLiabilities: number;
  };
  equity: {
    ownerEquity: number;
    retainedEarnings: number;
    totalEquity: number;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
}

interface EditablePdfPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (filteredData: FilteredBalanceSheetData) => void;
  data: BalanceSheetData;
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

  // Process data for display
  const processData = () => {
    const parseAmount = (amount: string) => parseFloat(amount.replace(/[^0-9.-]+/g, ''));

    // Get date range for filtering
    const startDate = monthsData[0].date;
    const endDate = monthsData[monthsData.length - 1].date;
    endDate.setMonth(endDate.getMonth() + 1); // Include the full last month

    // Filter transactions by date range
    const filterTransactionsByDate = (transactions: any[]) => {
      return transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate < endDate;
      }).map(t => ({
        ...t,
        amount: parseAmount(t.amount)
      }));
    };

    const filteredData: FilteredBalanceSheetData = {
      assets: {
        currentAssets: {
          cash: parseAmount(data.assets.currentAssets.cash),
          bank: parseAmount(data.assets.currentAssets.bank),
          savings: parseAmount(data.assets.currentAssets.savings),
          totalCurrent: parseAmount(data.assets.currentAssets.totalCurrent),
          transactions: filterTransactionsByDate(data.assets.currentAssets.transactions)
        },
        nonCurrentAssets: {
          fixedAssets: parseAmount(data.assets.nonCurrentAssets.fixedAssets),
          investments: parseAmount(data.assets.nonCurrentAssets.investments),
          totalNonCurrent: parseAmount(data.assets.nonCurrentAssets.totalNonCurrent),
          transactions: filterTransactionsByDate(data.assets.nonCurrentAssets.transactions)
        },
        totalAssets: parseAmount(data.assets.totalAssets)
      },
      liabilities: {
        currentLiabilities: {
          accountsPayable: parseAmount(data.liabilities.currentLiabilities.accountsPayable),
          shortTermLoans: parseAmount(data.liabilities.currentLiabilities.shortTermLoans),
          totalCurrent: parseAmount(data.liabilities.currentLiabilities.totalCurrent),
          transactions: filterTransactionsByDate(data.liabilities.currentLiabilities.transactions)
        },
        nonCurrentLiabilities: {
          longTermLoans: parseAmount(data.liabilities.nonCurrentLiabilities.longTermLoans),
          totalNonCurrent: parseAmount(data.liabilities.nonCurrentLiabilities.totalNonCurrent),
          transactions: filterTransactionsByDate(data.liabilities.nonCurrentLiabilities.transactions)
        },
        totalLiabilities: parseAmount(data.liabilities.totalLiabilities)
      },
      equity: {
        ownerEquity: parseAmount(data.equity.ownerEquity),
        retainedEarnings: parseAmount(data.equity.retainedEarnings),
        totalEquity: parseAmount(data.equity.totalEquity)
      },
      period: {
        startDate,
        endDate: new Date(endDate.getTime() - 1) // End of the last day of the period
      }
    };

    return filteredData;
  };

  // Calculate deltas
  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Get data for display
  const getDisplayData = () => {
    const monthKeys = monthsData.map(m => `${m.month}-${m.year}`);
    const filteredData = processData();
    
    // Group transactions by month
    const groupTransactionsByMonth = (transactions: any[]) => {
      const monthlyTotals: { [key: string]: number } = {};
      monthKeys.forEach(key => monthlyTotals[key] = 0);

      transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const key = `${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear().toString().slice(-2)}`;
        if (monthlyTotals[key] !== undefined) {
          monthlyTotals[key] += transaction.amount;
        }
      });

      return monthlyTotals;
    };

    // Current Assets
    const currentAssetsData = {
      cash: groupTransactionsByMonth(filteredData.assets.currentAssets.transactions),
      bank: groupTransactionsByMonth(filteredData.assets.currentAssets.transactions),
      savings: groupTransactionsByMonth(filteredData.assets.currentAssets.transactions)
    };

    // Non-Current Assets
    const nonCurrentAssetsData = {
      fixedAssets: groupTransactionsByMonth(filteredData.assets.nonCurrentAssets.transactions),
      investments: groupTransactionsByMonth(filteredData.assets.nonCurrentAssets.transactions)
    };

    // Current Liabilities
    const currentLiabilitiesData = {
      accountsPayable: groupTransactionsByMonth(filteredData.liabilities.currentLiabilities.transactions),
      shortTermLoans: groupTransactionsByMonth(filteredData.liabilities.currentLiabilities.transactions)
    };

    // Non-Current Liabilities
    const nonCurrentLiabilitiesData = {
      longTermLoans: groupTransactionsByMonth(filteredData.liabilities.nonCurrentLiabilities.transactions)
    };

    // Equity - Create monthly data with constant values
    const equityData: {
      ownerEquity: { [key: string]: number };
      retainedEarnings: { [key: string]: number };
      totalEquity: { [key: string]: number };
    } = {
      ownerEquity: Object.fromEntries(monthKeys.map(key => [key, 0])),
      retainedEarnings: Object.fromEntries(monthKeys.map(key => [key, 0])),
      totalEquity: Object.fromEntries(monthKeys.map(key => [key, 0]))
    };

    // Fill in values for each month
    monthKeys.forEach(key => {
      const ownerEquity = parseFloat(data.equity.ownerEquity.replace(/[^0-9.-]+/g, '')) || 0;
      const retainedEarnings = parseFloat(data.equity.retainedEarnings.replace(/[^0-9.-]+/g, '')) || 0;
      const totalEquity = parseFloat(data.equity.totalEquity.replace(/[^0-9.-]+/g, '')) || 0;

      equityData.ownerEquity[key] = ownerEquity;
      equityData.retainedEarnings[key] = retainedEarnings;
      equityData.totalEquity[key] = totalEquity;
    });

    return {
      currentAssetsData,
      nonCurrentAssetsData,
      currentLiabilitiesData,
      nonCurrentLiabilitiesData,
      equityData,
      monthKeys
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
    onExport(processData());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay bg="whiteAlpha.800" backdropFilter="blur(2px)" />
      <ModalContent maxW="95vw" mx="4" rounded="lg" overflow="hidden">
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

            <HStack>
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

        <Box p="6" overflowX="auto" maxW="100%">
          <Box minW="fit-content">
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
                {/* Assets Section */}
                <Tr>
                  <Td py="3" pl="6" fontWeight="semibold" color="gray.700">
                    ASSETS
                  </Td>
                  {monthsData.map(() => <Td key={Math.random()}></Td>)}
                  <Td></Td>
                </Tr>

                {/* Current Assets */}
                <Tr>
                  <Td py="3" pl="10" color="gray.700">Current Assets</Td>
                  {monthsData.map(() => <Td key={Math.random()}></Td>)}
                  <Td></Td>
                </Tr>

                {Object.entries(displayData.currentAssetsData).map(([key, monthlyData]) => (
                  <Tr key={key}>
                    <Td py="3" pl="14" color="gray.700">{key.charAt(0).toUpperCase() + key.slice(1)}</Td>
                    {displayData.monthKeys.map(month => (
                      <Td
                        key={month}
                        isNumeric
                        py="3"
                        color={monthlyData[month] < 0 ? "red.500" : "gray.700"}
                      >
                        {formatAmount(monthlyData[month])}
                      </Td>
                    ))}
                    <Td
                      isNumeric
                      py="3"
                      pr="6"
                      color={calculateDelta(
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 1]],
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 2]]
                      ) < 0 ? "red.500" : "green.500"}
                      fontWeight="medium"
                    >
                      {calculateDelta(
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 1]],
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 2]]
                      ).toFixed(0)}%
                    </Td>
                  </Tr>
                ))}

                {/* Non-Current Assets */}
                <Tr>
                  <Td py="3" pl="10" color="gray.700">Non-Current Assets</Td>
                  {monthsData.map(() => <Td key={Math.random()}></Td>)}
                  <Td></Td>
                </Tr>

                {Object.entries(displayData.nonCurrentAssetsData).map(([key, monthlyData]) => (
                  <Tr key={key}>
                    <Td py="3" pl="14" color="gray.700">{key.charAt(0).toUpperCase() + key.slice(1)}</Td>
                    {displayData.monthKeys.map(month => (
                      <Td
                        key={month}
                        isNumeric
                        py="3"
                        color={monthlyData[month] < 0 ? "red.500" : "gray.700"}
                      >
                        {formatAmount(monthlyData[month])}
                      </Td>
                    ))}
                    <Td
                      isNumeric
                      py="3"
                      pr="6"
                      color={calculateDelta(
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 1]],
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 2]]
                      ) < 0 ? "red.500" : "green.500"}
                      fontWeight="medium"
                    >
                      {calculateDelta(
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 1]],
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 2]]
                      ).toFixed(0)}%
                    </Td>
                  </Tr>
                ))}

                {/* Liabilities Section */}
                <Tr>
                  <Td py="3" pl="6" fontWeight="semibold" color="gray.700">
                    LIABILITIES
                  </Td>
                  {monthsData.map(() => <Td key={Math.random()}></Td>)}
                  <Td></Td>
                </Tr>

                {/* Current Liabilities */}
                <Tr>
                  <Td py="3" pl="10" color="gray.700">Current Liabilities</Td>
                  {monthsData.map(() => <Td key={Math.random()}></Td>)}
                  <Td></Td>
                </Tr>

                {Object.entries(displayData.currentLiabilitiesData).map(([key, monthlyData]) => (
                  <Tr key={key}>
                    <Td py="3" pl="14" color="gray.700">{key.split(/(?=[A-Z])/).join(' ')}</Td>
                    {displayData.monthKeys.map(month => (
                      <Td
                        key={month}
                        isNumeric
                        py="3"
                        color={monthlyData[month] < 0 ? "red.500" : "gray.700"}
                      >
                        {formatAmount(monthlyData[month])}
                      </Td>
                    ))}
                    <Td
                      isNumeric
                      py="3"
                      pr="6"
                      color={calculateDelta(
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 1]],
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 2]]
                      ) < 0 ? "red.500" : "green.500"}
                      fontWeight="medium"
                    >
                      {calculateDelta(
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 1]],
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 2]]
                      ).toFixed(0)}%
                    </Td>
                  </Tr>
                ))}

                {/* Non-Current Liabilities */}
                <Tr>
                  <Td py="3" pl="10" color="gray.700">Non-Current Liabilities</Td>
                  {monthsData.map(() => <Td key={Math.random()}></Td>)}
                  <Td></Td>
                </Tr>

                {Object.entries(displayData.nonCurrentLiabilitiesData).map(([key, monthlyData]) => (
                  <Tr key={key}>
                    <Td py="3" pl="14" color="gray.700">{key.split(/(?=[A-Z])/).join(' ')}</Td>
                    {displayData.monthKeys.map(month => (
                      <Td
                        key={month}
                        isNumeric
                        py="3"
                        color={monthlyData[month] < 0 ? "red.500" : "gray.700"}
                      >
                        {formatAmount(monthlyData[month])}
                      </Td>
                    ))}
                    <Td
                      isNumeric
                      py="3"
                      pr="6"
                      color={calculateDelta(
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 1]],
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 2]]
                      ) < 0 ? "red.500" : "green.500"}
                      fontWeight="medium"
                    >
                      {calculateDelta(
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 1]],
                        monthlyData[displayData.monthKeys[displayData.monthKeys.length - 2]]
                      ).toFixed(0)}%
                    </Td>
                  </Tr>
                ))}

                {/* Equity Section */}
                <Tr>
                  <Td py="3" pl="6" fontWeight="semibold" color="gray.700">
                    EQUITY
                  </Td>
                  {monthsData.map(() => <Td key={Math.random()}></Td>)}
                  <Td></Td>
                </Tr>

                <Tr>
                  <Td py="3" pl="14" color="gray.700">Owner&apos;s Equity</Td>
                  {displayData.monthKeys.map(month => (
                    <Td key={month} isNumeric py="3">
                      {formatAmount(displayData.equityData.ownerEquity[month])}
                    </Td>
                  ))}
                  <Td isNumeric py="3" pr="6">0%</Td>
                </Tr>

                <Tr>
                  <Td py="3" pl="14" color="gray.700">Retained Earnings</Td>
                  {displayData.monthKeys.map(month => (
                    <Td key={month} isNumeric py="3">
                      {formatAmount(displayData.equityData.retainedEarnings[month])}
                    </Td>
                  ))}
                  <Td isNumeric py="3" pr="6">0%</Td>
                </Tr>

                <Tr>
                  <Td py="3" pl="6" fontWeight="semibold" color="gray.700">TOTAL EQUITY</Td>
                  {displayData.monthKeys.map(month => (
                    <Td key={month} isNumeric py="3" fontWeight="semibold">
                      {formatAmount(displayData.equityData.totalEquity[month])}
                    </Td>
                  ))}
                  <Td isNumeric py="3" pr="6" fontWeight="semibold">0%</Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        </Box>
        <Text p="4" color="gray.600" fontSize="sm">Don&apos;t forget to review before exporting</Text>
      </ModalContent>
    </Modal>
  );
}; 