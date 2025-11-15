# Feature Specification: Admin User & System Management

**Feature Branch**: `006-admin-management`  
**Created**: 2025-11-15  
**Status**: Implemented  
**Domain**: Administration

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View All Users (Priority: P1)

Administrators need to view list of all registered users with their roles, authentication methods, and account status.

**Why this priority**: Core admin functionality for user oversight. Without this, admins cannot manage users effectively.

**Independent Test**: Can be fully tested by logging in as admin, navigating to admin users page, and viewing complete user list.

**Acceptance Scenarios**:

1. **Given** admin user on /admin/users page, **When** page loads, **Then** table displays all users with name, email, role, and creation date
2. **Given** user list, **When** displayed, **Then** authentication method indicators show password/OAuth/2FA status for each user
3. **Given** user list, **When** admin views, **Then** users can be sorted by name, email, role, or creation date
4. **Given** large user list (100+), **When** displayed, **Then** pagination or infinite scroll provides efficient navigation
5. **Given** user list, **When** admin searches by email/name, **Then** matching users are filtered in real-time

---

### User Story 2 - Change User Roles (Priority: P1)

Administrators need to promote users to ADMIN or demote them to USER role for access control.

**Why this priority**: Essential for delegation of admin responsibilities and role-based security enforcement.

**Independent Test**: Can be tested by changing a user's role from USER to ADMIN, logging in as that user, and verifying admin access works.

**Acceptance Scenarios**:

1. **Given** admin viewing user list, **When** they click role dropdown for a user, **Then** they can select USER, ADMIN, or MEMBER
2. **Given** role change dialog, **When** admin confirms role change, **Then** user's role is updated in database immediately
3. **Given** role change success, **When** completed, **Then** admin sees success toast and user list updates without page reload
4. **Given** user whose role changed to ADMIN, **When** they access /admin routes, **Then** access is granted immediately
5. **Given** user whose role changed to USER, **When** they try to access /admin routes, **Then** access is denied with 403 error
6. **Given** admin trying to change own role, **When** attempted, **Then** system prevents self-demotion with warning message

---

### User Story 3 - Reset User Passwords (Priority: P1)

Administrators need to reset passwords for users who are locked out or forgot their credentials.

**Why this priority**: Critical support function. Users regularly need password resets and may not have email access.

**Independent Test**: Can be tested by admin resetting a user's password, user logging in with new password, and verifying access works.

**Acceptance Scenarios**:

1. **Given** admin viewing user list, **When** they click "Reset Password" for a user, **Then** dialog prompts for new password
2. **Given** password reset dialog, **When** admin enters new password, **Then** password is validated (minimum 8 characters)
3. **Given** valid new password, **When** admin confirms reset, **Then** user's password is hashed and updated
4. **Given** successful password reset, **When** completed, **Then** user receives email notification with new credentials
5. **Given** OAuth-only user, **When** admin resets password, **Then** password is created and user can now use email/password login
6. **Given** password reset, **When** admin views user details, **Then** last password reset timestamp is updated

---

### User Story 4 - Disable User 2FA (Priority: P2)

Administrators need to disable TOTP 2FA for users who lost their authenticator device and backup codes.

**Why this priority**: Important support function but less frequent than password resets. Users may be locked out without this.

**Independent Test**: Can be tested by enabling 2FA on test account, admin disabling it, then logging in without TOTP code.

**Acceptance Scenarios**:

1. **Given** admin viewing user with 2FA enabled, **When** they click "Disable 2FA", **Then** confirmation dialog appears with user's email
2. **Given** 2FA disable confirmation, **When** admin confirms action, **Then** user's TOTP secret and backup codes are cleared
3. **Given** successful 2FA disable, **When** completed, **Then** user receives email notification about security change
4. **Given** user with disabled 2FA, **When** they login next time, **Then** no TOTP code is required
5. **Given** admin viewing user without 2FA, **When** viewing options, **Then** "Disable 2FA" button is hidden or disabled
6. **Given** 2FA disable action, **When** completed, **Then** audit log records admin who performed action and timestamp

---

### User Story 5 - Delete User Accounts (Priority: P2)

Administrators need to delete user accounts for GDPR compliance, abuse, or user requests.

**Why this priority**: Required for legal compliance and platform management. Less frequent operation with high impact.

**Independent Test**: Can be tested by creating test user, admin deleting account, and verifying user cannot login and data is removed.

**Acceptance Scenarios**:

1. **Given** admin viewing user list, **When** they click "Delete User", **Then** confirmation dialog appears with warning about data deletion
2. **Given** delete confirmation dialog, **When** admin types user's email to confirm, **Then** delete button becomes enabled
3. **Given** delete confirmation, **When** admin confirms deletion, **Then** user account, sessions, and personal data are permanently deleted
4. **Given** user with created content (entities, playlists), **When** admin deletes account, **Then** system prompts for content handling (delete or transfer)
5. **Given** successful user deletion, **When** completed, **Then** deleted user's email can be reused for new signup
6. **Given** deleted user, **When** they try to login, **Then** they see "No account found" error without indication of deletion

---

### User Story 6 - Configure Signup Restrictions (Priority: P2)

Administrators need to control who can create accounts by whitelisting emails or domains.

**Why this priority**: Important for private deployments or invitation-only systems. Not needed for public instances.

**Independent Test**: Can be tested by enabling restrictions, attempting signup with allowed/disallowed email, and verifying enforcement.

**Acceptance Scenarios**:

1. **Given** admin on /admin/settings page, **When** they toggle "Restrict Signup", **Then** signup restrictions are enabled globally
2. **Given** signup restrictions enabled, **When** admin adds email addresses, **Then** emails are saved to whitelist
3. **Given** signup restrictions enabled, **When** admin adds domains (e.g., @company.com), **Then** domains are saved to whitelist
4. **Given** whitelisted email, **When** user with that email signs up, **Then** account creation succeeds
5. **Given** non-whitelisted email, **When** user attempts signup, **Then** they see "Signup restricted to invited users" error
6. **Given** admin email, **When** signup restrictions are enabled, **Then** admin emails are always allowed to signup (special handling)
7. **Given** domain whitelist, **When** user with matching domain signs up, **Then** account creation succeeds regardless of specific email

---

### User Story 7 - View System Statistics and Health (Priority: P3)

Administrators want to see dashboard with system statistics like user count, content count, and system health indicators.

**Why this priority**: Nice to have for monitoring and insights. Not critical for day-to-day admin operations.

**Independent Test**: Can be tested by viewing admin dashboard and verifying statistics are accurate against database counts.

**Acceptance Scenarios**:

1. **Given** admin on /admin dashboard, **When** page loads, **Then** they see total user count, new users this month, and active users
2. **Given** admin dashboard, **When** displayed, **Then** content statistics show entity count, dictionary word count, and storage usage
3. **Given** admin dashboard, **When** viewed, **Then** recent activity feed shows latest user registrations and content updates
4. **Given** admin dashboard, **When** displayed, **Then** system health indicators show database status, cache status, and API availability
5. **Given** admin dashboard, **When** viewed, **Then** charts visualize user growth and content additions over time

---

### Edge Cases

- What happens when admin tries to delete last admin user? **System prevents deletion with error "Cannot delete last admin"**
- How does system handle admin resetting password for OAuth-only user? **Creates password field, sends notification**
- What happens when admin changes role of currently logged-in user? **Role change applies on next session refresh**
- How does system handle bulk user operations (e.g., delete 100 users)? **Not implemented yet - manual one-by-one or future enhancement**
- What happens when admin disables their own 2FA? **Allowed with confirmation, admin must re-authenticate**
- How does system handle signup whitelist with thousands of entries? **Pagination and search for whitelist management UI**
- What happens when admin deletes user with active sessions? **Sessions remain valid until expiry, user appears deleted on next refresh**
- How does system handle email collision after user deletion? **Email becomes available immediately for new signups**
- What happens when non-admin tries to access /admin routes? **403 Forbidden with requireAdmin() check in Server Actions**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST restrict /admin routes to users with ADMIN role using requireAdmin() check
- **FR-002**: System MUST provide getAllUsers() Server Action returning all user records with role, 2FA status, and timestamps
- **FR-003**: System MUST provide adminUpdateUserRole() Server Action to change user roles (USER, ADMIN, MEMBER)
- **FR-004**: System MUST prevent admin from demoting themselves to prevent lockout
- **FR-005**: System MUST provide adminResetUserPassword() Server Action to set new password for any user
- **FR-006**: System MUST hash new passwords with bcrypt before storage during admin reset
- **FR-007**: System MUST send email notification to user when admin resets their password
- **FR-008**: System MUST provide adminDisableUserTOTP() Server Action to clear TOTP secret and backup codes
- **FR-009**: System MUST send email notification to user when admin disables their 2FA
- **FR-010**: System MUST provide adminDeleteUser() Server Action to permanently delete user account
- **FR-011**: System MUST cascade delete or handle user-created content (entities, playlists) when deleting account
- **FR-012**: System MUST require email confirmation in UI before allowing user deletion
- **FR-013**: System MUST provide getAppSettings() Server Action returning signup restriction configuration
- **FR-014**: System MUST provide updateAppSettings() Server Action to enable/disable signup restrictions
- **FR-015**: System MUST support whitelisting specific email addresses for signup
- **FR-016**: System MUST support whitelisting email domains (e.g., @company.com) for signup
- **FR-017**: System MUST enforce signup restrictions during registration process
- **FR-018**: System MUST allow admin emails to bypass signup restrictions
- **FR-019**: System MUST validate admin authentication for all admin Server Actions
- **FR-020**: System MUST return discriminated union responses from all admin Server Actions
- **FR-021**: System MUST log admin actions (role changes, password resets, deletions) for audit trail
- **FR-022**: System MUST display user list with sortable columns and search functionality
- **FR-023**: System MUST support pagination for large user lists (100+ users)
- **FR-024**: System MUST show authentication method indicators (password icon, OAuth provider logos, 2FA badge)
- **FR-025**: System MUST provide admin settings page for configuring system-wide options

### Key Entities

- **User**: All user records with role, email, name, authentication methods, 2FA status, timestamps
- **AppSettings**: Global configuration with restrictSignup boolean, allowedSignupEmails array, allowedSignupDomains array
- **Admin Action Log**: Audit trail of admin operations with admin ID, action type, target user, timestamp (future enhancement)
- **System Statistics**: Aggregated counts for users, entities, dictionary words, storage usage (computed, not stored)

### Technical Constraints

- Server Actions with requireAdmin() authentication check returning discriminated unions
- Admin routes protected by middleware or component-level auth checks
- React-hook-form + zod + zodResolver for admin forms
- TanStack Query for data fetching with cache invalidation after mutations
- Shadcn Data Table component for user list with sorting and filtering
- Dialog components for confirmations (role change, password reset, delete user)
- Toast notifications for success/error feedback
- Email notifications via Resend for security-sensitive actions
- Optimistic updates for instant UI feedback where appropriate

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Admin can view complete user list within 2 seconds for databases up to 1000 users
- **SC-002**: User role changes take effect immediately and reflect across UI in under 1 second
- **SC-003**: Password reset by admin completes within 5 seconds including email notification
- **SC-004**: User search/filter returns results within 500ms for any query
- **SC-005**: 100% of admin actions require ADMIN role verification (zero unauthorized access)
- **SC-006**: Signup restrictions correctly block 100% of non-whitelisted registration attempts
- **SC-007**: User deletion removes all personal data with 100% completeness (GDPR compliance)
- **SC-008**: 2FA disable by admin completes successfully in 100% of valid cases
- **SC-009**: Admin cannot delete last admin account with 100% prevention rate
- **SC-010**: Email notifications for admin actions arrive within 1 minute
- **SC-011**: Admin interface remains responsive with user lists up to 10,000 records (with pagination)
- **SC-012**: Zero data integrity issues from admin operations (all constraints enforced)
- **SC-013**: Admin forms provide clear validation with 100% error message coverage
- **SC-014**: System prevents self-demotion with 100% reliability
- **SC-015**: 95%+ of admin operations complete on first attempt without errors
