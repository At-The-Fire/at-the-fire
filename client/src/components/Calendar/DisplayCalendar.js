import { Box, Grid, IconButton, Paper, Tooltip, Typography, MenuItem, Select, Button } from '@mui/material';
import React from 'react';
import InfoIcon from '@mui/icons-material/Info';
export default function DisplayCalendar({
  currentMonthData,
  handleDayClick,
  monthlyQuota,
  monthlyGoalInput,
  workingDaysInput,
  getQuotaPercentageColor,
  getBackgroundColor,
  selectedProductType,
  handleTypeChange,
  isToday,
  currentMonth,
  currentYear,
}) {
  return (
    <Box
      key={currentMonthData.month}
      sx={{
        width: '300px',
        height: 'auto',

        position: 'relative',
      }}
    >
      {' '}
      <Tooltip
        sx={{ position: 'absolute', top: '0px', right: '0px' }}
        title={
          <>
            <Typography sx={{ fontSize: '1.3rem', textAlign: 'left' }}>% of daily goal</Typography>
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
              <Typography sx={{ marginTop: '8px', textAlign: 'left' }}> {`<0%`}</Typography>
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
            <Typography sx={{ fontSize: '1rem', width: '100%', margin: '20px 0' }}>
              Tap days on the calendar with color to see finished products and insights for that day.
            </Typography>
          </>
        }
      >
        <IconButton size="small">
          <InfoIcon />
        </IconButton>
      </Tooltip>
      <Paper elevation={3} sx={{ padding: 1, marginBottom: 2 }}>
        {currentMonthData.weeks.map((week, weekIndex) => (
          <Box key={weekIndex} sx={{ display: 'flex', flexDirection: 'row' }}>
            {/* Render empty cells for alignment at the beginning of the month */}
            {weekIndex === 0 &&
              [...Array(7 - week.length).keys()].map((emptyCellIndex) => (
                <Box key={emptyCellIndex} sx={{ width: '20px', height: '20px', margin: 1 }} />
              ))}
            {/* Render each day */}
            {week.map((day) => (
              <Paper
                key={day.day}
                onClick={() => handleDayClick(day.day, currentMonthData.month, currentMonthData.year)}
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
                  border: isToday(day.day, currentMonth, currentYear)
                    ? '2px solid yellow' // Highlight current day with a red border
                    : '1px solid #e0e0e0',
                  boxSizing: 'border-box',
                  backgroundColor: day.highlightOnly ? '#AAAAAA' : getBackgroundColor(day.displayTotal, day.hasWork),
                  cursor: day.total !== 0 ? 'pointer' : 'default',
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {day.day}
                </Typography>
              </Paper>
            ))}

            {/* Render empty cells for alignment at the end of the month */}
            {weekIndex === currentMonthData.weeks.length - 1 &&
              [...Array(7 - week.length).keys()].map((emptyCellIndex) => (
                <Box key={emptyCellIndex} sx={{ width: '20px', height: '20px', margin: 1 }} />
              ))}
          </Box>
        ))}
      </Paper>
      <Paper
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          background: 'none',
          marginBottom: '16px',
        }}
      >
        {' '}
        <Typography sx={{ textAlign: 'left', paddingLeft: '10px', fontSize: '.9rem' }}>
          Select product type for display
        </Typography>
        <Select sx={{ width: '145px' }} value={selectedProductType} onChange={handleTypeChange}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="auction">Auction</MenuItem>
          <MenuItem value="direct-sale">Direct Sale</MenuItem>
          <MenuItem value="inventory">Inventory</MenuItem>
          <MenuItem value="prep-other">Prep Other</MenuItem>
        </Select>
      </Paper>
      {/* totals/ guota/ days worked =================================================== */}
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
              (currentMonthData.weeks.flat().reduce((acc, day) => acc + day.total, 0) / monthlyQuota) * 100
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
                currentMonthData.weeks
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
            % of Monthly Goal:{' '}
            {(() => {
              if (monthlyQuota <= 0) return 'Not set';

              const totalDays = currentMonthData.weeks.flat().reduce((acc, day) => acc + day.total, 0);
              const percentage = ((totalDays / monthlyQuota) * 100).toFixed(0);
              return `${percentage}%`;
            })()}
          </Typography>{' '}
        </Box>
        <Grid container spacing={1} justifyContent="space-between ">
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
            <Typography sx={{ fontSize: '0.8rem' }}>Work Days:</Typography>
          </Grid>
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.8rem' }}>{currentMonthData.totalWorkDays}</Typography>
          </Grid>
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
            <Typography sx={{ fontSize: '0.8rem' }}>Prep/ Other Days:</Typography>
          </Grid>
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.8rem' }}>{currentMonthData.totalPrepDays}</Typography>
          </Grid>
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
            <Typography sx={{ fontSize: '0.8rem' }}>Total Days:</Typography>
          </Grid>
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.8rem' }}>{currentMonthData.totalDays}</Typography>
          </Grid>
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
            <Typography sx={{ fontSize: '0.8rem' }}>Daily Avg:</Typography>
          </Grid>
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.8rem' }}>${currentMonthData.averageDailyEarnings}</Typography>
          </Grid>
          <Grid item xs={6} sx={{ fontSize: '0.8rem', textAlign: 'left' }}>
            <Typography sx={{ fontSize: '0.8rem', textAlign: 'left' }}>% Daily Quota:</Typography>
          </Grid>
          <Grid item xs={6}>
            {monthlyQuota.length !== 0 && (
              <Typography sx={{ fontSize: '0.8rem', textAlign: 'right' }}>
                {(() => {
                  if (workingDaysInput <= 0 || !monthlyGoalInput) return 'Not set';

                  const dailyGoal = monthlyGoalInput / workingDaysInput;
                  const percentage = ((100 * currentMonthData.averageDailyEarnings) / dailyGoal).toFixed();
                  return `${percentage}%`;
                })()}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
