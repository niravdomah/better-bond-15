# Screen: Sign In

## Purpose
Credentials-based authentication entry point. Unauthenticated users land here via next-auth middleware redirect; successful sign-in redirects to Dashboard.

## Wireframe

```
+============================================================+
|  [Navy top bar — MortgageMax logo left, no nav links]      |
|  [MortgageMax logo]                                        |
+============================================================+
|                                                            |
|                                                            |
|              +----------------------------------+          |
|              |  MortgageMax                     |          |
|              |  Commission Payments             |          |
|              |                                  |          |
|              |  Sign in to your account         |          |
|              |  ──────────────────────────────  |          |
|              |                                  |          |
|              |  Username                        |          |
|              |  [________________________]      |          |
|              |                                  |          |
|              |  Password                        |          |
|              |  [________________________]      |          |
|              |                                  |          |
|              |  ! Invalid credentials.          |          |
|              |    Please try again.             |          |
|              |  (error — only shown on failure) |          |
|              |                                  |          |
|              |  [     Sign in     ]  (primary)  |          |
|              |                                  |          |
|              +----------------------------------+          |
|                                                            |
|                                                            |
+============================================================+
```

## Elements

| Element | Type | Description |
|---------|------|-------------|
| MortgageMax logo | Image | Top-left in navy bar; no nav links on sign-in page |
| Card | Container | Centered, max-w-sm; houses the entire sign-in form |
| Card title | Text (h1 equivalent) | "MortgageMax Commission Payments" |
| Card subtitle | Text | "Sign in to your account" |
| Username field | Input (text) | Label "Username"; maps to next-auth credentials `username` field |
| Password field | Input (password) | Label "Password"; maps to next-auth credentials `password` field |
| Error message | Alert (destructive) | Shown only when next-auth returns an error (e.g. CredentialsSignin); text: "Invalid credentials. Please try again." |
| Sign in button | Button (primary, full-width) | Submits the credentials form; label "Sign in" |

## User Actions

- Enter username and password then click "Sign in": next-auth credentials callback fires; on success, user is redirected to `/` (Dashboard); on failure, error message appears below the password field.
- Press Enter in any field: triggers form submission (standard HTML form behaviour).

## Navigation

- **From:** Any unauthenticated route — next-auth middleware redirects here automatically.
- **To:** Dashboard — on successful sign-in.

## States

| State | Visual |
|-------|--------|
| Default | Empty form, no error banner |
| Loading | Sign in button shows spinner / disabled while next-auth is processing |
| Error | Red error banner beneath password field with message "Invalid credentials. Please try again." |
