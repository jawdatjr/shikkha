# Ashik Shikkha — Firebase activation (Project: shikkha-31810)

IMPORTANT: Source code has been connected to this Firebase project, but cloud sync does not work until Authentication, Firestore, security rules, and approved member accounts have been enabled in the Firebase Console. DO NOT use Firestore's open/test-mode security rules for customer data.

## 1. Firebase Authentication: create accounts

- Go to https://console.firebase.google.com/project/shikkha-31810/authentication/providers
- Enable **Email/Password** as a sign-in method.
- In Authentication → Users → Add user, create the OWNER account with an email and strong password. Copy the UID shown for that user.
- Add one DIFFERENT email/password account for each salesman; copy their individual Firebase Auth UIDs.
- Do not send or commit passwords, Admin SDK keys, or service account keys.

## 2. Firestore: create a production database and publish rules

- Open https://console.firebase.google.com/project/shikkha-31810/firestore
- Create a **Cloud Firestore** database. Choose the locked/production starting rules rather than public test-mode access.
- Open Firestore Database → Rules. Copy the full contents of [firestore.rules](./firestore.rules) from this repository; click Publish.
- Alternative CLI deployment from this repo root: firebase login, then firebase deploy --only firestore:rules --project shikkha-31810.
- Firestore Database → Data → Start collection, use Collection ID **members**.
- Owner's document ID must be the EXACT UID from Authentication → Users. Add three fields:
  - active — Boolean — true
  - role — String — owner
  - displayName — String — Owner (or your name)
- For each salesman, add a separate document in **members** with their UID and the three fields: active = true (Boolean), role = salesman (String), displayName = that person's name (String).
- To revoke a user, change their active field to false and disable their Firebase Authentication account.
- Do not allow users to create or update their own membership documents.

## 3. First migration: one primary phone first

1. Ensure GitHub Pages has deployed the latest main branch: https://jawdatjr.github.io/shikkha/
2. On the PRIMARY phone that holds the correct/current company ledger, export a JSON Backup from Settings and keep it in a safe location.
3. Reload the app online; close and reopen the installed PWA if an older version is still cached.
4. Open Settings → Firebase and sign in with the approved owner email/password.
5. Press **এখনই Sync** until it shows success and Pending 0.
6. In Firebase Console, confirm the **events** and **heads** collections have the expected records. Never enter real customer records manually.
7. Only after confirming step 6, sign in on a second phone with its own salesman account and Sync. Verify that receipts and expenses appear correctly.
8. Make a small TEST receipt and TEST expense on the second phone and confirm both reach the first phone. Delete the test records with reasons to verify the audit history.

First-time login on each phone prepares its current local records as a Firebase migration queue. **Migrate one authoritative phone first.** Other phones with competing old records may produce conflicts. Back up JSON before choosing which version to keep. The old Worker URL and GitHub secret tokens are not used by this Firebase version.

## 4. How it works

- This app is a static, offline-first GitHub Pages PWA. The Firebase browser module is firebase-sync.js.
- The supplied Firebase Web App config is intentionally public browser configuration; it is NOT a server/admin credential.
- A receipt or expense is stored on the phone before any sync attempt. Online authenticated sync writes each queued event in a Firestore transaction, with immutable event records and the latest head for each receipt/expense.
- Firebase security rules require BOTH a real Firebase Auth session AND an administrator-created members/UID document marked active with role owner or salesman.
- All approved salesmen share ONE company ledger, not separate private per-salesman ledgers.
- Remote updates are read in pages, and changes to the same receipt generate a conflict instead of silently overwriting another phone.
- First login and online sync need an internet connection. Offline local saves remain available. A previously installed PWA may need to reload online to fetch the Firebase SDK.
- **Logging out does not erase customer records cached on the device.** Keep phones screen-locked, avoid shared browsers and maintain separate regular JSON backups.
- This is a small-team implementation: very large histories eventually need more advanced history pagination, role management, storage and restore tooling.
- Firebase costs depend on usage, account plan, and quotas. Review Firestore usage regularly.

## 5. Troubleshooting

- Permission denied: publish firestore.rules, check members/UID exists and active is Boolean true, and role is exactly owner or salesman.
- auth/operation-not-allowed: enable Email/Password in Authentication → Sign-in method.
- auth/invalid-credential: check the user's email and password.
- SDK unavailable: reload while online; normal local offline receipt functionality does not depend on a signed-in session.
- Conflicts: make a JSON backup before choosing the local or cloud version in Settings.
- Pending queue greater than zero: online sign-in is required; view the Settings sync status for the error.
- Firebase Authentication → Settings → Authorized domains: add jawdatjr.github.io if a configured sign-in or account recovery flow requires this hosting domain.

SECURITY: Committing firestore.rules to GitHub does NOT deploy them to the Firebase project. The owner must publish them in the Firebase Console (or deploy with their Firebase CLI login). Never deploy permissive test rules.
