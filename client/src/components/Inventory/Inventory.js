import React from 'react';
import './Inventory.css';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

const Inventory = ({ posts, onCategorySelect, selectedCategory }) => {
  const categories = {
    Beads: 0,
    'Blunt Tips': 0,
    Bubblers: 0,
    Collabs: 0,
    Cups: 0,
    'Dry Pieces': 0,
    Goblets: 0,
    'Iso Station': 0,
    Marbles: 0,
    Pendants: 0,
    Recyclers: 0,
    Rigs: 0,
    Slides: 0,
    'Spinner Caps': 0,
    'Terp Pearls': 0,
    Tubes: 0,
    Misc: 0,
  };

  const categoryTotalPrices = { ...categories };

  posts.forEach((post) => {
    if (categories[post.category] !== undefined && !post.sold) {
      categories[post.category]++;
      categoryTotalPrices[post.category] += parseFloat(post.price);
    }
  });

  const totalInventoryCount = Object.values(categories).reduce((a, b) => a + b, 0);
  const totalInventoryPrice = Object.values(categoryTotalPrices).reduce((a, b) => a + b, 0);

  const getColor = (count) => {
    if (count >= 5) return 'rgb(156, 112, 214)';
    switch (count) {
      case 4:
        return 'rgb(129, 129, 255)';
      case 3:
        return 'rgb(0, 163, 63)';
      case 2:
        return 'rgb(216, 209, 0)';
      case 1:
        return 'orange';
      case 0:
        return 'red';
      default:
        return '';
    }
  };

  return (
    <Box
      sx={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: (theme) => theme.palette.primary.dark,
        paddingX: (theme) => theme.spacing(2),
        paddingY: (theme) => theme.spacing(2),
        borderRadius: (theme) => theme.spacing(1),
        gap: (theme) => theme.spacing(2),
      }}
      className="inventory-container"
    >
      {' '}
      <Typography variant="body1">Inventory Totals:</Typography>
      <Table
        className="inventory-table"
        sx={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: (theme) => theme.palette.primary.light,
          backgroundColor: (theme) => theme.palette.background.default, // Background color based on theme
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell component="th" style={{ width: '40%' }}>
              Category
            </TableCell>
            <TableCell component="th" style={{ width: '20%' }}>
              Total Items
            </TableCell>
            <TableCell component="th" style={{ width: '40%' }}>
              Total Price
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(categories).map((category) => (
            <TableRow
              key={category}
              className={selectedCategory === category ? 'selectedRow' : ''}
              onClick={() => {
                onCategorySelect(category);
              }}
            >
              <TableCell
                style={{
                  color: getColor(categories[category]),
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onCategorySelect(category);
                }}
              >
                {category}
              </TableCell>
              <TableCell
                style={{
                  color: getColor(categories[category]),
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onCategorySelect(category);
                }}
              >
                {categories[category]}
              </TableCell>
              <TableCell
                style={{
                  color: getColor(categories[category]),
                  textAlign: 'right',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onCategorySelect(category);
                }}
              >
                ${Number(categoryTotalPrices[category].toFixed(0)).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
          <TableRow style={{ fontWeight: 'bold' }}>
            <TableCell style={{ textAlign: 'center' }}>Total</TableCell>
            <TableCell style={{ textAlign: 'center' }}>{totalInventoryCount}</TableCell>
            <TableCell style={{ textAlign: 'right' }}>
              ${Number(totalInventoryPrice.toFixed(2)).toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
};

export default Inventory;
