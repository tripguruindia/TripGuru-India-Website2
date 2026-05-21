export const getOptimizedCloudinaryUrl = (url: string, width = 600) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/')) {
    // Inject auto-format, auto-quality, crop to fill, and desired width limit
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_fill/`);
  }
  return url;
};
