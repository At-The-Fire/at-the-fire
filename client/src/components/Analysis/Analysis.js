import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { Chart } from 'chart.js';
import 'chartjs-plugin-annotation';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useQuota } from '../../hooks/useQuota.js';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import QuotaGoals from '../Calendar/QuotaGoals.js';
import { editQuotaGoals } from '../../services/fetch-quota-goals.js';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import analysisMobileImageEx1 from '../../assets/analysis-ex-m-1.png';
import analysisMobileImageEx2 from '../../assets/analysis-ex-m-2.png';
import analysisDesktopImageEx from '../../assets/analysis-ex-dt.png';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../../stores/useAuthStore.js';

Chart.register(annotationPlugin);

// TODO  Add cvs download button for data

const Analysis = ({ products }) => {
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const monthsPerPage = 6; // Number of months to display per page
  const productTypeColors = {
    auction: '#391bfc78',
    'direct-sale': '#478dff78',
    inventory: 'rgb(91, 91, 91)',
    'prep-other': 'rgba(0, 26, 255, 0.25)',
    'total-sale': '#333333',
    'quota-negative': 'rgba(255, 71, 71, 0.43)',
    'quota-positive': 'rgba(102, 237, 127, 0.533)',
  };

  // Calculate the total number of pages
  const totalPages = Math.ceil(monthlySummaries.length / monthsPerPage);

  // Slice the data for the current page
  const paginatedSummaries = monthlySummaries.slice((currentPage - 1) * monthsPerPage, currentPage * monthsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  const [showQuotaLine, setShowQuotaLine] = useState(true);

  const { customerId, authenticateUser, isAuthenticated } = useAuthStore();

  const { monthlyQuota, workdays, refreshQuotaData, quotaLoading } = useQuota(customerId);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [editMode, setEditMode] = useState(false);
  const [monthlyGoalInput, setMonthlyGoalInput] = useState();
  const [workingDaysInput, setWorkingDaysInput] = useState();

  const [chartReadyData, setChartReadyData] = useState([]);

  const [timeRange, setTimeRange] = useState('6months'); // Default is 6 months

  useEffect(() => {
    if (!isAuthenticated) {
      authenticateUser();
    }
  }, []);

  useEffect(() => {
    setMonthlyGoalInput(monthlyQuota);
    setWorkingDaysInput(workdays);
  }, [monthlyQuota, workdays]);

  useEffect(() => {
    if (monthlyQuota === 0 && products.length > 0) {
      handleShowHelp();
    } else {
      toast.dismiss('set-goals');
    }

    return () => {};
  }, [monthlyQuota, products]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        padding: 40,
        labels: {
          font: {
            size: isMobile ? 12 : 20, // Adjust the size for mobile
          },
          padding: isMobile ? 10 : 20, // Adjust padding for mobile
        },
        // Custom onClick function for handling the toggle of the User Quota line
        onClick: (e, legendItem, legend) => {
          const ci = legend.chart;

          if (legendItem.text === 'User Quota') {
            setShowQuotaLine(!showQuotaLine);
            // Manually toggle the 'hidden' property for the User Quota legend item
            legendItem.hidden = !legendItem.hidden;
          } else {
            const index = legendItem.datasetIndex;
            if (ci.isDatasetVisible(index)) {
              ci.hide(index);
              legendItem.hidden = true;
            } else {
              ci.show(index);
              legendItem.hidden = false;
            }
          }

          ci.update();
        },
      },

      annotation: {
        annotations: {
          line1: {
            type: 'line',
            yMin: monthlyQuota,
            yMax: monthlyQuota,
            borderColor: 'green',
            borderWidth: 4,
            borderDash: [10, 5],
            label: {
              content: 'Quota: $5500',
              enabled: true,
              position: 'start',
              textAlign: 'start',
              backgroundColor: 'rgba(0,0,0,0.8)',
              fontColor: '#ccc',
              fontSize: 16,
            },
            display: showQuotaLine,
          },
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
        },
        grid: {
          color: '#CCCCCC', // Lighter color for better visibility
          lineWidth: 1, // Adjust line width as needed
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

  useEffect(() => {
    if (products) {
      const processData = (products) => {
        const monthMap = {};

        const toValidDate = (raw) => {
          const ms = Number(raw);
          if (!Number.isFinite(ms)) return null;
          const d = new Date(ms);
          return Number.isNaN(d.getTime()) ? null : d;
        };

        const toMonthKey = (date) => `${date.getMonth() + 1}/${date.getFullYear()}`;

        const monthStart = (date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          d.setDate(1);
          return d;
        };

        const addMonthsSafe = (date, months) => {
          // Avoid Date rollover issues (e.g., Aug 31 - 6 months => Mar 3)
          const d = monthStart(date);
          d.setMonth(d.getMonth() + months);
          return d;
        };

        const zeroMonth = () => ({
          total: 0,
          counts: 0,
          subtotalAuctions: 0,
          subtotalDirectSales: 0,
          subtotalInventory: 0,
          subtotalPrepOther: 0,
          totalSales: 0,
          totalQty: 0,
        });

        const now = new Date();
        const rangeEnd = monthStart(now);

        // Decide default range start for the selected timeRange
        let rangeStart = monthStart(now);
        if (timeRange === '6months') {
          rangeStart = addMonthsSafe(now, -6);
        } else if (timeRange === '1year') {
          rangeStart = addMonthsSafe(now, -12);
        } else if (timeRange === '2years') {
          rangeStart = addMonthsSafe(now, -24);
        }

        // Fallback: if there's no data in the chosen range, extend the start back to the latest activity
        // so the user still sees their most recent month(s) plus the drop to zero up to the current month.
        const productDates = products
          .map((p) => toValidDate(p.date))
          .filter(Boolean)
          .map((d) => d.getTime());

        const latestProductDate = productDates.length ? new Date(Math.max(...productDates)) : null;

        let filteredProducts = products;
        const filterByRange = (start, end) =>
          products.filter((item) => {
            const productDate = toValidDate(item.date);
            if (!productDate) return false;
            return productDate >= start && productDate <= end;
          });

        filteredProducts = filterByRange(rangeStart, now);

        if (latestProductDate && filteredProducts.length === 0 && latestProductDate < rangeStart) {
          rangeStart = monthStart(latestProductDate);
          filteredProducts = filterByRange(rangeStart, now);
        }

        // Pre-seed months so the chart/table show 0s for empty months.
        for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor = addMonthsSafe(cursor, 1)) {
          const key = toMonthKey(cursor);
          monthMap[key] = zeroMonth();
        }

        filteredProducts.forEach((item) => {
          const date = new Date(parseInt(item.date));
          const monthYear = toMonthKey(date);
          const qty = item.qty ? parseFloat(item.qty) : 1;
          const price = (parseFloat(item.price) || 0) * qty;

          if (!monthMap[monthYear]) monthMap[monthYear] = zeroMonth();

          monthMap[monthYear].total += price;
          monthMap[monthYear].counts += qty;
          monthMap[monthYear].totalQty += qty;

          switch (item.type) {
            case 'auction':
              monthMap[monthYear].subtotalAuctions += price;
              break;
            case 'direct-sale':
              monthMap[monthYear].subtotalDirectSales += price;
              break;
            case 'inventory':
              monthMap[monthYear].subtotalInventory += price;
              break;
            case 'prep-other':
              monthMap[monthYear].subtotalPrepOther += price;
              break;
          }
        });

        const unsortedData = Object.keys(monthMap).map((monthYear) => {
          const data = monthMap[monthYear];
          const safeMonthlyQuota = Number(monthlyQuota) || 0;
          return {
            month: monthYear,
            total: data.total,
            dailyAvg: data.total / (data.totalQty || 1),
            quotaPercent: safeMonthlyQuota > 0 ? (data.total / safeMonthlyQuota) * 100 : 0,
            subtotalAuctions: data.subtotalAuctions,
            subtotalDirectSales: data.subtotalDirectSales,
            subtotalInventory: data.subtotalInventory,
            subtotalPrepOther: data.subtotalPrepOther,
            totalSales: data.subtotalAuctions + data.subtotalDirectSales,
            totalQty: data.totalQty,
          };
        });

        const sortedData = [...unsortedData].sort((a, b) => {
          const [aMonth, aYear] = a.month.split('/').map(Number);
          const [bMonth, bYear] = b.month.split('/').map(Number);
          if (aYear !== bYear) {
            return aYear - bYear; // First sort by year
          } else {
            return aMonth - bMonth; // Then sort by month
          }
        });

        return sortedData;
      };

      const processedData = processData(products);

      setChartReadyData(processedData);
      setMonthlySummaries([...processedData].reverse()); // reverse for UI display
    }
  }, [products, monthlyQuota, timeRange]);

  // Function to prepare data for the chart
  const prepareChartData = (data) => {
    let labels = [];
    let totalSalesData = [];
    let auctionData = [];
    let directSaleData = [];
    let subtotalInventory = [];

    if (data.length > 0) {
      // Get the first date in data and create a date one day before for initial graph date
      // Extract month and year from first data point (format: "MM/YYYY")
      const [firstMonth, firstYear] = data[0].month.split('/').map(Number);

      // Create Date object for first entry
      const firstDate = new Date(firstYear, firstMonth - 1); // Month is 0-based in Date constructor

      // Create Date object for day before first entry
      const dayBefore = new Date(firstDate);
      dayBefore.setDate(dayBefore.getDate() - 1);

      // Format the day before into the same "MM/YYYY" format
      const initialLabel = `${dayBefore.getMonth() + 1}/${dayBefore.getFullYear()}`;

      // Added initial zero point and initial label
      labels = [initialLabel, ...data.map((summary) => summary.month)];

      // Added initial zero points to all data arrays
      totalSalesData = [0, ...data.map((summary) => summary.total)];
      auctionData = [0, ...data.map((summary) => summary.subtotalAuctions)];
      directSaleData = [0, ...data.map((summary) => summary.subtotalDirectSales)];
      subtotalInventory = [0, ...data.map((summary) => summary.subtotalInventory)];
    }

    return {
      labels,
      datasets: [
        {
          label: 'User Quota',
          fill: false,
          borderColor: 'green',
          borderWidth: 5,
          borderDash: [10, 5],
        },
        {
          label: 'Auctions',
          data: auctionData,
          fill: false,
          borderColor: '#391bfc78',
          backgroundColor: '#391bfc78',
        },
        {
          label: 'Direct',
          data: directSaleData,
          fill: false,
          borderColor: '#478dff78',
          backgroundColor: '#478dff78',
        },
        {
          label: 'Website Inventory',
          data: subtotalInventory,
          fill: false,
          borderColor: 'rgb(91, 91, 91)',
          backgroundColor: 'rgb(91, 91, 91)',
        },
        {
          label: 'Total Value',
          data: totalSalesData,
          fill: false,
          borderColor: '#CCCCCC',
          borderWidth: 3,
          borderDash: [10, 5],
        },
      ],
    };
  };

  const getBackgroundColor = (total) => {
    if (total >= 150) return '#2c672e'; // Dark Green for more than 150%
    if (total >= 100) return '#4caf50'; // Green for 75% to 100%
    if (total >= 75) return '#ffeb3b'; // Yellow for 50% to 75%
    if (total >= 50) return '#ff9800'; // Orange for 25% to 50%
    if (total >= 1) return '#f44336'; // Orange for 25% to 50%

    return;
  };

  const renderDesktopHeaders = () => {
    return (
      !isMobile && (
        <CardContent sx={{ '&.MuiCardContent-root': { padding: 0 } }}>
          <Grid container justifyContent="space-around">
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Month</Typography>
            </Grid>
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Quota %</Typography>
            </Grid>
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Daily Avg</Typography>
            </Grid>
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Auctions</Typography>
            </Grid>
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Direct Sales</Typography>
            </Grid>
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Subtotal (Cash)</Typography>
            </Grid>
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Website Inventory</Typography>
            </Grid>
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Costs</Typography>
            </Grid>
            <Grid
              item
              xs={1}
              sx={{
                '&.MuiGrid-root': {
                  padding: '1rem 0',
                },
              }}
            >
              <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Total Value</Typography>
            </Grid>
          </Grid>
        </CardContent>
      )
    );
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    handleEditToggle();
    // Prepare the data to be sent
    const quotaData = {
      monthly_quota: monthlyGoalInput,
      work_days: workingDaysInput,
    };

    try {
      // Call the editQuotaGoals fetch function
      await editQuotaGoals(quotaData);
      await refreshQuotaData();
      // Optionally, show a success message or update the state/UI as needed

      // If you want to refresh the quota data, you can do so here
      // This depends on how your useQuota hook is set up and whether it needs refreshing
    } catch (e) {
      if (e.code !== 401 && e.code !== 403) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error updating quota goals:', e);
        }
        toast.error(`Error updating goals: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
        });
      }
    }
  };

  const renderMobileAccordion = (summary) => (
    <Accordion key={summary.month}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        {/* Simplified summary for mobile view */}
        <Grid item xs={isMobile ? 4 : 1}>
          <Typography>{summary.month}</Typography>
        </Grid>
        <Grid
          item
          xs={isMobile ? 4 : 2}
          sx={{
            display: isMobile ? 'flex' : 'block',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              display: 'inline-block',
              color: getBackgroundColor(summary.quotaPercent),

              borderRadius: '10px',
              padding: isMobile ? '5px 30px' : '2px 30px',
              justifyContent: 'flex-start',
              alignItems: 'center',
              transform: isMobile ? 'translate(30%, -12%)' : 'translate(0%, 5%)',
            }}
          >
            {monthlyQuota.length > 0 && (
              <>
                <Typography>{summary.quotaPercent.toFixed(0)}%</Typography>
                <Typography>${summary.total.toLocaleString()}</Typography>
              </>
            )}
          </Box>
        </Grid>
      </AccordionSummary>
      <AccordionDetails>
        {/* Full details for mobile view */}
        <>
          <Grid
            item
            xs={12}
            sx={{
              // backgroundColor: productTypeColors['auction'],
              border: '1px solid',
              borderColor: 'black',
              borderRadius: '10px',
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '30px  0px',
              padding: '15px',
              height: '30px',
            }}
          >
            <Typography sx={{ padding: '0' }}>Daily Avg</Typography>
            <Typography sx={{ padding: '0' }}>${Number(summary.dailyAvg.toFixed(0)).toLocaleString()}</Typography>
          </Grid>
          <Grid
            item
            xs={12}
            sx={{
              backgroundColor: productTypeColors['auction'],
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '30px  0px',
              padding: '15px',
              height: '30px',
            }}
          >
            <Typography sx={{ padding: '0' }}>Auctions</Typography>

            <Typography sx={{ padding: '0' }}>${summary.subtotalAuctions.toLocaleString()}</Typography>
          </Grid>
          <Grid
            item
            xs={12}
            sx={{
              backgroundColor: productTypeColors['direct-sale'],
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '30px  0px',
              padding: '15px',
              height: '30px',
            }}
          >
            <Typography sx={{ padding: '0' }}>Direct Sales</Typography>

            <Typography>${summary.subtotalDirectSales.toLocaleString()}</Typography>
          </Grid>
          <Grid
            item
            xs={12}
            sx={{
              backgroundColor: productTypeColors['total-sale'],
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '30px  0px',
              padding: '15px',
              height: '30px',
            }}
          >
            <Typography sx={{ padding: '0' }}>Subtotal (Cash)</Typography>

            <Typography>${summary.totalSales.toLocaleString()}</Typography>
          </Grid>
          <Grid
            item
            xs={12}
            sx={{
              backgroundColor: productTypeColors['inventory'],
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '30px  0px',
              padding: '15px',
              height: '30px',
            }}
          >
            <Typography sx={{ padding: '0' }}>Website Inventory</Typography>

            <Typography>${summary.subtotalInventory.toLocaleString()}</Typography>
          </Grid>
          <Grid
            item
            xs={12}
            sx={{
              backgroundColor: productTypeColors['prep-other'],
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '30px  0px',
              padding: '15px',
              height: '30px',
            }}
          >
            <Typography sx={{ padding: '0' }}>Prep/ other</Typography>

            <Typography>${summary.subtotalPrepOther.toLocaleString()}</Typography>
          </Grid>
          <Grid
            item
            xs={12}
            sx={{
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '30px  0px',
              padding: '15px',
              height: '30px',
            }}
          >
            <Typography sx={{ padding: '0' }}>Total Value</Typography>

            <Typography sx={{ fontWeight: 'bold', fontSize: '1.3rem' }}>${summary.total.toLocaleString()}</Typography>
          </Grid>
        </>
      </AccordionDetails>
    </Accordion>
  );

  const newSubscriberAnalysisNav = () => {
    toast.dismiss('set-goals');
  };

  const handleShowHelp = () => {
    toast.info(
      `${
        'Next step: Your Goals need to be set to enable Quota % calculation, please ' +
        (isMobile ? 'tap on Your Goals' : 'click on Edit Goals') +
        ' to set your Monthly Quota and Working Days'
      }`,
      {
        theme: 'colored',
        draggable: true,
        onClick: () => newSubscriberAnalysisNav(),
        draggablePercent: 60,
        toastId: 'set-goals',
        autoClose: false,
      }
    );
  };

  const [isDelayedLoading, setIsDelayedLoading] = useState(false);

  useEffect(() => {
    if (!quotaLoading) {
      setIsDelayedLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsDelayedLoading(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [quotaLoading]);

  return isDelayedLoading ? (
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
        Loading Analysis <span className="animated-ellipsis">.</span>
        <span className="animated-ellipsis">.</span>
        <span className="animated-ellipsis ">.</span>
      </Typography>
      <FlamePipe />
    </Box>
  ) : quotaLoading ? null : !monthlySummaries.length || !chartReadyData.length ? (
    // Display images when no relevant data is available
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      {isMobile ? (
        <>
          {' '}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              marginTop: '180px',
            }}
          >
            <Typography>
              {' '}
              No data saved to display yet. Go to the Dashboard tab to create your first post, or to the Products Tab to
              create your first product. Then once you set your goals, your Analysis tab can look like the example
              display below:{' '}
            </Typography>
            <img src={analysisMobileImageEx1} alt="Mobile Example 1" width="60%" />
            <img src={analysisMobileImageEx2} alt="Mobile Example 2" width="60%" />
          </Box>
        </>
      ) : (
        <>
          {' '}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              alignSelf: 'flex-start',
            }}
          >
            <Typography sx={{ width: '60%', textAlign: 'left' }}>
              No data saved to display yet. Go to the Dashboard tab to create your first post, or to the Products Tab to
              create your first product. Then once you set your goals, your Analysis tab can look like the example
              display below:
            </Typography>
            <img src={analysisDesktopImageEx} alt="Desktop Example" width="60%" />
          </Box>
        </>
      )}
    </Box>
  ) : (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        borderWidth: '1px',
        borderStyle: 'solid',
        color: (theme) => theme.palette.primary.light,
        paddingX: (theme) => theme.spacing(2),
        paddingY: (theme) => theme.spacing(2),
        borderRadius: (theme) => theme.spacing(1),
        gap: (theme) => theme.spacing(1),
        '&.MuiBox-root ': {
          paddingLeft: isMobile ? '2px' : '4px',
          paddingRight: isMobile ? '2px' : '4px',
        },
        transform: 'translate(0%, -2.5%)',
      }}
    >
      <QuotaGoals
        handleFormSubmit={handleFormSubmit}
        monthlyGoalInput={monthlyGoalInput}
        setMonthlyGoalInput={setMonthlyGoalInput}
        workingDaysInput={workingDaysInput}
        setWorkingDaysInput={setWorkingDaysInput}
        editMode={editMode}
        handleEditToggle={handleEditToggle}
        isMobile={isMobile}
        glowEdit={toast.isActive && toast.isActive('set-goals')}
        sx={{ marginBottom: '20px' }}
      />

      <Box sx={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
        <Button
          onClick={() => {
            setTimeRange('6months');
            setCurrentPage(1);
          }}
          variant={timeRange === '6months' ? 'contained' : 'outlined'}
        >
          Last 6 months
        </Button>
        <Button
          onClick={() => {
            setTimeRange('1year');
            setCurrentPage(1);
          }}
          variant={timeRange === '1year' ? 'contained' : 'outlined'}
        >
          Last year
        </Button>
        <Button
          onClick={() => {
            setTimeRange('2years');
            setCurrentPage(1);
          }}
          variant={timeRange === '2years' ? 'contained' : 'outlined'}
        >
          Last 2 years
        </Button>
      </Box>

      <Grid
        container
        spacing={2}
        sx={{
          width: '100%',
          marginLeft: '100px',
          border: '1px solid green',
          margin: 'auto',
        }}
      >
        {' '}
        {/* Chart Column */}
        <Grid item xs={12} sm={12} md={12} lg={5} xl={5} component={Paper}>
          <Line data={prepareChartData(chartReadyData)} options={options} height={isMobile ? 300 : 200} />
        </Grid>
        {/* Data Table Column */}
        <Grid
          item
          xs={12}
          sm={12}
          md={12}
          lg={7}
          sx={{
            '&.MuiGrid-root ': { paddingLeft: '10px', paddingRight: '10px', paddingTop: isMobile ? '1rem' : '.5rem' },
          }}
        >
          {/* Pagination controls */}
          <Box sx={{ margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Button onClick={handlePreviousPage} disabled={currentPage === 1}>
              Previous
            </Button>
            <Typography mx={2}>
              Page {currentPage} of {totalPages}
            </Typography>
            <Button onClick={handleNextPage} disabled={currentPage === totalPages}>
              Next
            </Button>
          </Box>
          {isMobile ? (
            paginatedSummaries.map(renderMobileAccordion)
          ) : (
            <>
              {renderDesktopHeaders()}
              {paginatedSummaries.map((summary, index) => (
                <Card key={index} sx={{ padding: '0', width: '100%', marginBottom: '5px' }}>
                  <CardContent sx={{ '&:last-child': { paddingBottom: '0' } }}>
                    <Grid
                      container
                      justifyContent="space-around"
                      spacing={2}
                      sx={{ fontSize: isMobile ? '0.8rem' : '1rem' }}
                    >
                      <Grid
                        item
                        xs={isMobile ? 4 : 1}
                        sx={{
                          display: 'flex',
                          // alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography>{summary.month}</Typography>
                      </Grid>
                      <Grid
                        item
                        xs={isMobile ? 4 : 1}
                        sx={{
                          display: isMobile ? 'flex' : 'block',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'inline-block',
                            color: getBackgroundColor(summary.quotaPercent),
                            borderRadius: '10px',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                          }}
                        >
                          {monthlyQuota.length > 0 && (
                            <>
                              <Typography>{summary.quotaPercent.toFixed(0)}%</Typography>
                              <Typography>${summary.total.toLocaleString()}</Typography>
                            </>
                          )}
                        </Box>
                      </Grid>
                      {!isMobile && (
                        // Additional columns for desktop ===============================================
                        <>
                          <Grid
                            item
                            xs={1}
                            sx={{
                              border: '1px solid',
                              borderColor: 'black',
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              margin: '30px  0px',
                              padding: '15px',
                              height: '30px',
                            }}
                          >
                            <Typography sx={{ padding: '0' }}>
                              ${Number(summary.dailyAvg.toFixed(0)).toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid
                            item
                            xs={1}
                            sx={{
                              backgroundColor: productTypeColors['auction'],
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'flex-start',
                              alignItems: 'center',
                              margin: '30px  0px',
                              padding: '15px',
                              height: '30px',
                            }}
                          >
                            <Typography sx={{ padding: '0' }}>${summary.subtotalAuctions.toLocaleString()}</Typography>
                          </Grid>
                          <Grid
                            item
                            xs={1}
                            sx={{
                              backgroundColor: productTypeColors['direct-sale'],
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              margin: '30px  0px',
                              padding: '15px',
                              height: '30px',
                            }}
                          >
                            <Typography>${summary.subtotalDirectSales.toLocaleString()}</Typography>
                          </Grid>
                          <Grid
                            item
                            xs={1}
                            sx={{
                              backgroundColor: productTypeColors['total-sale'],
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              margin: '30px  0px',
                              padding: '15px',
                              height: '30px',
                            }}
                          >
                            <Typography>${summary.totalSales.toLocaleString()}</Typography>
                          </Grid>
                          <Grid
                            item
                            xs={1}
                            sx={{
                              backgroundColor: productTypeColors['inventory'],
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              margin: '30px  0px',
                              padding: '15px',
                              height: '30px',
                            }}
                          >
                            <Typography>${summary.subtotalInventory.toLocaleString()}</Typography>
                          </Grid>
                          <Grid
                            item
                            xs={1}
                            sx={{
                              backgroundColor: productTypeColors['prep-other'],
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              margin: '30px  0px',
                              padding: '15px',
                              height: '30px',
                            }}
                          >
                            <Typography>${summary.subtotalPrepOther.toLocaleString()}</Typography>
                          </Grid>
                          <Grid
                            item
                            xs={1}
                            sx={{
                              borderRadius: '10px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              margin: '30px  0px',
                              padding: '15px',
                              height: '30px',
                            }}
                          >
                            <Typography sx={{ fontWeight: 'bold', fontSize: '1.3rem' }}>
                              ${summary.total.toLocaleString()}
                            </Typography>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analysis;
