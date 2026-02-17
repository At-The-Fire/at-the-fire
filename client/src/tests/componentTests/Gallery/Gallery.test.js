import { render } from '@testing-library/react';
import Gallery from '../../../components/Gallery/Gallery.js';
import { LoadingProvider } from '../../../context/LoadingContext.js';
// import { AccountProvider } from '../../../context/AccountContext.js';
import { QueryProvider } from '../../../context/QueryContext.js';
test.skip('renders gallery component', () => {
  render(
    <LoadingProvider>
      {/* <AccountProvider> */}
      <QueryProvider>
        <Gallery />
      </QueryProvider>
      {/* </AccountProvider> */}
    </LoadingProvider>
  );
  const galleryHtml = document.body.innerHTML;
  expect(galleryHtml).toMatchInlineSnapshot(
    `"<div><div class=\\"gallery-wrapper MuiBox-root css-0\\"><div class=\\"MuiContainer-root MuiContainer-maxWidthXl gallery-container css-19r6kue-MuiContainer-root\\"><ul class=\\"MuiList-root MuiList-padding css-1gddhur-MuiList-root\\"><div class=\\"MuiGrid-root MuiGrid-container MuiGrid-spacing-xs-1 css-a5rdam-MuiGrid-root\\"></div></ul></div></div></div>"`
  );
});
