import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Grid,
  TableContainer,
  Typography,
} from '@mui/material';

const getBorderColor = (tableData) => {
  if (Object.keys(tableData).length > 4) {
    return '2px dotted';
  } else if (Object.keys(tableData).length < 4) {
    `2px solid ${(theme) => theme.palette.primary.main}`;
  }
};

export default function TableSummary({ tableData, categories, calculateTotalForDate, isMobile }) {
  return (
    <Grid item xs={12} lg={8}>
      <TableContainer
        component={Paper}
        sx={{
          position: 'relative',
          border: '2px solid ',
          borderColor: (theme) => theme.palette.primary.main,
          borderRight: getBorderColor(tableData),
          height: '100%',
        }}
      >
        <Table aria-label="inventory table" size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="span" sx={{ fontSize: '.8rem', padding: '0' }}>
                  Category
                </Typography>
              </TableCell>
              {Object.keys(tableData).map((date, index) => (
                <TableCell key={index} align="right">
                  <Typography variant="span" sx={{ fontSize: '.8rem', padding: '0' }}>
                    {date}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from(categories).map((category, index) => (
              <TableRow key={index} sx={{ height: '30px' }}>
                <TableCell component="th" scope="row" sx={{ fontSize: '.7rem' }}>
                  {category}
                </TableCell>
                {Object.keys(tableData).map((date, idx) => (
                  <TableCell key={idx} align="right" sx={{ fontSize: '.7rem' }}>
                    $
                    {Number(tableData[date]?.[category] || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </TableCell>
                ))}
              </TableRow>
            ))}

            {/* Grand Totals Row */}
            <TableRow sx={{ height: '30px' }}>
              <TableCell component="th" scope="row" align="left" sx={{ fontWeight: 'bold', fontSize: '.8rem' }}>
                Grand Totals
              </TableCell>
              {Object.keys(tableData).map((date, index) => (
                <TableCell key={index} align="right" sx={{ fontWeight: 'bold', fontSize: '.8rem' }}>
                  ${Number(calculateTotalForDate(date).toFixed(0)).toLocaleString()}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
        {Object.keys(tableData).length > 4 && (
          <Typography variant="body2" color="primary" sx={{ textAlign: 'right', padding: '8px' }}>
            (table extends right ➝)
          </Typography>
        )}
      </TableContainer>
    </Grid>
  );
}
