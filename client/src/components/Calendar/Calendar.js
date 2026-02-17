import React, { useState, useEffect } from 'react';
import { Grid, Typography, Paper, Box, Button, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useQuota } from '../../hooks/useQuota.js';
import { editQuotaGoals } from '../../services/fetch-quota-goals.js';
import './Calendar.css';
import SelectedDayModal from './SelectedDayModal.js';
import { useMediaQuery } from '@mui/material';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import DisplayCalendar from './DisplayCalendar.js';
import { useSwipeable } from 'react-swipeable';
import QuotaGoals from './QuotaGoals.js';
import exampleCalendarImageDesktop from '../../assets/calendar-ex-dt.png';
import exampleCalendarImageMobile1 from '../../assets/calendar-ex-m-1.png';
import exampleCalendarImageMobile2 from '../../assets/calendar-ex-m-2.png';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../../stores/useAuthStore.js';

export default function Calendar({ products }) {
  // State variables ==============================================================

  const [calendarMonths, setCalendarMonths] = useState([]);
  const today = new Date(); // Get today's date
  const { customerId, authenticateUser, isAuthenticated } = useAuthStore();
  const { monthlyQuota, workdays, refreshQuotaData, quotaError, quotaLoading } = useQuota(customerId);
  const [monthlyGoalInput, setMonthlyGoalInput] = useState();
  const [workingDaysInput, setWorkingDaysInput] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const [selectedProductType, setSelectedProductType] = useState('all');
  const [modalImage, setModalImage] = useState('');

  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const monthsPerPage = 3; // Number of months to display per page

  const [selectedDayProducts, setSelectedDayProducts] = useState([]);

  const [selectedDayHighlight, setSelectedDayHighlight] = useState();
  const [modalDetails, setModalDetails] = useState();
  // Sliced months for desktop pagination
  const paginatedMonths = calendarMonths.slice(currentMonthIndex, currentMonthIndex + monthsPerPage);

  // Functions ==============================================================

  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      authenticateUser();
    }
  }, []);

  // --Functions to paginate next/previous for DESKTOP
  const goToNextPage = () => {
    if (currentMonthIndex + monthsPerPage < calendarMonths.length) {
      setCurrentMonthIndex((prev) => prev + monthsPerPage);
    }
  };

  const goToPreviousPage = () => {
    if (currentMonthIndex - monthsPerPage >= 0) {
      setCurrentMonthIndex((prev) => prev - monthsPerPage);
    }
  };

  const calculateDailyTotal = (dayString, sortedProducts) => {
    return sortedProducts.reduce(
      (acc, product) => {
        const productDate = new Date(parseInt(product.date));
        const qty = product.qty !== undefined ? Number(product.qty) : 1;
        for (let j = 0; j < product.num_days; j++) {
          const adjustedDate = new Date(productDate.getFullYear(), productDate.getMonth(), productDate.getDate() - j);
          const dateString = adjustedDate.toISOString().split('T')[0];
          // For the last day of the span, do not grey out
          if (dateString === dayString && j === 0) {
            acc.displayTotal += (parseFloat(product.price || 0) * qty) / product.num_days; // total for calculations
            acc.total += parseFloat(product.price || 0) * qty; // total for calculations
            acc.isGreyOut = false; // The final day keeps its color
          }
          // For earlier days, grey out if they're part of a multi-day span
          if (dateString === dayString && j > 0) {
            acc.isGreyOut = true;
            acc.displayTotal += (parseFloat(product.price || 0) * qty) / product.num_days; // Add portion for earlier days too
          }
        }
        return acc;
      },
      { total: 0, displayTotal: 0, isGreyOut: false }
    );
  };

  useEffect(() => {
    setMonthlyGoalInput(monthlyQuota);
    setWorkingDaysInput(workdays);
  }, [monthlyQuota, workdays]);

  useEffect(() => {
    if (products && products.length > 0) {
      // Populate calendarMonths...
      setCalendarMonths(calendarMonths);

      // Automatically set the currentMonthIndex to the current month's index on desktop, but only on initial load.
      if (!isMobile && currentMonthIndex === 0) {
        let currentMonthPosition = calendarMonths.findIndex(
          (month) => month.year === today.getFullYear() && month.month === today.getMonth()
        );

        // If no current month entries exist, fall back to the most recent month with entries
        if (currentMonthPosition === -1) {
          currentMonthPosition = calendarMonths.length - 1; // Assuming the months are in chronological order
        }

        if (currentMonthPosition !== -1) {
          const currentPage = Math.floor(currentMonthPosition / monthsPerPage);
          setCurrentMonthIndex(currentPage * monthsPerPage);
        }
      }
    }
  }, [products, calendarMonths, isMobile]);

  useEffect(() => {
    if (products && products.length > 0) {
      const filteredProducts =
        selectedProductType === 'all' ? products : products.filter((product) => product.type === selectedProductType);

      const sortedProducts = [...filteredProducts].sort((a, b) => parseInt(a.date) - parseInt(b.date));

      // if there are 0 auctions/ direct sales/ inventory/ prep days, do nothing
      if (sortedProducts.length === 0) {
        return;
      }
      const startDate = new Date(parseInt(sortedProducts[0].date));
      const endDate = new Date(parseInt(sortedProducts[sortedProducts.length - 1].date));

      const months = [];
      let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

      while (currentDate <= endDate) {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        let weeks = [];
        let week = [];
        let monthHasEntries = false;
        let totalWorkDays = 0;
        let totalPrepDays = 0;

        for (let i = 1; i <= daysInMonth; i++) {
          const dayString = new Date(currentDate.getFullYear(), currentDate.getMonth(), i).toISOString().split('T')[0];

          const dailyTotal = calculateDailyTotal(dayString, sortedProducts);
          const dailyProducts = sortedProducts.filter(
            (product) => new Date(parseInt(product.date)).toISOString().split('T')[0] === dayString
          );

          const hasWork = dailyProducts.length > 0;
          const isPrepDay = dailyProducts.some((product) => product.type === 'prep-other');

          if (isPrepDay) {
            totalPrepDays++;
          }

          // count greyed-out days as workdays as well
          if (dailyTotal.total !== 0 || hasWork || dailyTotal.isGreyOut) {
            if (!isPrepDay) {
              totalWorkDays++;
            }
            monthHasEntries = true; // Ensure the month gets added if there's any "prep-other" activity, negative values for the days exclude them from accumulation logic
          }

          const dayData = {
            day: i,
            total: dailyTotal.total,
            displayTotal: dailyTotal.displayTotal,
            hasWork,
            isGreyOut: dailyTotal.isGreyOut,
          };

          week.push(dayData);

          if (new Date(currentDate.getFullYear(), currentDate.getMonth(), i).getDay() === 6 || i === daysInMonth) {
            weeks.push(week);
            week = [];
          }
        }

        const totalDays = totalWorkDays + totalPrepDays;
        const monthlyTotal = weeks.flat().reduce((acc, day) => acc + day.total, 0);
        const averageDailyEarnings = totalDays > 0 ? (monthlyTotal / totalDays).toFixed(2) : 0;

        if (monthHasEntries) {
          months.push({
            year: currentDate.getFullYear(),
            month: currentDate.getMonth(),
            weeks,
            totalWorkDays,
            totalPrepDays,
            totalDays,
            averageDailyEarnings,
          });
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      sortedProducts.forEach((product) => {
        const productDate = new Date(parseInt(product.date));
        const monthIndex = months.findIndex(
          (m) => m.year === productDate.getFullYear() && m.month === productDate.getMonth()
        );

        if (monthIndex !== -1) {
          for (let j = 0; j < product.num_days; j++) {
            const dayToHighlight = productDate.getDate() - j;
            if (dayToHighlight > 0) {
              months[monthIndex].weeks.forEach((week) => {
                const dayIndex = week.findIndex((day) => day.day === dayToHighlight);
                if (dayIndex !== -1) {
                  week[dayIndex].highlight = true;
                  if (j > 0) {
                    week[dayIndex].highlightOnly = true;
                  }
                }
              });
            }
          }
        }
      });

      setCalendarMonths(months);
    }
  }, [products, selectedProductType]);

  const isPreviousMonthDataAvailable = () => {
    return calendarMonths.some(
      (month) => (month.year === currentYear && month.month < currentMonth) || month.year < currentYear
    );
  };

  const isNextMonthDataAvailable = () => {
    return calendarMonths.some(
      (month) => (month.year === currentYear && month.month > currentMonth) || month.year > currentYear
    );
  };

  const goToNextMonth = () => {
    // Find the next available month in the calendarMonths array
    const nextMonthData = calendarMonths.find(
      (month) => (month.year === currentYear && month.month > currentMonth) || month.year > currentYear
    );
    if (nextMonthData) {
      setCurrentMonth(nextMonthData.month);
      setCurrentYear(nextMonthData.year);
    }
  };

  const goToPreviousMonth = () => {
    // Find the previous available month in the calendarMonths array
    const previousMonthData = [...calendarMonths]
      .reverse()
      .find((month) => (month.year === currentYear && month.month < currentMonth) || month.year < currentYear);
    if (previousMonthData) {
      setCurrentMonth(previousMonthData.month);
      setCurrentYear(previousMonthData.year);
    }
  };

  // Swipe handlers
  const handleSwipeLeft = () => {
    if (isNextMonthDataAvailable()) {
      goToNextMonth();
    }
  };

  const handleSwipeRight = () => {
    if (isPreviousMonthDataAvailable()) {
      goToPreviousMonth();
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    trackMouse: true, // Optional: if you want to enable swipe with mouse on desktop
  });

  // Find the month data for the currently selected month and year
  const currentMonthData = calendarMonths.find((month) => month.year === currentYear && month.month === currentMonth);

  const getBackgroundColor = (total, hasWork) => {
    if (hasWork && total === 0) return '#AAAAAA'; // Grey for work done but no sales completed
    if (hasWork && total < 0) return '#3300ff'; // purple for negative (prep days)
    const quotaPercentage = (total / (monthlyQuota / workdays)) * 100;

    if (quotaPercentage >= 150) return '#2c672e'; // Dark Green for more than 150%
    if (quotaPercentage >= 100) return '#4caf50'; // Green for 100% to 150%
    if (quotaPercentage >= 75) return '#9a8e23'; // Yellow for 75% to 100%
    if (quotaPercentage >= 50) return '#ff9800'; // Orange for 50% to 75%
    if (quotaPercentage >= 1) return '#f44336'; // Red for 1% to 50%
    return;
  };

  // const today = new Date();
  const isToday = (day, month, year) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const getQuotaPercentageColor = (quotaPercent) => {
    // Similar logic as getBackgroundColor but for quota percentage
    if (quotaPercent >= 100) return '#4caf50'; // Green for 75% to 100%
    if (quotaPercent >= 75) return '#ffeb3b'; // Yellow for 50% to 75%
    if (quotaPercent >= 50) return '#ff9800'; // Orange for 25% to 50%
    if (quotaPercent >= 1) return '#f44336'; // Orange for 25% to 50%
  };

  const getTextColor = (product) => {
    if (product.type === 'prep-other') return 'red';
    const pricePerDay = parseFloat(product.price / product.num_days).toFixed(0);
    return getBackgroundColor(pricePerDay, true);
  };

  // Function to handle day selection
  const handleDayClick = (day, month, year) => {
    const selectedDate = new Date(year, month, day).toISOString().split('T')[0];
    setSelectedDayHighlight(selectedDate);
    const productsOfTheDay = products.filter(
      (product) => new Date(parseInt(product.date)).toISOString().split('T')[0] === selectedDate
    );
    setSelectedDayProducts(productsOfTheDay);
    if (isMobile) {
      setOpenModal(true);
    }
  };
  const [editMode, setEditMode] = useState(false);

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
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error updating quota goals:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error updating quota goals: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'calendar-1',
          autoClose: false,
        });
      }
    }
  };

  const formatDate = (date) => {
    const dateObj = new Date(parseInt(date));
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const renderEmptyWeekRows = (numberOfWeeks) => {
    const emptyWeeksNeeded = 6 - numberOfWeeks;
    let emptyWeekRows = [];

    for (let i = 0; i < emptyWeeksNeeded; i++) {
      emptyWeekRows.push(
        <Box key={`empty-week-${i}`} sx={{ display: 'flex', flexDirection: 'row' }}>
          {[...Array(7).keys()].map((emptyDayIndex) => (
            <Box key={`empty-day-${emptyDayIndex}`} sx={{ width: '20px', height: '20px', margin: 1 }} />
          ))}
        </Box>
      );
    }

    return emptyWeekRows;
  };

  const handleTypeChange = (event) => {
    setSelectedProductType(event.target.value);
  };

  const handleImageClick = (product) => {
    setModalImage(product.image_url);
    setModalDetails(product);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const calculateShelfTime = (product) => {
    const creationDate = new Date(parseInt(product.date));
    if (product.sold && !product.date_sold) return null;
    const endDate = product.sold ? new Date(parseInt(product.date_sold)) : new Date();
    const diffTime = Math.abs(endDate - creationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const newSubscriberCalendarNav = () => {
    toast.dismiss('set-goals');
  };
  const [isDelayedLoading, setIsDelayedLoading] = useState(false);
  const hasShownToast = React.useRef(false);

  useEffect(() => {
    if (!quotaLoading && products.length > 0 && !hasShownToast.current) {
      if (monthlyQuota === 0) {
        handleShowHelp();
        hasShownToast.current = true;
      }
    }
  }, [quotaLoading, monthlyQuota, products]);

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
        draggablePercent: 60,
        onClick: () => newSubscriberCalendarNav(),
        toastId: 'set-goals',
        autoClose: false,
      }
    );
  };
  return isDelayedLoading || quotaError ? (
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
        Loading Calendar <span className="animated-ellipsis">.</span>
        <span className="animated-ellipsis">.</span>
        <span className="animated-ellipsis ">.</span>
      </Typography>
      <FlamePipe />
    </Box>
  ) : quotaLoading ? null : products.length === 0 ? (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Typography sx={{ width: '80%', textAlign: 'left' }}>
        No data saved to display yet. Go to the Dashboard tab to create your first post, or to the Products Tab to
        create your first product. Then once you set your goals, your Calendar tab can look like the example display
        below:
      </Typography>
      <img width="50%" src={isMobile ? exampleCalendarImageMobile2 : exampleCalendarImageDesktop} alt="example" />
      <img
        width="50%"
        src={isMobile ? exampleCalendarImageMobile1 : null}
        alt="example"
        style={{ display: isMobile ? 'block' : 'none' }}
      />
    </Box>
  ) : (
    <Box
      sx={{
        transform: 'translate(0%, -2.1%)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: (theme) => theme.palette.primary.dark,
      }}
    >
      {' '}
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
      />
      <Box
        sx={{
          ...(!isMobile && {
            display: 'grid',
            gridTemplateColumns: '75% 25%',
          }),
        }}
      >
        <SelectedDayModal
          openModal={openModal}
          setOpenModal={setOpenModal}
          selectedDayProducts={selectedDayProducts}
          formatDate={formatDate}
          getTextColor={getTextColor}
        />

        {/* Conditional rendering based on screen size */}
        <Box {...swipeHandlers} className="calendar-container" alignContent="center">
          {isMobile ? (
            //^ Mobile-specific layout with single month display================================
            //^ Mobile-specific layout with single month display================================
            //^ Mobile-specific layout with single month display================================
            <>
              {' '}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 2,
                  minHeight: '100px',
                }}
              >
                {/* Render invisible/disabled button for layout consistency */}
                {!isPreviousMonthDataAvailable(currentMonth, currentYear, calendarMonths) ? (
                  <Button disabled style={{ visibility: 'hidden' }}>
                    &lt;
                  </Button>
                ) : (
                  <Button onClick={goToPreviousMonth}>&lt;</Button>
                )}
                <Typography variant="h6" sx={{ margin: '0 20px' }}>
                  {`${currentMonth + 1} / ${currentYear}`}
                </Typography>
                {/* Render invisible/disabled button for layout consistency */}
                {!isNextMonthDataAvailable(currentMonth, currentYear, calendarMonths) ? (
                  <Button disabled style={{ visibility: 'hidden' }}>
                    &gt;
                  </Button>
                ) : (
                  <Button onClick={goToNextMonth}>&gt;</Button>
                )}
              </Box>
              {currentMonthData ? (
                <DisplayCalendar
                  currentMonthData={currentMonthData}
                  handleDayClick={handleDayClick}
                  monthlyQuota={monthlyQuota}
                  monthlyGoalInput={monthlyGoalInput}
                  workingDaysInput={workingDaysInput}
                  getQuotaPercentageColor={getQuotaPercentageColor}
                  getBackgroundColor={(total, hasWork) => getBackgroundColor(total, hasWork)} // Pass hasWork to getBackgroundColor
                  selectedProductType={selectedProductType}
                  handleTypeChange={handleTypeChange}
                  isToday={isToday} // Pass the isToday function
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  handleShowHelp={handleShowHelp}
                />
              ) : (
                <Typography sx={{ padding: '20px' }}>
                  This month doesn&apos;t have any data. Please select another month and enjoy your day. Please let us
                  know if you have any problems.
                </Typography>
              )}
            </>
          ) : (
            //^ Desktop layout with multiple months displayed side-by-side   ====================================
            //^ Desktop layout with multiple months displayed side-by-side   ====================================
            //^ Desktop layout with multiple months displayed side-by-side   ====================================

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                width: '100%',
              }}
            >
              {' '}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: 0,
                  margin: '5px',
                }}
              >
                <Button
                  onClick={() => {
                    setSelectedProductType('all');
                    setCurrentMonthIndex(0);
                  }}
                  variant={selectedProductType === 'all' ? 'contained' : 'outlined'}
                >
                  All
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProductType('auction');
                    setCurrentMonthIndex(0);
                  }}
                  variant={selectedProductType === 'auction' ? 'contained' : 'outlined'}
                >
                  Auction
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProductType('direct-sale');
                    setCurrentMonthIndex(0);
                  }}
                  variant={selectedProductType === 'direct-sale' ? 'contained' : 'outlined'}
                >
                  Direct Sale
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProductType('inventory');
                    setCurrentMonthIndex(0);
                  }}
                  variant={selectedProductType === 'inventory' ? 'contained' : 'outlined'}
                >
                  Inventory
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProductType('prep-other');
                    setCurrentMonthIndex(0);
                  }}
                  variant={selectedProductType === 'prep-other' ? 'contained' : 'outlined'}
                >
                  Prep/Other
                </Button>
              </Box>{' '}
              <Box sx={{ width: '100%', marginTop: 0 }}>
                <Grid container spacing={2} sx={{ flexWrap: 'nowrap' }}>
                  {/* Empty Grid item for alignment with day numbers column */}
                </Grid>

                {/*  Pagination controls */}
              </Box>
              <Box display="flex" justifyContent="center">
                <Button onClick={goToPreviousPage} disabled={currentMonthIndex === 0}>
                  Previous
                </Button>{' '}
                <Typography
                  mx={2}
                  sx={{
                    color: 'green',
                  }}
                >
                  Page {Math.floor(currentMonthIndex / monthsPerPage) + 1} of{' '}
                  {Math.ceil(calendarMonths.length / monthsPerPage)}
                </Typography>
                <Button onClick={goToNextPage} disabled={currentMonthIndex + monthsPerPage >= calendarMonths.length}>
                  Next
                </Button>
              </Box>
              <Box sx={{ width: '100%', height: '100%' }}>
                <Grid container spacing={2} sx={{ flexWrap: 'nowrap', marginLeft: '0px' }}>
                  {/* Calendar display for DESKTOP===============================================================  */}
                  {/* Calendar display for DESKTOP===============================================================  */}
                  {/* Calendar display for DESKTOP===============================================================  */}
                  {paginatedMonths.map((monthData, index) => (
                    <Grid key={index} item sx={{ width: '300px', height: 'auto' }}>
                      <Paper elevation={3} sx={{ padding: 1, marginBottom: 2 }}>
                        <Typography variant="h6" align="center">
                          {`${monthData.month + 1}/ ${monthData.year}`}
                        </Typography>
                        {monthData.weeks.map((week, weekIndex) => (
                          <Box
                            key={`${monthData.year}-${monthData.month}-week-${weekIndex}`}
                            sx={{ display: 'flex', flexDirection: 'row' }}
                          >
                            {/* Render empty cells for alignment */}
                            {weekIndex === 0 &&
                              [...Array(7 - week.length).keys()].map((emptyCellIndex) => (
                                <Box key={emptyCellIndex} sx={{ width: '20px', height: '20px', margin: 1 }} />
                              ))}
                            {week.map((day) => {
                              const dayDate = new Date(monthData.year, monthData.month, day.day)
                                .toISOString()
                                .split('T')[0];
                              const isSelected = selectedDayHighlight === dayDate;

                              return (
                                <Paper
                                  key={day.day}
                                  onClick={() => handleDayClick(day.day, monthData.month, monthData.year)}
                                  elevation={1}
                                  sx={{
                                    width: '20px',
                                    height: '20px',
                                    aspectRatio: '1 / 1',
                                    padding: 0,
                                    margin: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: isSelected ? '2px solid yellow' : '1px solid #e0e0e0',
                                    boxShadow: isSelected ? '0 0 15px 5px rgb(75, 247, 49)' : 'none',
                                    backgroundColor: day.isGreyOut
                                      ? '#AAAAAA'
                                      : getBackgroundColor(day.displayTotal, day.hasWork),
                                    cursor: day.total !== 0 || day.hasWork === true ? 'pointer' : 'default',
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                                    {day.day}
                                  </Typography>
                                </Paper>
                              );
                            })}

                            {/* Render empty cells for alignment */}
                            {weekIndex === monthData.weeks.length - 1 &&
                              [...Array(7 - week.length).keys()].map((emptyCellIndex) => (
                                <Box key={emptyCellIndex} sx={{ width: '20px', height: '20px', margin: 1 }} />
                              ))}
                          </Box>
                        ))}
                        {renderEmptyWeekRows(monthData.weeks.length)}
                      </Paper>
                      {/* Totals and Quota Percentages below calendar */}
                      <Paper
                        elevation={3}
                        sx={{
                          padding: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            border: '1px solid #e0e0e0',
                            borderColor: getQuotaPercentageColor(
                              (monthData.weeks.flat().reduce((acc, day) => acc + day.total, 0) / monthlyQuota) * 100
                            ),
                            borderRadius: '5px',
                            padding: 1,
                            margin: '5px 0px',
                            width: '100%',
                          }}
                        >
                          <Typography sx={{ display: 'inline', fontSize: '1rem' }}>
                            Total: $
                            <span style={{ fontWeight: 'bold' }}>
                              {Number(
                                monthData.weeks
                                  .flat()
                                  .reduce((acc, day) => acc + day.total, 0)
                                  .toFixed(0)
                              ).toLocaleString()}
                            </span>
                          </Typography>
                          <Typography
                            sx={{
                              borderRadius: '5px',
                              padding: 0,
                              margin: '5px 0px',
                            }}
                          >
                            Monthly Goal:{' '}
                            {(() => {
                              if (monthlyQuota <= 0) return 'Not set';

                              const totalDays = monthData.weeks.flat().reduce((acc, day) => acc + day.total, 0);
                              const percentage = ((totalDays / monthlyQuota) * 100).toFixed(0);
                              return `${percentage}%`;
                            })()}
                          </Typography>
                        </Box>
                        <Grid container spacing={1} justifyContent="space-between ">
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
                            <Typography sx={{ fontSize: '0.8rem' }}>Work Days:</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '0.8rem' }}>{monthData.totalWorkDays}</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
                            <Typography sx={{ fontSize: '0.8rem' }}>Prep/ Other Days:</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '0.8rem' }}>{monthData.totalPrepDays}</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
                            <Typography sx={{ fontSize: '0.8rem' }}>Total Days:</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '0.8rem' }}>{monthData.totalDays}</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
                            <Typography sx={{ fontSize: '0.8rem' }}>Daily Avg:</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '0.8rem' }}>${monthData.averageDailyEarnings}</Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
                            <Typography sx={{ fontSize: '0.8rem', textAlign: 'left' }}>% Daily Quota:</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            {
                              <Typography sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
                                {(() => {
                                  if (workingDaysInput <= 0 || !monthlyGoalInput) return 'Not set';

                                  const dailyGoal = monthlyGoalInput / workingDaysInput;
                                  const percentage = ((100 * monthData.averageDailyEarnings) / dailyGoal).toFixed();
                                  return `${percentage}%`;
                                })()}
                              </Typography>
                            }
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
              {/* Totals and Quota Percentages */}
              <Box sx={{ width: '100%', marginTop: 2 }}>
                <Grid container spacing={2} sx={{ flexWrap: 'nowrap' }}>
                  {/* Empty Grid item for alignment with day numbers column */}
                  {/* Totals for each month */}
                </Grid>
              </Box>
            </Box>
          )}
        </Box>
        {/*  Selected Products (desktop) ============================================= */}
        {!isMobile && (
          <Box
            sx={{
              height: '70vh',
              overflowY: 'hidden',
              border: '2px solid',
              borderColor: (theme) => theme.palette.primary.dark,
            }}
          >
            <Box className="selected-products">
              <Typography variant="h6" gutterBottom>
                {selectedDayProducts.length === 0 ? 'No products selected' : ' '}
                {selectedDayProducts.length > 0 && formatDate(selectedDayProducts[0].date)}
              </Typography>{' '}
              <Typography
                sx={{
                  marginBottom: '10px',
                  border: '1px solid yellow',
                  paddingLeft: '10px',
                  paddingRight: '10px',
                }}
              >
                Day Total: {` `}
                <span
                  style={{
                    color:
                      selectedDayProducts.reduce(
                        (acc, product) =>
                          acc + parseFloat(product.price || 0) * (product.qty !== undefined ? Number(product.qty) : 1),
                        0
                      ) < 0
                        ? 'red'
                        : 'inherit',
                  }}
                >
                  $
                  {selectedDayProducts
                    .reduce(
                      (acc, product) =>
                        acc + parseFloat(product.price || 0) * (product.qty !== undefined ? Number(product.qty) : 1),
                      0
                    )
                    .toLocaleString()}
                </span>
              </Typography>
              {selectedDayProducts.length === 0 && (
                <>
                  <Typography sx={{ marginTop: '30px', textAlign: 'left' }}>
                    Click a date to display the day&apos;s work. The percentage is based on the goals you set above.
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '4fr 5fr',
                      alignItems: 'center',
                      marginTop: '30px',
                      justifyContent: 'space-between',
                    }}
                  >
                    {' '}
                    <Paper
                      elevation={1}
                      sx={{
                        width: '20px',
                        height: '20px',
                        aspectRatio: '1 / 1',
                        padding: 0,
                        margin: 1,
                        justifySelf: 'center',
                        border: '1px solid #e0e0e0',
                        boxSizing: 'border-box',
                        backgroundColor: '#2c672e',
                      }}
                    ></Paper>
                    <Typography sx={{ marginTop: '8px', textAlign: 'left' }}>150%+</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '4fr 5fr',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {' '}
                    <Paper
                      elevation={1}
                      sx={{
                        width: '20px',
                        height: '20px',
                        aspectRatio: '1 / 1',
                        padding: 0,
                        margin: 1,
                        justifySelf: 'center',
                        border: '1px solid #e0e0e0',
                        boxSizing: 'border-box',
                        backgroundColor: '#4caf50',
                      }}
                    ></Paper>
                    <Typography sx={{ marginTop: '8px', textAlign: 'left' }}>100% -150%</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '4fr 5fr',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {' '}
                    <Paper
                      elevation={1}
                      sx={{
                        width: '20px',
                        height: '20px',
                        aspectRatio: '1 / 1',
                        padding: 0,
                        margin: 1,
                        justifySelf: 'center',
                        border: '1px solid #e0e0e0',
                        boxSizing: 'border-box',
                        backgroundColor: '#9a8e23',
                      }}
                    ></Paper>
                    <Typography sx={{ marginTop: '8px', textAlign: 'left' }}>75% -100%</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '4fr 5fr',
                      alignItems: 'center',

                      justifyContent: 'space-between',
                    }}
                  >
                    {' '}
                    <Paper
                      elevation={1}
                      sx={{
                        width: '20px',
                        height: '20px',
                        aspectRatio: '1 / 1',
                        padding: 0,
                        margin: 1,
                        justifySelf: 'center',
                        border: '1px solid #e0e0e0',
                        boxSizing: 'border-box',
                        backgroundColor: '#ff9800',
                      }}
                    ></Paper>
                    <Typography sx={{ marginTop: '8px', textAlign: 'left' }}>50%-75%</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '4fr 5fr',
                      alignItems: 'center',

                      justifyContent: 'space-between',
                    }}
                  >
                    {' '}
                    <Paper
                      elevation={1}
                      sx={{
                        width: '20px',
                        height: '20px',
                        aspectRatio: '1 / 1',
                        padding: 0,
                        margin: 1,
                        justifySelf: 'center',
                        border: '1px solid #e0e0e0',
                        boxSizing: 'border-box',
                        backgroundColor: '#f44336',
                      }}
                    ></Paper>
                    <Typography sx={{ marginTop: '8px', textAlign: 'left' }}>0%-50%</Typography>
                  </Box>{' '}
                  <Box
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '4fr 5fr',
                      alignItems: 'center',
                    }}
                  >
                    {' '}
                    <Paper
                      elevation={1}
                      sx={{
                        width: '20px',
                        height: '20px',
                        aspectRatio: '1 / 1',
                        padding: 0,
                        margin: 1,
                        justifySelf: 'center',
                        border: '1px solid #e0e0e0',
                        boxSizing: 'border-box',
                        backgroundColor: '#3300ff',
                      }}
                    ></Paper>
                    <Typography sx={{ marginTop: '8px', textAlign: 'left' }}>{`<0%`}</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '4fr 5fr',
                      alignItems: 'center',

                      justifyContent: 'space-between',
                    }}
                  >
                    {' '}
                    <Paper
                      elevation={1}
                      sx={{
                        width: '20px',
                        height: '20px',
                        aspectRatio: '1 / 1',
                        padding: 0,
                        margin: 1,
                        justifySelf: 'center',
                        border: '1px solid #e0e0e0',
                        boxSizing: 'border-box',
                        backgroundColor: '#cccccc',
                      }}
                    ></Paper>
                    <Typography sx={{ marginTop: '8px', textAlign: 'left' }}>Work day</Typography>
                  </Box>
                </>
              )}
              {/* Selected Day summary DESKTOP start*/}
              {/* Selected Day summary DESKTOP start*/}
              {/* Selected Day summary DESKTOP start*/}
              {selectedDayProducts.length > 0 && (
                <Box sx={{ height: '55vh', overflowY: selectedDayProducts.length > 4 ? 'scroll' : '' }}>
                  {selectedDayProducts.map((product) => (
                    <Box key={product.id || product.date} sx={{ marginBottom: '10px' }}>
                      <Card
                        sx={{
                          marginBottom: '10px',
                          padding: '10px',
                          width: '100%',
                          '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.2)' },
                          border: '1px solid',
                          borderColor: (theme) => theme.palette.primary.dark,
                        }}
                      >
                        <CardContent sx={{ padding: '0', '&:last-child': { paddingBottom: 0 } }}>
                          <Grid container spacing={1}>
                            <Grid item xs={3}>
                              <Box
                                component="img"
                                sx={{
                                  height: 60,
                                  width: 60,
                                  borderRadius: '5px',
                                  border: '1px solid #e0e0e0',
                                  cursor: 'pointer',
                                }}
                                src={product.image_url}
                                onClick={() => handleImageClick(product)}
                              />
                            </Grid>
                            <Grid item xs={9}>
                              <Grid container>
                                {' '}
                                <Grid item xs={5}>
                                  {' '}
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      lineHeight: '1.2',
                                      textAlign: 'left',
                                      fontWeight: 'bold',
                                      textDecoration: 'underline',
                                    }}
                                  >
                                    {product.title}
                                  </Typography>{' '}
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      lineHeight: '1.2',
                                      textAlign: 'left',
                                      textTransform: 'capitalize',
                                      fontSize: '.9rem',
                                      color: 'text.secondary',
                                    }}
                                  >
                                    {product.type}
                                  </Typography>{' '}
                                </Grid>
                                <Grid item xs={1}></Grid>
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    lineHeight: '1.2',
                                    textAlign: 'right',
                                    display: 'flex',
                                    fontWeight: 'bold',
                                    color: (theme) => (product.price < 0 ? 'red' : theme.palette.primary.light),
                                    marginTop: '2px',
                                  }}
                                >
                                  ${Number(product.price).toLocaleString()}
                                </Typography>
                              </Grid>
                              <Grid container spacing={0} sx={{ marginTop: '10px' }}>
                                <Grid item xs={6}>
                                  <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                                    Quantity:{' '}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                                    {product.qty}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                                    Duration:{' '}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                                    {product.num_days === '1' ? `${product.num_days} day` : `${product.num_days} days`}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                                    Rate:
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      lineHeight: '1.5',
                                      textAlign: 'left',
                                      fontWeight: '700',
                                      width: 'fit-content',
                                      padding: '0 5px 0 5px',
                                    }}
                                  >
                                    ${parseFloat((product.price * product.qty) / product.num_days).toFixed(0)} / day
                                  </Typography>
                                </Grid>
                                {product.type !== 'prep-other' && (
                                  <>
                                    <Grid item xs={6}>
                                      <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                                        Status:
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          lineHeight: '1.5',
                                          textAlign: 'left',
                                          color: product.sold ? 'success.main' : 'text.primary',
                                          fontWeight: '700',
                                          width: 'fit-content',
                                          padding: '0 5px 0 5px',
                                        }}
                                      >
                                        {product.sold ? 'Sold' : 'Available'}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                                        Shelf Time:
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          lineHeight: '1.5',
                                          textAlign: 'left',
                                          color: product.sold ? 'success.main' : 'warning.main',
                                          fontWeight: '700',
                                          width: 'fit-content',
                                          padding: '0 5px 0 5px',
                                        }}
                                      >
                                        {product.sold && !product.date_sold
                                          ? 'Not recorded'
                                          : `${calculateShelfTime(product)} days`}
                                      </Typography>
                                    </Grid>
                                  </>
                                )}
                              </Grid>
                            </Grid>
                            <Grid item xs={12} sx={{ lineHeight: '1.2' }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ lineHeight: '1.5', textAlign: 'left' }}
                              >
                                {product.description}
                              </Typography>
                            </Grid>
                            <Grid item xs={12}>
                              {product.post_id && (
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  size="small"
                                  sx={{ mt: 0, mb: 0 }}
                                  onClick={() => {
                                    navigate(`/dashboard/edit/${product.post_id}`);
                                  }}
                                >
                                  Edit Gallery Post
                                </Button>
                              )}
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
