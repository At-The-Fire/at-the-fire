import React, { useState, useEffect } from 'react';
import { Grid, Typography, Box, Button, useTheme, Paper, Select, MenuItem, useMediaQuery } from '@mui/material';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { Chart } from 'chart.js';
import 'chartjs-plugin-annotation';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useInventory } from '../../hooks/useInventory.js';
import usePostStore from '../../stores/usePostStore.js';
import { useAuthStore } from '../../stores/useAuthStore.js';

import FlamePipe from '../FlamePipe/FlamePipe.js';
import trackingExampleMobile from '../../assets/inventory-tracking-ex-m.png';
import trackingExampleDesktop from '../../assets/inventory-tracking-ex-dt.png';
import SaveIcon from '@mui/icons-material/Save';
import PieChart from './DataDisplay/PieChart.js';
import BarChart from './DataDisplay/BarChart.js';
import InsightsPanel from './DataDisplay/InsightsPanel.js';
import TableSummary from './DataDisplay/TableSummary.js';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Collapse } from '@mui/material';

Chart.register(annotationPlugin);

const InventoryTracking = ({ handleSaveSnapshot, tableData, setTableData, snapshots }) => {
  //

  // state ====================================================================

  const { inventoryLoading } = useInventory();

  const theme = useTheme(); // This is needed to access the default theme
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // 'sm' refers to small screens
  const isTablet = useMediaQuery(theme.breakpoints.down('md')); // 'md' refers to medium screens

  const { restricted } = usePostStore();
  const { authenticateUser, isAuthenticated } = useAuthStore();

  const [timeScale, setTimeScale] = useState('daily'); // Default to 'daily'
  const [pieChartView, setPieChartView] = useState('category');
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);
  const [advancedGraphsLoading, setAdvancedGraphsLoading] = useState(false);

  let initialDate;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Prepare chart data
  // Get the first date in your actual data (if it exists)
  // Calculate the data points for the graph

  // Get the sorted keys (dates) from tableData to ensure firstDate is properly calculated
  const sortedDates = Object.keys(tableData).sort((a, b) => new Date(a) - new Date(b));
  const firstDate = sortedDates.length > 0 ? sortedDates[0] : null;
  let chartDataPoints = [];

  // If there is a first date, we add an initial 0 value for graphing purposes
  if (firstDate) {
    chartDataPoints.push(0); // Add the initial 0

    // Add the rest of the data points by iterating over sortedDates
    sortedDates.forEach((date) => {
      const totalValue = Object.values(tableData[date]).reduce((total, value) => total + value, 0);
      chartDataPoints.push(totalValue);
    });
  } else {
    // If no first date, just use the sortedDates data points
    sortedDates.forEach((date) => {
      const totalValue = Object.values(tableData[date]).reduce((total, value) => total + value, 0);
      chartDataPoints.push(totalValue);
    });
  }

  if (firstDate) {
    const firstDateObj = new Date(firstDate);

    switch (timeScale) {
      case 'daily':
        initialDate = new Date(firstDateObj.setDate(firstDateObj.getDate() - 1)).toLocaleDateString('en-US');
        break;
      case 'weekly':
        initialDate = new Date(firstDateObj.setDate(firstDateObj.getDate() - 7)).toLocaleDateString('en-US');
        break;
      case 'monthly':
        initialDate = new Date(firstDateObj.setMonth(firstDateObj.getMonth() - 1)).toLocaleDateString('en-US');
        break;
      case 'yearly':
        initialDate = new Date(firstDateObj.setFullYear(firstDateObj.getFullYear() - 1)).toLocaleDateString('en-US');
        break;
      default:
        initialDate = new Date(firstDateObj.setDate(firstDateObj.getDate() - 1)).toLocaleDateString('en-US');
    }
  }

  // Prepare chart data
  const chartLabels = firstDate ? [initialDate, ...sortedDates] : sortedDates;

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Total Gallery Posts Value',
        data: chartDataPoints,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  // functions ====================================================================

  const toggleAdvancedAnalytics = () => {
    setAdvancedGraphsLoading(true);
    setShowAdvancedAnalytics(!showAdvancedAnalytics);

    setTimeout(() => {
      setAdvancedGraphsLoading(false);
    }, 600);
  };

  const handleTypeChange = (event) => {
    setTimeScale(event.target.value);
  };

  const aggregateDataByTimeScale = (snapshots, timeScale) => {
    const aggregatedData = {};

    snapshots?.forEach((snapshot) => {
      const utcDate = new Date(snapshot.created_at);
      const timezoneOffset = utcDate.getTimezoneOffset() * 60000;
      const localDate = new Date(utcDate.getTime() + timezoneOffset);

      let key;
      switch (timeScale) {
        case 'daily': {
          key = localDate.toLocaleDateString('en-US');
          break;
        }
        case 'weekly': {
          const weekStart = new Date(localDate.setDate(localDate.getDate() - localDate.getDay()));
          key = weekStart.toLocaleDateString('en-US');
          break;
        }
        case 'monthly': {
          key = `${monthNames[localDate.getMonth()]} ${localDate.getFullYear()}`;
          break;
        }
        case 'yearly': {
          key = `${localDate.getFullYear()}`;
          break;
        }
        default: {
          key = localDate.toLocaleDateString('en-US');
        }
      }

      // Initialize the date entry if it doesn't exist
      if (!aggregatedData[key]) {
        aggregatedData[key] = {
          values: {}, // Store the aggregated values for each category here
          count: 0, // Track how many entries contribute to this period for averaging
        };
      }

      // Iterate over the `price_count` object and aggregate by category
      const priceCount = snapshot.price_count;
      if (typeof priceCount === 'object') {
        for (const [category, value] of Object.entries(priceCount)) {
          // skip empty or undefined categories to prevent empty table data

          if (!category) continue;

          if (!aggregatedData[key].values[category]) {
            aggregatedData[key].values[category] = 0; // Start with zero for each category
          }
          aggregatedData[key].values[category] += value ? value : 0;
        }
      } else {
        if (!aggregatedData[key].values['default']) {
          aggregatedData[key].values['default'] = 0;
        }
        aggregatedData[key].values['default'] += priceCount ? priceCount : 0;
      }

      aggregatedData[key].count += 1; // Increment the count for averaging
    });

    // Calculate the average for each category
    // Calculate totals for daily or averages for other time scales
    const processedData = {};
    for (const [key, { values, count }] of Object.entries(aggregatedData)) {
      processedData[key] = {};
      for (const [category, totalValue] of Object.entries(values)) {
        if (timeScale === 'daily') {
          // For daily, use the pure sum
          processedData[key][category] = totalValue;
        } else {
          // For weekly/monthly/yearly, calculate average
          processedData[key][category] = Math.max(totalValue / count, 0);
        }
      }
    }

    return processedData; // Corrected: Return the averaged data
  };

  useEffect(() => {
    const aggregatedData = aggregateDataByTimeScale(snapshots, timeScale);

    setTableData(aggregatedData); // Update the table data with aggregated data
  }, [snapshots, timeScale, setTableData]);

  useEffect(() => {
    if (snapshots && snapshots.length > 0) {
      if (timeScale === 'raw') {
        // Use raw snapshots data (original functionality)
        const rawData = {};
        snapshots.forEach((snapshot) => {
          const utcDate = new Date(snapshot.created_at);
          const timezoneOffset = utcDate.getTimezoneOffset() * 60000;
          const localDate = new Date(utcDate.getTime() + timezoneOffset);
          const key = localDate.toLocaleDateString('en-US');

          if (!rawData[key]) {
            rawData[key] = 0;
          }
          rawData[key] += snapshot.price_count;
        });
        setTableData(rawData); // Set raw data for initial rendering
      } else {
        // Use the new aggregation logic
        const averagedData = aggregateDataByTimeScale(snapshots, timeScale);
        setTableData(averagedData);
      }
    }
  }, [snapshots, timeScale, setTableData]);

  // check auth
  useEffect(() => {
    if (!isAuthenticated) {
      authenticateUser();
    }
  }, []);

  // Extract unique categories from all snapshots
  const categories = new Set();

  snapshots &&
    snapshots?.forEach((snapshot) => {
      Object.keys(snapshot.category_count).forEach((category) => categories.add(category));
    });

  // display options for the line chart
  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Inventory Values Over Time',
        color: theme.palette.text.primary,
        font: {
          size: isMobile ? 14 : 18,
          weight: 'medium',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      legend: {
        position: 'top',
        padding: 40,
        labels: {
          font: {
            size: isMobile ? 12 : 20, // Adjust the size for mobile
          },
          padding: isMobile ? 10 : 20, // Adjust padding for mobile
          color: theme.palette.primary.main,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: isMobile ? 12 : 20,
          },
          color: theme.palette.primary.light,
        },
        grid: {
          color: '#CCCCCC', // Lighter color for better visibility
          lineWidth: 1, // Adjust line width as needed
          // Optional: If you want dashed lines
          // borderDash: [5, 5],
        },
      },
      x: {
        ticks: {
          font: {
            size: isMobile ? 12 : 16,
          },
        },
        grid: {
          color: '#CCCCCC', // Lighter color for better visibility
          lineWidth: 1, // Adjust line width as needed
          // Optional: If you want dashed lines
          // borderDash: [5, 5],
          drawOnChartArea: true, // Ensure that grid lines are drawn on the chart area
        },
      },
    },
    elements: {
      line: {
        tension: 0.3, // Smoothness of the line
      },
    },
  };

  const calculateTotalForDate = (date) => {
    return Array.from(categories).reduce((total, category) => {
      return total + (tableData[date]?.[category] || 0);
    }, 0);
  };

  const preparePieChartData = () => {
    // Get the most recent date from tableData
    const sortedDates = Object.keys(tableData).sort((a, b) => new Date(b) - new Date(a));
    const mostRecentDate = sortedDates[0];

    if (!mostRecentDate || !tableData[mostRecentDate]) {
      return {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [],
            borderWidth: 1,
          },
        ],
      };
    }

    // Prepare data for the pie chart using the most recent date
    const categoryData = tableData[mostRecentDate];
    const labels = [];
    const values = [];
    const backgroundColors = [];

    // Generate a color palette
    const colorPalette = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
      'rgba(83, 102, 255, 0.7)',
      'rgba(40, 159, 64, 0.7)',
      'rgba(210, 199, 199, 0.7)',
    ];

    if (pieChartView === 'category') {
      // Add each category to the chart data (same as before)
      Object.entries(categoryData).forEach(([category, value], index) => {
        if (category && value > 0) {
          labels.push(category);
          values.push(value);
          backgroundColors.push(colorPalette[index % colorPalette.length]);
        }
      });
    } else {
      // For price view, we'll group values into price ranges
      // This is just an example - adjust ranges based on your actual data
      const priceRanges = {
        'Under $100': 0,
        '$100-$500': 0,
        '$500-$1000': 0,
        '$1000-$5000': 0,
        'Over $5000': 0,
      };

      // Aggregate values into price ranges
      Object.entries(categoryData).forEach(([category, value]) => {
        if (value > 0) {
          if (value < 100) priceRanges['Under $100'] += value;
          else if (value < 500) priceRanges['$100-$500'] += value;
          else if (value < 1000) priceRanges['$500-$1000'] += value;
          else if (value < 5000) priceRanges['$1000-$5000'] += value;
          else priceRanges['Over $5000'] += value;
        }
      });

      // Convert to chart format
      Object.entries(priceRanges).forEach(([range, value], index) => {
        if (value > 0) {
          labels.push(range);
          values.push(value);
          backgroundColors.push(colorPalette[index % colorPalette.length]);
        }
      });
    }

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map((color) => color.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
    };
  };

  //*  Pie  Chart
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: isMobile ? 14 : 16,
          },
          color: theme.palette.primary.light,
          padding: isMobile ? 12 : 15,
        },
      },
    },
  };

  const handlePieViewToggle = () => {
    setPieChartView((prev) => (prev === 'category' ? 'price' : 'category'));
  };

  const pieChartData = preparePieChartData();

  //*  Bar Chart
  const prepareBarChartData = () => {
    // Get dates sorted chronologically
    const sortedDates = Object.keys(tableData).sort((a, b) => new Date(a) - new Date(b));

    // Return empty structure if no data
    if (sortedDates.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Get all unique categories from the data
    const allCategories = Array.from(categories);

    // Create datasets array (one dataset per category)
    const datasets = allCategories.map((category, index) => {
      // Generate a color for this category (using the same color palette as pie chart)
      const colorPalette = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)',
        'rgba(83, 102, 255, 0.7)',
        'rgba(40, 159, 64, 0.7)',
        'rgba(210, 199, 199, 0.7)',
      ];
      const color = colorPalette[index % colorPalette.length];

      // Create array of values for this category across all dates
      const data = sortedDates.map((date) =>
        tableData[date] && tableData[date][category] ? tableData[date][category] : 0
      );

      return {
        label: category,
        data: data,
        backgroundColor: color,
        borderColor: color.replace('0.7', '1'),
        borderWidth: 1,
      };
    });

    return {
      labels: sortedDates,
      datasets: datasets,
    };
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        ticks: {
          font: {
            size: isMobile ? 10 : 16,
          },
          maxRotation: 90,
          minRotation: 45,
        },
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        ticks: {
          font: {
            size: isMobile ? 10 : 16,
          },
          color: theme.palette.primary.light,
          callback: (value) => {
            return '$' + value.toLocaleString();
          },
        },
        grid: {
          color: '#CCCCCC',
          lineWidth: 1,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Category Breakdown Over Time',
        font: {
          size: isMobile ? 14 : 18,
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },

      labels: {
        font: {
          size: isMobile ? 14 : 16,
        },
        padding: isMobile ? 12 : 15,
      },

      legend: {
        position: 'bottom',
        align: 'start',
        labels: {
          boxWidth: isMobile ? 10 : 15,
          padding: isMobile ? 5 : 10,
          font: {
            size: isMobile ? 14 : 16,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y.toLocaleString();
            }
            return label;
          },
        },
      },
    },
  };

  const barChartData = prepareBarChartData();

  //*  Data Insights
  // Helper function to determine color based on trend
  const getTrendColor = (trend) => {
    if (trend === 'up' || trend === 'new') {
      return 'success.main';
    } else if (trend === 'down') {
      return 'error.main';
    } else {
      return 'text.secondary';
    }
  };

  // Refactored insights calculation focusing on catalog composition
  const calculateCatalogInsights = () => {
    const sortedDates = Object.keys(tableData).sort((a, b) => new Date(a) - new Date(b));

    // Return empty data if no dates
    if (sortedDates.length === 0) {
      return {
        latestTotal: 0,
        catalogGrowth: {
          percentChange: 0,
          trend: 'neutral',
          absoluteChange: 0,
        },
        categoryCount: 0,
        categoriesAdded: 0,
        diversityScore: 0,
        categoryInsights: [],
        latestDate: null,
        earliestDate: null,
        timespan: 0,
      };
    }

    // Get latest date and earliest date for overall growth calculation
    const latestDate = sortedDates[sortedDates.length - 1];
    const earliestDate = sortedDates[0];

    // Calculate time span in days
    const timespan = Math.round((new Date(latestDate) - new Date(earliestDate)) / (1000 * 60 * 60 * 24));

    // For growth trend, compare with previous date if available, otherwise with earliest
    const comparisonDate = sortedDates.length > 1 ? sortedDates[sortedDates.length - 2] : earliestDate;

    // Calculate totals
    const latestTotal = calculateTotalForDate(latestDate);
    const comparisonTotal = calculateTotalForDate(comparisonDate);
    const earliestTotal = calculateTotalForDate(earliestDate);

    // Calculate growth metrics
    const recentAbsoluteChange = latestTotal - comparisonTotal;
    const recentPercentChange = comparisonTotal > 0 ? ((latestTotal - comparisonTotal) / comparisonTotal) * 100 : 0;

    // Overall growth since tracking began
    const overallAbsoluteChange = latestTotal - earliestTotal;
    const overallPercentChange = earliestTotal > 0 ? ((latestTotal - earliestTotal) / earliestTotal) * 100 : 0;

    let trend = 'neutral';
    if (recentPercentChange > 1) trend = 'up';
    else if (recentPercentChange < -1) trend = 'down';

    // Get category information from latest snapshot
    const categoryData = tableData[latestDate] || {};

    // Calculate category insights
    const categoryInsights = [];
    const latestCategories = new Set();
    const earliestCategories = new Set();

    // Get categories from latest snapshot
    Object.keys(categoryData).forEach((cat) => {
      if (cat && categoryData[cat] > 0) {
        latestCategories.add(cat);
      }
    });

    // Get categories from earliest snapshot
    if (tableData[earliestDate]) {
      Object.keys(tableData[earliestDate]).forEach((cat) => {
        if (cat && tableData[earliestDate][cat] > 0) {
          earliestCategories.add(cat);
        }
      });
    }

    // Calculate categories added since beginning
    const categoriesAdded = [...latestCategories].filter((cat) => !earliestCategories.has(cat)).length;

    // Process each category in the latest snapshot
    Object.entries(categoryData).forEach(([category, value]) => {
      if (!category || value <= 0) return;

      const percentOfTotal = latestTotal > 0 ? (value / latestTotal) * 100 : 0;

      // Calculate growth since earliest date
      let growth = 0;
      let growthTrend = 'neutral';

      if (tableData[earliestDate] && tableData[earliestDate][category]) {
        const earliestValue = tableData[earliestDate][category];
        growth = earliestValue > 0 ? ((value - earliestValue) / earliestValue) * 100 : 0;

        if (growth > 5) growthTrend = 'up';
        else if (growth < -5) growthTrend = 'down';
      } else {
        // Category is new since tracking began
        growthTrend = 'new';
        growth = 100;
      }

      categoryInsights.push({
        category,
        value,
        percentOfTotal,
        growth,
        growthTrend,
      });
    });

    // Sort categories by value (descending)
    categoryInsights.sort((a, b) => b.value - a.value);

    // Calculate diversity score
    // Higher score means more evenly distributed categories (max 100)
    let diversityScore = 0;
    if (categoryInsights.length > 0) {
      // Calculate Shannon entropy and normalize to 0-100 scale
      const totalValue = categoryInsights.reduce((sum, cat) => sum + cat.value, 0);
      let entropy = 0;

      categoryInsights.forEach((cat) => {
        const p = cat.value / totalValue;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      });

      // Max entropy is log2(n) where n is number of categories
      const maxEntropy = Math.log2(categoryInsights.length);
      diversityScore = maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;
    }

    return {
      latestTotal,
      catalogGrowth: {
        recent: {
          percentChange: recentPercentChange,
          absoluteChange: recentAbsoluteChange,
          trend,
        },
        overall: {
          percentChange: overallPercentChange,
          absoluteChange: overallAbsoluteChange,
        },
      },
      categoryCount: latestCategories.size,
      categoriesAdded,
      diversityScore,
      categoryInsights,
      latestDate,
      earliestDate,
      comparisonDate,
      timespan,
    };
  };

  // Calculate the catalog insights
  const catalogInsights = calculateCatalogInsights();

  return inventoryLoading ? (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        margin: !isMobile && '150px',
      }}
    >
      <Typography variant="h5" sx={{ color: (theme) => theme.palette.primary.light }}>
        Loading Post Tracking <span className="animated-ellipsis">.</span>
        <span className="animated-ellipsis">.</span>
        <span className="animated-ellipsis ">.</span>
      </Typography>
      <FlamePipe />
    </Box>
  ) : Object.keys(tableData).length === 0 ? (
    <>
      {' '}
      {/* first initial snapshot */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Button
          variant={'contained'}
          onClick={handleSaveSnapshot}
          sx={{ marginBottom: '15px' }}
          disabled={restricted ? restricted : false}
        >
          {restricted ? 'Current Snapshot disabled' : 'Save First Current Snapshot'}
        </Button>
        <Typography sx={{ width: '70%', textAlign: 'left' }}>
          No data saved to display yet. The Inventory Tracking tab will show the total value of your public posts in the
          Dashboard tab over time as you choose to save a snapshot of the value on a particular day. You can then view a
          daily, weekly, monthly, or yearly summary with an updated table of the data. Example display below:
        </Typography>
        {isMobile ? (
          <img src={trackingExampleMobile} alt="site logo" width="50%" height="50%" />
        ) : (
          <img src={trackingExampleDesktop} alt="site logo" width="70%" height="50%" />
        )}
      </Box>{' '}
    </>
  ) : (
    <Box
      sx={{
        border: '1px solid white',
        borderColor: (theme) => theme.palette.primary.dark,
        padding: '15px',
        transform: 'translateY(-2.5%)',
      }}
    >
      {/* perpetual/ new snapshots */}
      <Box
        sx={{
          display: isTablet ? 'flex' : 'grid',
          flexDirection: isTablet ? 'column' : undefined,
          gridTemplateRows: isTablet ? undefined : '1fr',
          gridTemplateColumns: isTablet ? undefined : '1fr 1fr',
        }}
      >
        {isMobile ? (
          <Box sx={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            {' '}
            <Typography sx={{ textAlign: 'left', paddingLeft: '10px', fontSize: '.9rem' }}>
              Select time scale for display
            </Typography>
            <Select sx={{ width: '145px' }} value={timeScale} onChange={handleTypeChange}>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </Box>
        ) : (
          <Box
            sx={{
              padding: '0px',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Button
                variant={'contained'}
                onClick={handleSaveSnapshot}
                sx={{ marginBottom: '15px', maxWidth: '275px', alignSelf: isTablet ? 'center' : '' }}
                disabled={restricted ? restricted : false}
                startIcon={<SaveIcon />}
              >
                {restricted ? 'Current Snapshot disabled' : 'Save Current Snapshot'}
              </Button>
            </Box>
            <Box>
              <Button
                sx={{ '& .MuiButton-root': { margin: '0px' } }}
                onClick={() => setTimeScale('daily')}
                variant={timeScale === 'daily' ? 'contained' : 'outlined'}
              >
                Daily
              </Button>
              <Button
                sx={{ margin: 0 }}
                onClick={() => setTimeScale('weekly')}
                variant={timeScale === 'weekly' ? 'contained' : 'outlined'}
              >
                Weekly
              </Button>
              <Button
                sx={{ margin: 0 }}
                onClick={() => setTimeScale('monthly')}
                variant={timeScale === 'monthly' ? 'contained' : 'outlined'}
              >
                Monthly
              </Button>
              <Button
                sx={{ margin: 0 }}
                onClick={() => setTimeScale('yearly')}
                variant={timeScale === 'yearly' ? 'contained' : 'outlined'}
              >
                Yearly
              </Button>
            </Box>
          </Box>
        )}
        {isMobile && (
          <Button
            variant={'contained'}
            onClick={handleSaveSnapshot}
            sx={{ marginBottom: '15px', maxWidth: '275px', alignSelf: isTablet ? 'center' : '' }}
            disabled={restricted ? restricted : false}
            startIcon={<SaveIcon />}
          >
            {restricted ? 'Current Snapshot disabled' : 'Save Current Snapshot'}
          </Button>
        )}
      </Box>

      {/*   Display Data: Charts/ Insight Panel/ Table */}
      <Grid container spacing={1}>
        {/* Line Chart - Always visible */}
        <Grid item xs={12} lg={6} component={Paper}>
          <Line data={chartData} options={options} height={200}></Line>
        </Grid>

        {/* Pie Chart - Always visible */}
        <PieChart
          isMobile={isMobile}
          isTablet={isTablet}
          pieChartView={pieChartView}
          handlePieViewToggle={handlePieViewToggle}
          pieChartData={pieChartData}
          pieOptions={pieOptions}
          tableData={tableData}
        />

        {/* Advanced Analytics Toggle Button */}
        <Grid item xs={12}>
          <Button
            onClick={toggleAdvancedAnalytics}
            endIcon={showAdvancedAnalytics ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            variant="outlined"
            sx={{ mt: 2, mb: 2 }}
            fullWidth
          >
            {showAdvancedAnalytics ? 'Hide Additional Analytics' : 'Show Additional Analytics'}
          </Button>
        </Grid>

        {/* Collapsible Advanced Analytics Section */}
        <Collapse in={showAdvancedAnalytics} timeout="auto" sx={{ width: '100%' }}>
          {advancedGraphsLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 4,
                minHeight: 200,
                width: '100%',
              }}
            >
              <FlamePipe />
            </Box>
          ) : (
            <Grid container spacing={1}>
              {/* Bar Chart */}
              <BarChart isMobile={isMobile} tableData={tableData} barChartData={barChartData} barOptions={barOptions} />

              {/* Insights Panel */}
              <InsightsPanel
                isMobile={isMobile}
                catalogInsights={catalogInsights}
                tableData={tableData}
                getTrendColor={getTrendColor}
              />
              <TableSummary
                tableData={tableData}
                categories={categories}
                calculateTotalForDate={calculateTotalForDate}
                isMobile={isMobile}
              />
            </Grid>
          )}
        </Collapse>

        {/* Table Summary - Always visible */}
      </Grid>
    </Box>
  );
};
export default InventoryTracking;
