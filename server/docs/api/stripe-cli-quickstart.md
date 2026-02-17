# Stripe CLI Quick Start Guide

## 1. Install in PowerShell / Command Prompt

- Open **PowerShell**.
- Type these commands (replace `[path/to/stripe.exe]` with your actual path):
  1. `cd [path/to/stripe.exe]`  
     _(Just paste the direct path to the exe file into the prompt to install)_
  2. `./stripe.exe`
  3. `./stripe login`
  4. `./stripe listen --forward-to localhost:4242/api/v1/webhook`

---

## 2. Install Stripe Extension in VS Code

- Install the Stripe extension from the VS Code marketplace.
- Download the CLI, unzip, and move to your chosen directory:
  - [Stripe CLI Install Docs](https://docs.stripe.com/stripe-cli#install) (Windows install):
    1. Download the latest **Windows** zip file from [GitHub](https://github.com/stripe/stripe-cli/releases).
    2. Unzip the `stripe_X.X.X_windows_x86_64.zip` file.
    3. Add the path to the unzipped `stripe.exe` file to your **Path** environment variable.  
       To learn how to update environment variables, see the [Microsoft PowerShell documentation](https://docs.microsoft.com/en-us/powershell/scripting/setup/installing-windows-powershell).
       - _Tip: This is easy—search "environment variables" in Windows, open "Environment Variables", choose "Path" in User variables, click "Edit", and add the path of your directory (e.g., `C:\your\stripe\directory`)._
- Open Stripe extension settings in VS Code:
  - At the top, you'll find **Stripe: CLI Install Path**.
  - Paste in the path (right click > copy as path).
  - This should open a VS Code prompt to log in to Stripe—just follow the prompts.
