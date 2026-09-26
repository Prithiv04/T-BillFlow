# IMPORTANT: MANUAL VERIFICATION IS REQUIRED

Do NOT rely only on terminal commands, tests, lint, or build output.

After fixing the code, manually open and use the application in a real browser.

## MANUAL BROWSER CHECK

Start the frontend and actually inspect the UI yourself.

Do NOT just assume that:

`npm run build = working`

or:

`tests passed = frontend working`

Manually check the application.

### Check every important page

Open and inspect:

* Dashboard / Overview
* Portfolio
* Mandates
* RWA
* Agent
* Executions

For each page:

* Does it load correctly?
* Is the layout correct?
* Is any text missing?
* Are there broken buttons?
* Are there broken links?
* Are there empty/error states that should not be there?
* Are cards/tables/data displayed correctly?
* Is anything overlapping or visually broken?
* Does the page work after refresh?

## MANUALLY TEST INTERACTIONS

Actually click the important buttons and controls.

Check:

* navigation links
* wallet connect
* wallet/network UI
* Demo Mode
* Live Mode
* agent actions
* execution actions
* mandate interactions
* RWA state interactions
* portfolio interactions

Do not just inspect the source code.

If an action is supposed to produce a UI change, actually perform it and verify the result.

## DEMO MODE

Manually enable/use Demo Mode.

Verify:

* UI clearly shows Demo Mode
* demo data behaves correctly
* demo execution flow works
* no real transaction is accidentally triggered
* pages remain stable while navigating

## LIVE MODE

Manually inspect/use Live Mode where safe.

Verify:

* UI clearly shows Live Mode
* wallet/network information is correct
* existing Arbitrum Sepolia configuration is used
* transaction flow behaves correctly
* errors are shown clearly if a transaction cannot be completed

Do NOT send unnecessary real transactions just for testing.

Do NOT modify deployed contracts.

## WALLET

Manually test the existing wallet connection flow.

Check:

* connect button
* wallet modal
* network selection
* connected state
* disconnected state
* account/address display
* error handling

If the external wallet provider has a configuration problem, identify it clearly rather than hiding it.

## BROWSER CONSOLE

While manually using the application, keep the browser developer console open.

Look for:

* hydration errors
* uncaught exceptions
* React errors
* failed API requests
* failed RPC requests
* failed wallet requests
* repeated errors
* unexpected warnings

The known `DEMO` vs `LIVE` hydration mismatch MUST be fixed and manually verified.

## REFRESH TEST

For every important page:

1. Open the page.
2. Refresh the browser.
3. Wait for the application to fully load.
4. Check that the UI remains correct.
5. Check the console again.

This is especially important for the Demo/Live runtime state because the current project has already shown a server/client mismatch.

## RESPONSIVE / VISUAL CHECK

At minimum, manually check:

* normal desktop browser size
* smaller browser width

Look for:

* overflowing content
* broken sidebar
* overlapping cards
* clipped text
* broken tables
* unusable buttons

Do not redesign the UI.

Only fix obvious existing UI bugs that prevent proper use.

## FINAL MANUAL RESULT

Report manual verification separately from automated tests.

Example:

### Manual Browser Verification

* Dashboard: PASS
* Portfolio: PASS
* Mandates: PASS
* RWA: PASS
* Agent: PASS
* Executions: PASS
* Navigation: PASS
* Demo Mode: PASS
* Live M
