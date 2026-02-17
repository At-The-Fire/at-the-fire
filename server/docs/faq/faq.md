# FAQ & Troubleshooting

This document answers common questions and provides solutions to frequent issues encountered by developers and users.

---

## Common Issues

### Why can't I log in?

- Check AWS Cognito credentials and token expiration
- Ensure cookies are enabled in your browser

### Why is my subscription not updating?

- Confirm Stripe webhook events are being received
- Check logs for errors in subscription update logic

### Why is my gallery/profile not updating?

- Cached data may not have expired yet; try clearing Redis or waiting for cache expiration
- Check for errors in the relevant controller

### What does error XYZ mean?

- See error handling and logging docs for error code explanations

## How do I reset my password?

- Use the "Forgot Password" flow on the login page (handled by AWS Cognito)

## How do I run the server locally?

- See the Environment & Deployment Guide

---

For more, see the relevant docs or ask in the team chat.
