import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import { Box, Typography } from '@mui/material';

// TODO add to signup process pipeline.  Just playing around with display atm 10.20.24.  is set up to be a modal already just needs to be plugged in (in theory)

const TermsOfServiceModal = () => {
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked);
  };

  //   const handleAgree = () => {
  //     if (isChecked) {
  //       onAgree();
  //     }
  //   };

  return (
    // <Dialog>
    <>
      <DialogTitle>Terms of Service for At The Fire</DialogTitle>
      <DialogContent dividers>
        <h2>Terms of Service for At The Fire</h2>
        <Box
          style={{
            maxHeight: '75vh',
            overflowY: 'scroll',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
          }}
        >
          <Typography sx={{ margin: '0 0 30px 30px', textAlign: 'left' }}>
            Welcome to At The Fire! These Terms of Service (&quot;Terms&quot;) govern your use of
            our platform, so please read them carefully. By using At The Fire, you agree to be bound
            by these Terms, as well as our Privacy Policy.
          </Typography>
          <Typography variant="h5">1. Acceptance of Terms</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            By accessing or using At The Fire (&quot;Service&quot;), you agree to comply with and be
            bound by these Terms. If you do not agree with these Terms, please do not use our
            platform.
          </Typography>
          <Typography variant="h5">2. Description of Service</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            At The Fire is a subscription-based gallery platform where artists can showcase their
            collections and offer work for sale. Collectors are also welcome to subscribe and
            participate. The platform includes features such as business accounting tools, sales
            analysis, inventory tracking, and more.
          </Typography>
          <Typography variant="h5">3. Accounts and Subscription</Typography>
          <Typography sx={{ margin: '0px 0px 0 30px', textAlign: 'left' }}>
            <strong>Basic Account</strong>: Users can create a free account to manage their profile
            and access gallery features.
          </Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            <strong>Paid Subscription</strong>: Offers additional features such as content posting,
            sales analytics, inventory downloads, and more. You agree to provide accurate
            information during sign-up and keep your account details secure.
          </Typography>
          <Typography variant="h5">3.1 Account Responsibility</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activities that occur under your account. You must notify At The Fire
            immediately if you suspect any unauthorized use of your account.
          </Typography>
          <Typography variant="h5">4. User Conduct</Typography>
          <Typography sx={{ margin: '0px 0px 0px 30px', textAlign: 'left' }}>
            You agree to use At The Fire in a lawful and respectful manner. You must not:
          </Typography>
          <ul style={{ textAlign: 'left' }}>
            <li>Post any content that is unlawful, harmful, defamatory, or inappropriate.</li>
            <li>
              Attempt to gain unauthorized access to the Service or other users&apos; accounts.
            </li>
            <li>
              Use the platform for any illegal purposes, including but not limited to fraud or money
              laundering.
            </li>
          </ul>
          <Typography variant="h5">5. Payment and Refunds</Typography>
          <Typography variant="h6">5.1 Subscriptions</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            Our subscription fees are managed through Stripe. By subscribing, you authorize At The
            Fire to charge your payment method for applicable fees. All fees are non-refundable,
            except as required by applicable law.
          </Typography>
          <Typography variant="h6">5.2 Renewal and Cancellation</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            Subscriptions automatically renew unless canceled. You can cancel at any time through
            the Stripe Customer Portal, and you will retain access to the paid features until the
            end of your current billing period.
          </Typography>
          <Typography variant="h5">6. Intellectual Property Rights</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            All content and materials available on At The Fire, including text, graphics, logos, and
            code, are the intellectual property of At The Fire and its owners. You are not allowed
            to reproduce, distribute, or create derivative works based on our content without prior
            written consent.
          </Typography>
          <Typography variant="h5">7. Termination</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            We reserve the right to suspend or terminate your access to the Service at any time,
            without notice, for conduct that we believe violates these Terms or is harmful to other
            users or At The Fire.
          </Typography>
          <Typography variant="h5">8. Disclaimers and Limitation of Liability</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            At The Fire is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis. We
            make no warranties, express or implied, regarding the reliability or availability of the
            Service. To the fullest extent permitted by law, At The Fire and its team are not liable
            for any damages arising from your use of the Service.
          </Typography>
          <Typography variant="h5">9. Changes to Terms</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            We reserve the right to modify these Terms at any time. Changes will be posted on this
            page, and your continued use of the Service after the changes go live constitutes
            acceptance of the new Terms.
          </Typography>
          <Typography variant="h5">10. Governing Law</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            These Terms shall be governed by and construed in accordance with the laws of [Your
            Jurisdiction]. Any legal disputes shall be resolved in the courts of [Your
            Jurisdiction].
          </Typography>
          <Typography variant="h5">11. Privacy Policy</Typography>
          <Typography variant="body1">
            We value your privacy and are committed to protecting your personal information. This
            Privacy Policy explains how we collect, use, and safeguard your data:
          </Typography>
          <ul style={{ textAlign: 'left' }}>
            <li>
              <strong>Information Collection</strong>: We collect information you provide directly
              to us, such as when you create an account, post content, or subscribe to our services.
              We may also collect information automatically, such as your IP address and usage data.
            </li>
            <li>
              <strong>Use of Information</strong>: The information we collect is used to provide,
              maintain, and improve our services, process transactions, and communicate with you. We
              may also use your information to personalize your experience on At The Fire.
            </li>
            <li>
              <strong>Sharing of Information</strong>: We do not share your personal information
              with third parties except as necessary to provide our services (e.g., payment
              processing through Stripe) or as required by law.
            </li>
            <li>
              <strong>Security</strong>: We use industry-standard security measures to protect your
              information, including encryption and secure storage practices.
            </li>
            <li>
              <strong>Data Retention</strong>: We retain your personal information only as long as
              necessary to fulfill the purposes for which it was collected and to comply with legal
              obligations.
            </li>
          </ul>
          <Typography variant="h5">11. Contact Information</Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            If you have any questions or concerns regarding these Terms, please contact the
            development team through our{' '}
            <Button href="mailto:jktprod.dev@gmail.com">support email</Button>
          </Typography>
          <Typography sx={{ margin: '0px 0px 30px 30px', textAlign: 'left' }}>
            By using At The Fire, you acknowledge that you have read, understood, and agree to these
            Terms of Service.
          </Typography>
        </Box>
        <Box style={{ marginTop: '20px' }}>
          {/* <input
            type="checkbox"
            id="agreeCheckbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
          /> */}
          {/* <label htmlFor="agreeCheckbox" style={{ margin: '10px' }}>
            I agree to the Terms of Service
          </label> */}
        </Box>
        <Box style={{ marginTop: '20px', textAlign: 'right' }}></Box>
      </DialogContent>
      {/* <DialogActions>
        <FormControlLabel
          control={<Checkbox checked={isChecked} onChange={handleCheckboxChange} />}
          label="I agree to the Terms of Service"
        />
      </DialogActions> */}
    </>
    // </Dialog>
  );
};

export default TermsOfServiceModal;
