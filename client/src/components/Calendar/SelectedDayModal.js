import { useState } from 'react';
import { Box, Button, Card, CardContent, Fade, Grid, Modal, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';

export default function SelectedDayModal({ openModal, setOpenModal, selectedDayProducts, formatDate, getTextColor }) {
  const [openImageModal, setOpenImageModal] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const navigate = useNavigate();

  const handleImageClick = (imageUrl) => {
    setModalImage(imageUrl);
    setOpenImageModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };
  const handleCloseImageModal = () => {
    setOpenImageModal(false);
  };

  const calculateShelfTime = (product) => {
    const creationDate = new Date(parseInt(product.date));
    if (product.sold && !product.date_sold) return null;
    const endDate = product.sold ? new Date(parseInt(product.date_sold)) : new Date();
    const diffTime = Math.abs(endDate - creationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <Modal open={openModal} onClose={() => setOpenModal(false)} closeAfterTransition>
        <Fade in={openModal}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              bgcolor: 'background.paper',
              boxShadow: 24,
              p: 4,
              overflowY: 'auto',
              maxHeight: '80%',
            }}
          >
            {' '}
            <IconButton onClick={handleCloseModal} sx={{ position: 'absolute', top: 8, right: 8 }}>
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" gutterBottom>
              {selectedDayProducts.length === 0 ? 'No products selected' : ' '}
              {selectedDayProducts.length > 0 && formatDate(selectedDayProducts[0].date)}
            </Typography>
            <Box>
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
                      selectedDayProducts.reduce((acc, product) => acc + parseFloat(product.price || 0), 0) < 0
                        ? 'red'
                        : 'inherit',
                  }}
                >
                  $
                  {selectedDayProducts
                    .reduce((acc, product) => acc + parseFloat(product.price * product.qty || 0), 0)
                    .toLocaleString()}
                </span>
              </Typography>
            </Box>
            {selectedDayProducts.map((product) => (
              <Card
                key={product.id}
                sx={{
                  marginBottom: '10px',
                  padding: '10px',
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
                        onClick={() => handleImageClick(product.image_url)}
                      />
                    </Grid>
                    <Grid item xs={9}>
                      <Grid container>
                        <Grid item xs={9}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              lineHeight: '1.2',
                              textAlign: 'left',
                              fontWeight: 'bold',
                            }}
                          >
                            {product.title === null ? 'Prep/ Other' : product.title}
                          </Typography>
                        </Grid>
                        <Grid item xs={1}></Grid>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            lineHeight: '1.2',
                            textAlign: 'right',
                            display: 'flex',
                            fontWeight: 'bold',
                            marginTop: '2px',
                            color: (theme) => (product.price < 0 ? 'red' : theme.palette.primary.light),
                          }}
                        >
                          ${product.price}
                        </Typography>
                      </Grid>
                      <Grid container spacing={0} sx={{ marginTop: '10px' }}>
                        <Grid item xs={5} sx={{ border: '1px solid white', marginBottom: '5px' }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              lineHeight: '1',
                              textAlign: 'center',
                              textTransform: 'capitalize',
                              color: 'text.primary',
                              fontWeight: 'bold',
                              marginBottom: '5px',
                              // fontSize: '.95rem',
                              paddingTop: '3px',
                            }}
                          >
                            {product.type}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ lineHeight: '1', textAlign: 'left' }}></Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                            Quantity:
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                            {product.qty}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                            Duration:{' '}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ lineHeight: '1.5', textAlign: 'left' }}>
                            {product.num_days === '1' ? `${product.num_days} day` : `${product.num_days} days`}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
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
                            }}
                          >
                            ${parseFloat(product.price / product.num_days).toFixed(0)} / day
                          </Typography>
                        </Grid>
                        {product.type !== 'prep-other' && (
                          <>
                            <Grid item xs={4}>
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
                                }}
                              >
                                {product.sold ? 'Sold' : 'Available'}
                              </Typography>
                            </Grid>
                            <Grid item xs={4}>
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
                    <Grid
                      item
                      xs={12}
                      sx={{
                        lineHeight: '1.2',
                        marginLeft: '0px',
                        marginRight: '0px',
                        paddingTop: '200px',
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          lineHeight: '1.5',
                          textAlign: 'left',
                          borderTop: '1px solid white',
                          paddingTop: '10px',
                        }}
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
                          sx={{ mt: 1, mb: 1 }}
                          onClick={() => {
                            navigate(`/dashboard/edit/${product.post_id}`);
                            setOpenModal(false);
                          }}
                        >
                          Edit Gallery Post
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                sx={{ marginTop: '10px' }}
                onClick={() => setOpenModal(false)}
              >
                Close
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>

      <Modal open={openImageModal} onClose={handleCloseImageModal}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <IconButton onClick={handleCloseImageModal} sx={{ position: 'absolute', top: 8, right: 8 }}>
            <CloseIcon />
          </IconButton>
          <Box component="img" src={modalImage} alt="Product Image" sx={{ width: '100%' }} />
        </Box>
      </Modal>
    </>
  );
}
