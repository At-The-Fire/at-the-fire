import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const BASE_URL = process.env.REACT_APP_BASE_URL;

// fetch all products from database
export async function fetchProducts() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/quota-tracking`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw {
        code: data.code || resp.status,
        message: data.message || `Error fetching products: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching products:', error);
    }
    throw error;
  }
}

// create new product in database
export async function postProducts({
  type,
  date,
  title,
  description,
  category,
  price,
  image_url,
  public_id,
  num_days,
  post_id,
  sold,
  date_sold,
  sales,
  qty,
}) {
  date = new Date(date);
  const milliseconds = date.getTime();
  date = Number(milliseconds);

  try {
    const resp = await fetch(`${BASE_URL}/api/v1/quota-tracking`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        date,
        title,
        description,
        category,
        price,
        image_url,
        public_id,
        num_days,
        post_id,
        sold,
        date_sold,
        sales,
        qty,
      }),
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const msg = await resp.json();
    if (!resp.ok) {
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error creating new product: Status ${resp.status}`,
        type: msg.type || 'UnknownError',
      };
    }

    return msg;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
}

// edit existing product in database
export async function editProducts({
  type,
  date,
  title,
  description,
  category,
  price,
  image_url,
  public_id,
  id,
  num_days,
  post_id,
  sold,
  date_sold,
  sales,
  qty,
}) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/quota-tracking/${id}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        date,
        title,
        description,
        category,
        price,
        image_url,
        public_id,
        num_days,
        post_id,
        sold,
        date_sold,
        sales,
        qty,
      }),
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const msg = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error editing product: Status ${resp.status}`,
        type: msg.type || 'UnknownError',
      };
    }

    return msg;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
}

export async function deleteProduct(id) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/quota-tracking/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const msg = resp.status;
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error deleting product: Status ${resp.status}`,
        type: msg.type || 'UnknownError',
      };
    }

    return msg;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
}

//upload image[0] to S3
export function uploadProductImage(image) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('imageFiles', image[0], image[0].name);

    // Create the toast immediately with a unique ID
    const toastId = toast.loading('Uploading product image...', {
      progress: 0,
      theme: 'dark',
      autoClose: false,
    });

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = event.loaded / event.total;
        toast.update(toastId, {
          progress,
          theme: 'dark',
          isLoading: true,
        });
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status === 200) {
        const resultObject = JSON.parse(xhr.responseText);
        const result = resultObject.files;

        // Update toast to success state
        toast.update(toastId, {
          isLoading: false,
          type: 'success',
          render: 'Product image uploaded!',
          autoClose: 3000,
          progress: 1,
          closeButton: true,
          draggable: true,
          draggablePercent: 60,
        });

        resolve(result);
      } else {
        if (xhr.status === 401) {
          toast.update(toastId, {
            isLoading: false,
            type: 'error',
            render: 'Unauthorized',
            autoClose: 3000,
          });
          resolve(null);
        } else {
          const resultObject = JSON.parse(xhr.responseText);
          let errorMessage = resultObject.message.includes('File size too large')
            ? 'Your image is too large, please resize and try again.'
            : `Error updating product image: ${resultObject.message || `Status ${xhr.status}`}`;

          toast.update(toastId, {
            isLoading: false,
            type: 'error',
            render: errorMessage,
            autoClose: 3000,
          });
          reject(new Error(errorMessage));
        }
      }
    });

    xhr.addEventListener('error', () => {
      toast.update(toastId, {
        isLoading: false,
        type: 'error',
        render: 'Upload failed',
        autoClose: 3000,
      });
      reject(new Error('Network error'));
    });

    xhr.open('POST', `${BASE_URL}/api/v1/dashboard/upload`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

// POST sales to a product by ID
export async function postProductSales({ id, quantitySold, dateSold }) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/quota-tracking/${id}/sales`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        quantitySold,
        dateSold,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw {
        code: data.code || resp.status,
        message: data.message || `Error posting sales: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error posting product sales:', error);
    }
    throw error;
  }
}

export async function deleteProductSales(id, saleId) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/quota-tracking/${id}/sales/${saleId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    let data = null;
    if (resp.status !== 204) {
      data = await resp.json();
    }

    if (!resp.ok) {
      throw {
        code: data.code || resp.status,
        message: data.message || `Error deleting product sales: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error deleting product sales:', error);
    }
    throw error;
  }
}
