# Feature Specification: Authentication & Authorization System

**Feature Branch**: `001-authentication-system`  
**Created**: 2025-11-15  
**Status**: Implemented  
**Domain**: Authentication & Security

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Basic Email/Password Authentication (Priority: P1)

Users need a simple way to create accounts and log in using email and password credentials.

**Why this priority**: Foundation for all authenticated features. Without this, no user management is possible.

**Independent Test**: Can be fully tested by creating an account with email/password and logging in. Delivers immediate value by securing access to the application.

**Acceptance Scenarios**:

1. **Given** a new user on the signup page, **When** they provide valid email and password, **Then** their account is created and they receive a welcome email
2. **Given** an existing user on login page, **When** they enter correct credentials, **Then** they are redirected to dashboard with active session
3. **Given** a user entering wrong password, **When** they attempt login, **Then** they see "Invalid credentials" error without revealing which field is wrong
4. **Given** signup restrictions are enabled, **When** an unauthorized email attempts signup, **Then** they see "Signup restricted" error

---

### User Story 2 - OAuth Social Login (Priority: P1)

Users want to quickly sign in using their existing Google or GitHub accounts without creating new passwords.

**Why this priority**: Reduces friction for new users and improves security by delegating to trusted OAuth providers.

**Independent Test**: Can be tested by clicking "Sign in with Google/GitHub" and successfully authenticating. Works independently of password auth.

**Acceptance Scenarios**:

1. **Given** a user on login page, **When** they click "Sign in with Google", **Then** they are redirected to Google OAuth flow and logged in on success
2. **Given** a user on login page, **When** they click "Sign in with GitHub", **Then** they are redirected to GitHub OAuth flow and logged in on success
3. **Given** a new OAuth user, **When** they complete OAuth flow, **Then** their account is created with email and profile image from provider
4. **Given** existing OAuth user, **When** they sign in again, **Then** their existing account is linked without creating duplicate

---

### User Story 3 - Magic Link Email Authentication (Priority: P2)

Users want to log in by clicking a link sent to their email without remembering passwords.

**Why this priority**: Provides passwordless alternative for users who prefer email verification. Enhances security by eliminating password reuse.

**Independent Test**: Can be tested by requesting magic link, receiving email, and clicking link to authenticate. Fully independent feature.

**Acceptance Scenarios**:

1. **Given** a user on login page, **When** they enter email and request magic link, **Then** they receive email with sign-in link
2. **Given** a magic link email, **When** user clicks the link within expiry time, **Then** they are logged in and redirected to dashboard
3. **Given** an expired magic link, **When** user clicks it, **Then** they see "Link expired" error with option to request new link
4. **Given** a magic link for non-existent account, **When** clicked, **Then** system creates new account and logs them in

---

### User Story 4 - TOTP Two-Factor Authentication (Priority: P2)

Security-conscious users want to add an extra layer of protection using time-based one-time passwords (authenticator apps).

**Why this priority**: Critical for admin users and users managing sensitive devotional content. Not required for basic usage.

**Independent Test**: Can be tested by enabling 2FA in settings, scanning QR code with authenticator app, and verifying codes work during login.

**Acceptance Scenarios**:

1. **Given** logged-in user in security settings, **When** they enable 2FA, **Then** they see QR code to scan with authenticator app
2. **Given** user enabling 2FA, **When** they verify TOTP code, **Then** they receive 10 backup codes and 2FA is activated
3. **Given** user with 2FA enabled, **When** they login with password, **Then** they must enter TOTP code before accessing dashboard
4. **Given** user with 2FA who lost device, **When** they use backup code, **Then** they can login and backup code is consumed
5. **Given** admin user, **When** they disable another user's 2FA, **Then** that user can login without TOTP codes

---

### User Story 5 - Session Management & Security (Priority: P1)

Users need secure session handling that expires appropriately and prevents unauthorized access.

**Why this priority**: Core security requirement. Sessions must be properly managed to prevent unauthorized access.

**Independent Test**: Can be tested by logging in, verifying session persistence, logging out, and confirming session is cleared.

**Acceptance Scenarios**:

1. **Given** authenticated user, **When** they close browser and return later, **Then** their session persists based on "Remember me" preference
2. **Given** authenticated user, **When** they click logout, **Then** session is cleared and they're redirected to login page
3. **Given** user with expired session, **When** they try to access protected page, **Then** they are redirected to login with return URL
4. **Given** user in protected route, **When** their role is insufficient, **Then** they see "Access denied" message

---

### User Story 6 - Role-Based Access Control (Priority: P1)

System administrators need to manage user roles and restrict access to admin functions.

**Why this priority**: Essential for multi-tenant system security. Prevents regular users from accessing admin features.

**Independent Test**: Can be tested by creating users with different roles and verifying access restrictions work correctly.

**Acceptance Scenarios**:

1. **Given** admin user, **When** they access /admin routes, **Then** they can view and manage all users
2. **Given** regular user, **When** they try to access /admin routes, **Then** they see 403 Forbidden error
3. **Given** admin user, **When** they change another user's role, **Then** that user's permissions update immediately
4. **Given** user with USER role, **When** they access their own settings, **Then** they can manage their profile but not others

---

### User Story 7 - Admin Signup Restrictions (Priority: P2)

Administrators want to control who can create accounts by restricting signups to specific emails or domains.

**Why this priority**: Important for private deployments or invitation-only systems. Not needed for public instances.

**Independent Test**: Can be tested by enabling restrictions in admin settings and attempting signup with allowed/disallowed emails.

**Acceptance Scenarios**:

1. **Given** admin in settings, **When** they enable signup restrictions, **Then** only whitelisted emails can create accounts
2. **Given** signup restrictions enabled, **When** user with allowed email signs up, **Then** account is created successfully
3. **Given** signup restrictions enabled, **When** user with disallowed email signs up, **Then** they see "Signup restricted" error
4. **Given** domain-based restrictions (e.g., @company.com), **When** user with matching domain signs up, **Then** account is created
5. **Given** admin user email, **When** signup restrictions are enabled, **Then** admin emails are always allowed to signup

---

### Edge Cases

- What happens when user tries to create account with existing email? **System shows "Email already registered" error**
- How does system handle OAuth provider returning no email? **Signup fails with "Email required" error**
- What happens if TOTP secret generation fails? **Setup process shows error and allows retry**
- How does system handle concurrent login attempts? **Each successful login creates new session token**
- What happens when all backup codes are used? **User must disable and re-enable 2FA to generate new codes**
- How does system handle session hijacking attempts? **Session tokens are cryptographically signed and tied to user agent**
- What happens when admin deletes user who is currently logged in? **User's session remains valid until expiry or logout**
- How does system handle magic link reuse? **Each link is single-use and invalidated after first successful login**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support email/password authentication with bcrypt hashing (minimum 10 rounds)
- **FR-002**: System MUST integrate with Google OAuth 2.0 for social login
- **FR-003**: System MUST integrate with GitHub OAuth for social login
- **FR-004**: System MUST support passwordless authentication via magic link emails
- **FR-005**: System MUST support TOTP-based two-factor authentication compatible with standard authenticator apps
- **FR-006**: System MUST generate 10 single-use backup codes when 2FA is enabled
- **FR-007**: System MUST hash backup codes before storage using bcrypt
- **FR-008**: System MUST enforce role-based access control with USER, ADMIN, and MEMBER roles
- **FR-009**: System MUST support admin-configurable signup restrictions by email or domain
- **FR-010**: System MUST send welcome emails to new users with account details
- **FR-011**: System MUST send magic link emails with clickable authentication URLs
- **FR-012**: System MUST expire magic links after configurable timeout (default 24 hours)
- **FR-013**: System MUST maintain session state across browser sessions based on user preference
- **FR-014**: System MUST validate email format during registration
- **FR-015**: System MUST enforce minimum password length of 8 characters
- **FR-016**: System MUST allow admin users to reset other users' passwords
- **FR-017**: System MUST allow admin users to disable 2FA for other users
- **FR-018**: System MUST allow admin users to change user roles
- **FR-019**: System MUST allow admin users to delete user accounts
- **FR-020**: System MUST allow users to change their own password when one exists
- **FR-021**: System MUST allow users to create password for OAuth-only accounts
- **FR-022**: Users MUST be able to enable/disable TOTP 2FA from security settings
- **FR-023**: System MUST validate TOTP codes with 30-second time window and ±1 step tolerance
- **FR-024**: System MUST log authentication events (successful logins, failed attempts, 2FA changes)
- **FR-025**: System MUST protect against brute force attacks by requiring TOTP after password validation

### Key Entities

- **User**: Represents authenticated user with email, password hash, role, TOTP settings, OAuth accounts, and profile information
- **Account**: OAuth provider account linked to user (provider, providerAccountId, tokens)
- **Session**: Active user session with token, expiry, and user reference
- **VerificationToken**: One-time tokens for email verification and magic links with expiry
- **Authenticator**: WebAuthn credentials for passwordless authentication (optional future enhancement)
- **AppSettings**: Global configuration including signup restrictions

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete account creation and first login in under 2 minutes
- **SC-002**: OAuth authentication completes within 10 seconds including redirects
- **SC-003**: Magic link emails arrive within 30 seconds of request
- **SC-004**: TOTP setup completes successfully with any standard authenticator app (Google Authenticator, Authy, 1Password)
- **SC-005**: Zero unauthorized access incidents when role-based restrictions are properly configured
- **SC-006**: Session management prevents access after logout with 100% reliability
- **SC-007**: Signup restrictions correctly block 100% of unauthorized registration attempts
- **SC-008**: Admin users can manage user accounts (reset password, change role, delete) in under 1 minute per operation
- **SC-009**: 95%+ of users successfully complete 2FA setup on first attempt
- **SC-010**: Backup codes successfully authenticate users who lost TOTP device in 100% of cases
- **SC-011**: Authentication system handles 1000+ concurrent login attempts without performance degradation
- **SC-012**: No password storage in plaintext - all passwords hashed with bcrypt
- **SC-013**: Magic link expiry prevents unauthorized access after timeout period in 100% of cases
