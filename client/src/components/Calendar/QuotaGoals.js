import {
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import React from 'react';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import usePostStore from '../../stores/usePostStore.js';
import { keyframes } from '@mui/system';

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 0 4px #fff700, 0 0 16px 8px #fff700;
  }
  50% {
    box-shadow: 0 0 0 8px #fff70088, 0 0 32px 16px #fff70044;
  }
  100% {
    box-shadow: 0 0 0 4px #fff700, 0 0 16px 8px #fff700;
  }
`;

export default function QuotaGoals({
  handleFormSubmit,
  monthlyGoalInput,
  setMonthlyGoalInput,
  workingDaysInput,
  setWorkingDaysInput,
  editMode,
  handleEditToggle,
  isMobile,
  glowEdit,
}) {
  const { restricted } = usePostStore();

  const titleValue =
    monthlyGoalInput && workingDaysInput && workingDaysInput > 0
      ? `$${Number((monthlyGoalInput / workingDaysInput).toFixed(0)).toLocaleString()}`
      : 'Not set';
  const cardContentStyle = {
    padding: isMobile ? '0px 8px' : '4px 16px 0px 0px', // Reduced padding for mobile and desktop
    '&:last-child': {
      paddingBottom: isMobile ? '4px' : '2px', // Reducing the bottom padding
    },
  };
  return (
    <Card>
      {isMobile ? (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Your Goals
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {' '}
            <CardContent sx={cardContentStyle}>
              {editMode ? (
                <Box component="form" onSubmit={handleFormSubmit} noValidate>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size={isMobile ? 'small' : 'medium'}
                        margin="normal"
                        required
                        fullWidth
                        id="monthlyGoal"
                        label="Monthly Goal ($)"
                        name="monthlyGoal"
                        autoFocus
                        type="number"
                        inputProps={{ min: 0, max: 1000000 }}
                        value={monthlyGoalInput || ''}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value === '') setMonthlyGoalInput('');
                          else {
                            value = Math.max(0, Math.min(Number(value), 1000000));
                            setMonthlyGoalInput(value);
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size={isMobile ? 'small' : 'medium'}
                        margin="normal"
                        required
                        fullWidth
                        id="workingDays"
                        label="Working Days"
                        name="workingDays"
                        type="number"
                        inputProps={{ min: 0, max: 31 }}
                        value={workingDaysInput || ''}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value === '') setWorkingDaysInput('');
                          else {
                            value = Math.max(0, Math.min(Number(value), 31));
                            setWorkingDaysInput(value);
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size={isMobile ? 'small' : 'medium'}
                        margin="normal"
                        disabled
                        fullWidth
                        type="currency"
                        id="dailyGoal"
                        label="Daily Goal ($)"
                        name="dailyGoal"
                        inputProps={{ min: 0 }}
                        value={(monthlyGoalInput / workingDaysInput).toFixed(0) || ''}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      {
                        <Button
                          type="submit"
                          fullWidth
                          variant="contained"
                          sx={{ mt: 3, mb: 2 }}
                          disabled={restricted ? restricted : false}
                        >
                          {restricted ? 'Edit Disabled' : 'Save'}
                        </Button>
                      }
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Grid container spacing={2} alignItems="center">
                  {' '}
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined" sx={cardContentStyle}>
                      <CardHeader
                        subheader="Monthly Goal"
                        title={
                          monthlyGoalInput && monthlyGoalInput.length > 0
                            ? `$${Number(monthlyGoalInput).toLocaleString()}`
                            : 'Not set'
                        }
                        sx={cardContentStyle}
                      />
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined" sx={cardContentStyle}>
                      <CardHeader
                        sx={cardContentStyle}
                        subheader="Working Days"
                        title={
                          workingDaysInput && workingDaysInput.length > 0
                            ? `${workingDaysInput} ${workingDaysInput === '1' ? 'day' : 'days'}`
                            : 'Not set'
                        }
                      />
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Card variant="outlined" sx={cardContentStyle}>
                      <CardHeader sx={cardContentStyle} subheader="Daily Quota" title={titleValue} />
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <Button
                      onClick={handleEditToggle}
                      variant="outlined"
                      sx={{
                        mt: 2,
                        fontSize: isMobile ? '0.7rem' : '1rem',
                        boxShadow: glowEdit ? '0 0 0 4px #fff700, 0 0 16px 8px #fff700' : undefined,
                        borderColor: glowEdit ? '#fff700' : undefined,
                        zIndex: glowEdit ? 2 : undefined,
                        transition: 'box-shadow 0.3s',
                        animation: glowEdit ? `${pulseGlow} 1.5s ease-in-out infinite` : undefined,
                      }}
                    >
                      Edit Goals
                    </Button>{' '}
                    <Tooltip
                      title={
                        <>
                          <Typography sx={{ margin: '10px' }}>
                            The point here is to be able to see at a glance how your business is doing based on your
                            goals.{' '}
                          </Typography>
                          <Typography sx={{ margin: '10px' }}>Green = goals met. </Typography>
                          <Typography sx={{ margin: '10px' }}>
                            Yellow/ orange/ red = varying degrees of goals not met.{' '}
                          </Typography>
                          <Typography sx={{ margin: '10px' }}>
                            Set your monthly and daily goals and these values will be used to calculate all your totals
                            and based on how you perform, you&apos;ll see green/ yellow/ orange/ red colored days which
                            mean you met 100%, 75%, 50%, 25% of your monthly and daily goals you set. Change the goals
                            and the percentages and colors will change.
                          </Typography>{' '}
                        </>
                      }
                    >
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </AccordionDetails>
        </Accordion>
      ) : (
        <CardContent sx={cardContentStyle}>
          {editMode ? (
            <Box component="form" onSubmit={handleFormSubmit} noValidate>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    size={isMobile ? 'small' : 'medium'}
                    margin="normal"
                    required
                    fullWidth
                    id="monthlyGoal"
                    label="Monthly Goal ($)"
                    name="monthlyGoal"
                    autoFocus
                    type="number"
                    inputProps={{ min: 0, max: 1000000 }}
                    value={monthlyGoalInput || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value === '') setMonthlyGoalInput('');
                      else {
                        value = Math.max(0, Math.min(Number(value), 1000000));
                        setMonthlyGoalInput(value);
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    size={isMobile ? 'small' : 'medium'}
                    margin="normal"
                    required
                    fullWidth
                    id="workingDays"
                    label="Working Days"
                    name="workingDays"
                    type="number"
                    inputProps={{ min: 0, max: 31 }}
                    value={workingDaysInput || ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value === '') setWorkingDaysInput('');
                      else {
                        value = Math.max(0, Math.min(Number(value), 31));
                        setWorkingDaysInput(value);
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    size={isMobile ? 'small' : 'medium'}
                    margin="normal"
                    disabled
                    fullWidth
                    type="currency"
                    id="dailyGoal"
                    label="Daily Goal ($)"
                    name="dailyGoal"
                    inputProps={{ min: 0 }}
                    value={(monthlyGoalInput / workingDaysInput).toFixed(0) || ''}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  {
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      sx={{ mt: 3, mb: 2 }}
                      disabled={restricted ? restricted : false}
                    >
                      {restricted ? 'Edit Goals disabled' : 'Save'}
                    </Button>
                  }
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Card variant="outlined" sx={cardContentStyle}>
                  <CardHeader
                    subheader="Monthly Goal"
                    title={
                      monthlyGoalInput && monthlyGoalInput.length > 0
                        ? `$${Number(monthlyGoalInput).toLocaleString()}`
                        : 'Not set'
                    }
                    sx={cardContentStyle}
                  />
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined" sx={cardContentStyle}>
                  <CardHeader
                    sx={cardContentStyle}
                    subheader="Working Days"
                    title={
                      workingDaysInput && workingDaysInput.length > 0
                        ? `${workingDaysInput} ${workingDaysInput === '1' ? 'day' : 'days'}`
                        : 'Not set'
                    }
                  />
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card variant="outlined" sx={cardContentStyle}>
                  <CardHeader sx={cardContentStyle} subheader="Daily Quota" title={titleValue} />
                </Card>
              </Grid>

              <Grid item xs={12} sm={1} sx={{ display: 'flex', transform: 'Translate(0% ,-9%)' }}>
                {' '}
                <Button
                  onClick={handleEditToggle}
                  variant="outlined"
                  sx={{
                    mt: 2,
                    fontSize: isMobile ? '0.7rem' : '1rem',
                    boxShadow: glowEdit ? '0 0 0 4px #fff700, 0 0 16px 8px #fff700' : undefined,
                    borderColor: glowEdit ? '#fff700' : undefined,
                    zIndex: glowEdit ? 2 : undefined,
                    transition: 'box-shadow 0.3s',
                    animation: glowEdit ? `${pulseGlow} 1.5s ease-in-out infinite` : undefined,
                  }}
                >
                  Edit Goals
                </Button>{' '}
                <Tooltip
                  title={
                    <>
                      <p>
                        The point here is to be able to see at a glance how your business is doing based on your goals.{' '}
                      </p>
                      <p>Green = goals met. </p>
                      <p>Yellow/ orange/ red = varying degrees of goals not met. </p>
                      <p>
                        Set your monthly and daily goals and these values will be used to calculate all your totals and
                        based on how you perform, you&apos;ll see green/ yellow/ orange/ red colored days which mean you
                        met 100%, 75%, 50%, 25% of your monthly and daily goals you set. Change the goals and the
                        percentages and colors will change.
                      </p>{' '}
                    </>
                  }
                >
                  <IconButton size="small">
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          )}
        </CardContent>
      )}
    </Card>
  );
}
