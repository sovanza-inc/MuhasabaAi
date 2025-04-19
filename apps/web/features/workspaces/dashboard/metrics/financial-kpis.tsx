import React, { useEffect } from 'react';
import {
  SimpleGrid,
  Box,
  Text,
  Select,
} from '@chakra-ui/react';
import { AreaChart, BarChart, LineChart } from '@saas-ui/charts';
import { MetricsCard } from './metrics-card';

interface Transaction {
  amount: {
    amount: number;
    currency: string;
  };
  credit_debit_indicator: string;
  booking_date_time: string;
  transaction_information: string;
}

interface FinancialKPIsProps {
  transactions: Transaction[];
  timeframe?: 'monthly' | 'quarterly';
}

// Helper to ensure we have data for the last 6 months/quarters
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
    for (let i = 5; i >= 0; i--) {
      let quarter = currentQuarter - i;
      let year = today.getFullYear();
      while (quarter < 0) {
        quarter += 4;
        year -= 1;
      }
      points.push(`${year}-Q${quarter + 1}`);
    }
  }
  return points;
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

    const amount = transaction.amount.amount;
    if (transaction.credit_debit_indicator === 'CRDT') {
      acc[periodKey].income += amount;
    } else {
      acc[periodKey].expenses += amount;
    }

    return acc;
  }, Object.fromEntries(timePoints.map(point => [point, { income: 0, expenses: 0 }])));

  return timePoints.map(period => ({
    date: period,
    value: periodData[period].income === 0 ? 0 : ((periodData[period].income - periodData[period].expenses) / periodData[period].income) * 100
  }));
};

const calculateOperatingCashFlow = (transactions: Transaction[], period: string) => {
  const timePoints = generateTimePoints(period);
  const periodData = transactions.reduce((acc: Record<string, number>, transaction) => {
    const date = new Date(transaction.booking_date_time);
    const periodKey = period === 'monthly' 
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    
    if (!acc[periodKey]) {
      acc[periodKey] = 0;
    }

    const amount = transaction.amount.amount;
    acc[periodKey] += transaction.credit_debit_indicator === 'CRDT' ? amount : -amount;

    return acc;
  }, Object.fromEntries(timePoints.map(point => [point, 0])));

  return timePoints.map(date => ({
    date,
    value: periodData[date]
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

    if (transaction.credit_debit_indicator === 'CRDT') {
      acc[periodKey] += transaction.amount.amount;
    }

    return acc;
  }, Object.fromEntries(timePoints.map(point => [point, 0])));

  return timePoints.map((period, index) => {
    if (index === 0) return { date: period, value: 0 };
    const previousRevenue = periodRevenue[timePoints[index - 1]];
    const currentRevenue = periodRevenue[period];
    const growth = previousRevenue === 0 ? 0 : ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    return { date: period, value: growth };
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

    if (transaction.credit_debit_indicator === 'DBIT') {
      acc[periodKey] += transaction.amount.amount;
    }

    return acc;
  }, Object.fromEntries(timePoints.map(point => [point, 0])));

  return timePoints.map(date => ({
    date,
    value: periodData[date]
  }));
};

const calculateExpenseBreakdown = (transactions: Transaction[]) => {
  console.log('Raw transactions:', transactions); // Debug log

  // Group expenses by category with more detailed logging
  const expensesByCategory = transactions.reduce((acc: Record<string, number>, transaction) => {
    console.log('Processing transaction:', transaction); // Debug log
    
    if (transaction.credit_debit_indicator === 'DBIT') {
      // Use full transaction information as category if available
      const category = transaction.transaction_information || 'Other';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Math.abs(transaction.amount.amount);
    }
    return acc;
  }, {});

  console.log('Expenses by category:', expensesByCategory); // Debug log

  // Calculate total expenses
  const totalExpenses = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
  console.log('Total expenses:', totalExpenses); // Debug log

  // Create chart data
  const chartData = Object.entries(expensesByCategory)
    .filter(([category, amount]) => amount > 0)
    .map(([category, amount]) => ({
      category: category.slice(0, 20), // Limit category name length
      value: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Limit to top 10 expenses

  console.log('Final chart data:', chartData); // Debug log
  return chartData;
};

export const FinancialKPIs: React.FC<FinancialKPIsProps> = ({ transactions, timeframe = 'monthly' }) => {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState(timeframe);

  const netProfitMargin = calculateNetProfitMargin(transactions, selectedTimeframe);
  const operatingCashFlow = calculateOperatingCashFlow(transactions, selectedTimeframe);
  const revenueGrowth = calculateRevenueGrowth(transactions, selectedTimeframe);
  const burnRate = calculateBurnRate(transactions, selectedTimeframe);
  const expenseBreakdown = calculateExpenseBreakdown(transactions);

  // Debug logging
  useEffect(() => {
    console.log('Net Profit Margin Data:', netProfitMargin);
    console.log('Operating Cash Flow Data:', operatingCashFlow);
    console.log('Revenue Growth Data:', revenueGrowth);
    console.log('Burn Rate Data:', burnRate);
    console.log('Expense Breakdown Data:', expenseBreakdown);
  }, [netProfitMargin, operatingCashFlow, revenueGrowth, burnRate, expenseBreakdown]);

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>
        Financial KPIs
      </Text>
      <Text fontSize="md" color="gray.600" mb={6}>
        Key financial metrics and performance indicators for your business.
      </Text>
      
      <Box mb={4}>
        <Select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value as 'monthly' | 'quarterly')}
          width="200px"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </Select>
      </Box>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        <MetricsCard title="Net Profit Margin">
          <LineChart
            data={netProfitMargin}
            categories={['value']}
            index="date"
            height={200}
            valueFormatter={(value) => `${value.toFixed(1)}%`}
            showLegend={false}
            showGrid={true}
          />
        </MetricsCard>

        <MetricsCard title="Operating Cash Flow">
          <LineChart
            data={operatingCashFlow}
            categories={['value']}
            index="date"
            height={200}
            valueFormatter={(value) => `$${value.toFixed(2)}`}
            showLegend={false}
            showGrid={true}
          />
        </MetricsCard>

        <MetricsCard title="Revenue Growth Rate">
          <LineChart
            data={revenueGrowth}
            categories={['value']}
            index="date"
            height={200}
            valueFormatter={(value) => `${value.toFixed(1)}%`}
            showLegend={false}
            showGrid={true}
          />
        </MetricsCard>

        <MetricsCard title="Monthly Burn Rate">
          <AreaChart
            data={burnRate}
            categories={['value']}
            index="date"
            height={200}
            valueFormatter={(value) => `$${value.toFixed(2)}`}
            showLegend={false}
            showGrid={true}
          />
        </MetricsCard>

        <MetricsCard title="Expense Breakdown">
          {expenseBreakdown.length > 0 ? (
            <BarChart
              data={expenseBreakdown}
              categories={['value']}
              index="category"
              height={200}
              valueFormatter={(value) => `${value.toFixed(1)}%`}
              showLegend={false}
              showGrid={true}
            />
          ) : (
            <Text color="gray.500" textAlign="center" py={10}>
              No expense data available
            </Text>
          )}
        </MetricsCard>
      </SimpleGrid>
    </Box>
  );
}; 