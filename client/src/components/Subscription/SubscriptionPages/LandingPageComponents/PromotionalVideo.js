import React from 'react';

const PromotionalVideo = () => {
  const videoUrl = 'https://d5fmwpj8iaraa.cloudfront.net/atf-assets/at-the-fire-subscription-2.mp4';
  return (
    <video
      style={{ boxShadow: '1px 1px 15px 5px #FFFFFF32' }}
      controls
      width="100%"
      poster="https://d5fmwpj8iaraa.cloudfront.net/atf-assets/logo-icon-6-512+x+911.png"
    >
      <source src={videoUrl} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
};

export default PromotionalVideo;
