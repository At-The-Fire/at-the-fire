import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';

const BASE_URL = process.env.REACT_APP_BASE_URL;
//^ Data functions ---------------------------------------

// get all posts from database and display on dashboard page
export async function fetchPosts() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const data = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error fetching posts: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in fetchPosts:', error);
    }
    throw error;
  }
}

// create new post in database
export async function postPost(title, description, image_url, category, price, public_id, num_imgs, sold, date_sold) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        image_url,
        category,
        price,
        public_id,
        num_imgs,
        sold,
        date_sold,
      }),
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const msg = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error creating new post: Status ${resp.status}`,
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

//upload image urls and public ids to db
export async function postAddImages(imageFiles, id) {
  try {
    const formData = new FormData();
    formData.append('image_urls', JSON.stringify(imageFiles?.map((image) => image.secure_url)));
    formData.append('image_public_ids', JSON.stringify(imageFiles?.map((image) => image.public_id)));
    formData.append('resource_types', JSON.stringify(imageFiles?.map((image) => image.resource_type)));
    // Append the id to the formData
    formData.append('id', id);

    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/images`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const msg = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error adding images: Status ${resp.status}`,
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

// function for transferring main image from gallery_posts to post_imgs
export async function transferProductPic(postId) {
  // TODO look into this... maybe the cause of the double img thing happening in create a post from quota tracking

  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/transfer`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId,
      }),
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const msg = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error fetching products: Status ${resp.status}`,
        type: msg.type || 'UnknownError',
      };
    }
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error transferring images');
    }
  }
}

// delete single post from database
export async function deleteById(post_id) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/${post_id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: resp.code || resp.status,
        message: resp.message || `Error deleting post: Status ${resp.status}`,
        type: resp.type || 'UnknownError',
      };
    }
    return resp;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
}

// edit post called from EditPost
export async function updatePost(id, post) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/${id}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, post }),
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const msg = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error updating post: Status ${resp.status}`,
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

// update thumbnail on post & product
export async function updatePostMainImage(postId, newImageUrl, newPublicId) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/posts/${postId}/main-image`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: newImageUrl,
        public_id: newPublicId,
      }),
      credentials: 'include',
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error updating main image: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }
    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error updating post main image:', error);
    }
    throw error;
  }
}

// return post detail (no image urls aside from the first one)
export async function getPostDetail(id) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/${id}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const postData = await resp.json();
    if (!resp.ok) {
      useAuthStore.getState().setError(postData.code);
      throw {
        code: postData.code || resp.status,
        message: postData.message || `Error getting post detail: Status ${resp.status}`,
        type: postData.type || 'UnknownError',
      };
    }

    return postData;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
}

//^ S3 functions ---------------------------------------

//  Upload image files to S3
export const uploadImagesAndCreatePost = async (imageFiles, formFunctionMode) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    imageFiles.forEach((file) => formData.append('imageFiles', file, file.name));

    // Create the toast immediately with a unique ID
    const toastId = toast.loading('Uploading images...', {
      progress: 0,
      autoClose: false,
      theme: 'dark',
    });

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = event.loaded / event.total;
        toast.update(toastId, {
          progress,
          isLoading: true,
          theme: 'dark',
        });
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status === 200) {
        // Parse the response
        const data = JSON.parse(xhr.responseText);
        const result = data.files;
        const image_urls = result.map((image) => image.secure_url);
        const public_ids = result.map((image) => image.public_id);

        // Update toast to success state
        toast.update(toastId, {
          isLoading: false,
          type: 'success',
          render: 'Images uploaded!',
          autoClose: 3000,
          progress: 1,
          closeButton: true,
          draggable: true,
          draggablePercent: 60,
        });

        // Your existing logic for handling the response
        if (formFunctionMode === 'new') {
          const additionalImages = result.map((image) => ({
            public_id: image.public_id,
            secure_url: image.secure_url,
            resource_type: image.resource_type,
          }));

          const newPost = {
            image_url: image_urls[0],
            public_id: public_ids[0],
            additionalImages,
          };
          resolve(newPost);
        } else {
          const newImages = result.map((image) => ({
            secure_url: image.secure_url,
            public_id: image.public_id,
            resource_type: image.resource_type,
          }));
          const editedPost = {
            newImages,
            additionalImages: [],
          };
          resolve(editedPost);
        }
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
          try {
            const errorData = JSON.parse(xhr.responseText);
            toast.update(toastId, {
              isLoading: false,
              type: 'error',
              render: errorData.message || 'Upload failed',
              autoClose: 3000,
            });
            reject(new Error(errorData.message || `Upload failed: ${xhr.status}`));
          } catch (parseError) {
            if (process.env.REACT_APP_APP_ENV === 'development') {
              console.error('Error parsing error response:', parseError, 'Raw response:', xhr.responseText);
            }
            toast.update(toastId, {
              isLoading: false,
              type: 'error',
              render: 'Upload failed',
              autoClose: 3000,
            });
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
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
};

// Upload user avatar image file to S3
export const uploadAvatarImage = async (formData) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Create the toast immediately with a unique ID
    const toastId = toast.loading('Uploading avatar...', {
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
        const result = JSON.parse(xhr.responseText);
        // Update one last time and allow it to close
        toast.update(toastId, {
          isLoading: false,
          type: 'success',
          render: 'Avatar uploaded!',
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
          const error = new Error(`Upload failed: ${xhr.status}`);
          toast.update(toastId, {
            isLoading: false,
            type: 'error',
            render: 'Avatar upload failed',
            autoClose: 3000,
          });
          reject(error);
        }
      }
    });

    xhr.addEventListener('error', () => {
      toast.update(toastId, {
        isLoading: false,
        type: 'error',
        render: 'Avatar upload failed',
        autoClose: 3000,
      });
      reject(new Error('Network error'));
    });

    xhr.open('POST', `${BASE_URL}/api/v1/profile/avatar-upload`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
};
// Upload customer logo  image file to S3
export const uploadLogoImage = async (formData) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Create unique toast for logo upload
    const toastId = toast.loading('Uploading logo...', {
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
        const result = JSON.parse(xhr.responseText);
        // Update one last time and allow it to close
        toast.update(toastId, {
          isLoading: false,
          type: 'success',
          render: 'Logo uploaded!',
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
          const error = new Error(`Upload failed: ${xhr.status}`);
          toast.update(toastId, {
            isLoading: false,
            type: 'error',
            render: 'Logo upload failed',
            autoClose: 3000,
          });
          reject(error);
        }
      }
    });

    xhr.addEventListener('error', () => {
      toast.update(toastId, {
        isLoading: false,
        type: 'error',
        render: 'Avatar upload failed',
        autoClose: 3000,
      });
      reject(new Error('Network error'));
    });

    xhr.open('POST', `${BASE_URL}/api/v1/profile/logo-upload`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
};

export const deleteImage = async (public_id, resource_type) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/delete`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_id: public_id, resource_type: resource_type }),
    });

    // Check if the server responded with a non-200 status
    const result = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error deleting image: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }
    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};

// Delete avatar image from S3
export const deleteAvatarImage = async (publicId, resourceType) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/profile/avatar-delete`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_id: publicId, resource_type: resourceType }),
    });

    // Check if the server responded with a non-200 status
    const result = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error deleting avatar image: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }

    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};

// Delete logo image from S3
export const deleteLogoImage = async (publicId, resourceType) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/profile/logo-delete`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_id: publicId, resource_type: resourceType }),
    });

    // Check if the server responded with a non-200 status
    const result = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error deleting logo image: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }

    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};

//^ Image data in our DB ---------------------------------------

// delete single image data from db
export const deleteImageData = async (id, public_id) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/image/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_id: public_id }),
    });

    // Check if the server responded with a non-200 status
    const result = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error deleting image data: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }

    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};

// Get additional image urls from in db
export const getAdditionalImageUrlsPublicIds = async (id) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/urls/${id}`, {
      method: 'GET',
      credentials: 'include',
    });
    // Check if the server responded with a non-200 status
    const result = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error getting addition image data: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }
    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};

//^ Public routes for gallery ---------------------------------------

// Public route for fetch all posts
export const fetchGalleryPosts = async () => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/main-gallery`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const result = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error fetching gallery posts: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }

    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};

// Public route for post detail
export async function getGalleryPostDetail(id) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/gallery-posts/${id}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const msg = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error fetching post detail: Status ${resp.status}`,
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

// Public route GET all image Urls for gallery post (id)
export const getAdditionalImageUrlsPublicIdsGallery = async (id) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/gallery-posts/urls/${id}`, {
      method: 'GET',
    });

    const result = await resp.json();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error fetching additional gallery image data: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }

    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};

// TODO make equivalent for other tabs...
// Download inventory CSV file ---------------------------------------
export async function downloadInventoryCSV() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/dashboard/download-inventory-csv`, {
      credentials: 'include',
    });

    const blob = await resp.blob();
    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: blob.code || resp.status,
        message: blob.message || `Error downloading .csv file: Status ${resp.status}`,
        type: blob.type || 'UnknownError',
      };
    }

    // Generate filename with current date
    const dateNow = new Date()
      .toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
      .replace(/\//g, '-');
    const filename = `inventory_${dateNow}.csv`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error during fetch or download:', error);
    }
    throw error;
  }
}

// Utility: Determine if a product (including batch) is fully sold
export function isProductSold(product) {
  const qty = Number(product.qty) || 1;
  const totalSold = (product.sales || []).reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
  if (qty > 1) {
    return totalSold >= qty;
  } else {
    return Array.isArray(product.sales) && product.sales.length > 0;
  }
}
