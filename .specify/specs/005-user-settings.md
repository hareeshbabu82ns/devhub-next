# Feature Specification: User Profile & Settings Management

**Feature Branch**: `005-user-settings`  
**Created**: 2025-11-15  
**Status**: Implemented  
**Domain**: User Management

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View and Edit Profile Information (Priority: P1)

Users want to view and update their profile information including name, email, and profile image.

**Why this priority**: Basic user account management. Users need ability to keep their information current.

**Independent Test**: Can be fully tested by navigating to profile settings, updating name and image, and verifying changes persist.

**Acceptance Scenarios**:

1. **Given** authenticated user on profile settings page, **When** page loads, **Then** current profile information (name, email, image) is displayed
2. **Given** profile form, **When** user changes name and saves, **Then** name is updated across all UI instances (header, dashboard)
3. **Given** profile form, **When** user uploads new profile image, **Then** image is stored and displayed in profile and navigation
4. **Given** OAuth user, **When** viewing profile, **Then** email field is read-only with indicator showing OAuth source (Google/GitHub)
5. **Given** profile update success, **When** saved, **Then** user sees success toast notification and form resets to saved state

---

### User Story 2 - Change Password (Priority: P1)

Users with password-based accounts want to change their password for security reasons.

**Why this priority**: Essential security feature. Users must be able to update compromised or weak passwords.

**Independent Test**: Can be tested by logging in with old password, changing password, logging out, and logging in with new password.

**Acceptance Scenarios**:

1. **Given** user with existing password on security settings, **When** they enter current password and new password, **Then** password is updated successfully
2. **Given** password change form, **When** user enters incorrect current password, **Then** validation error "Current password is incorrect" is displayed
3. **Given** password change form, **When** new password is too short (<8 characters), **Then** validation error "Password must be at least 8 characters" is shown
4. **Given** successful password change, **When** completed, **Then** user sees success message and can login with new password
5. **Given** password change, **When** saved, **Then** new password is hashed with bcrypt before storage

---

### User Story 3 - Create Password for OAuth Accounts (Priority: P2)

Users who signed up via OAuth (Google/GitHub) want to add password authentication as backup method.

**Why this priority**: Provides account access redundancy if OAuth provider is unavailable. Convenience feature.

**Independent Test**: Can be tested by creating OAuth account, adding password via settings, then logging in with email/password.

**Acceptance Scenarios**:

1. **Given** OAuth-only user on security settings, **When** they view password section, **Then** they see "Create Password" option instead of "Change Password"
2. **Given** create password form, **When** user enters and confirms new password, **Then** password is added to account
3. **Given** OAuth user with newly created password, **When** they logout and login, **Then** they can use either OAuth or email/password
4. **Given** create password form, **When** passwords don't match, **Then** validation error "Passwords do not match" is displayed
5. **Given** successful password creation, **When** completed, **Then** user receives email notification about account security update

---

### User Story 4 - Manage Two-Factor Authentication (Priority: P2)

Security-conscious users want to enable/disable TOTP 2FA and manage backup codes from their settings.

**Why this priority**: Important security feature for users with sensitive data. Not required for basic usage.

**Independent Test**: Can be tested by enabling 2FA, verifying it works on login, then disabling it from settings.

**Acceptance Scenarios**:

1. **Given** user on security settings, **When** viewing 2FA section, **Then** current status (enabled/disabled) and setup button are displayed
2. **Given** user enabling 2FA, **When** they click "Enable 2FA", **Then** they see QR code and secret key for authenticator app
3. **Given** 2FA setup, **When** user verifies TOTP code, **Then** 2FA is enabled and 10 backup codes are displayed
4. **Given** user with 2FA enabled, **When** they click "Disable 2FA", **Then** confirmation dialog appears to prevent accidental disabling
5. **Given** 2FA disabled, **When** confirmed, **Then** TOTP secret and backup codes are cleared from account
6. **Given** user with some backup codes used, **When** viewing settings, **Then** remaining backup code count is displayed

---

### User Story 5 - View Account Security Status (Priority: P2)

Users want to see overview of their account security including authentication methods, 2FA status, and recent activity.

**Why this priority**: Provides security awareness and helps users understand their account protection level. Educational value.

**Independent Test**: Can be tested by viewing security settings and verifying all security indicators are accurate.

**Acceptance Scenarios**:

1. **Given** user on security settings, **When** page loads, **Then** security overview shows authentication methods (password, OAuth providers)
2. **Given** security overview, **When** displayed, **Then** shows 2FA status with badge (enabled/disabled)
3. **Given** user with multiple OAuth accounts, **When** viewing settings, **Then** all linked providers (Google, GitHub) are listed
4. **Given** security page, **When** viewed, **Then** account creation date and last updated timestamp are shown
5. **Given** user with strong security, **When** viewing overview, **Then** security score or indicator shows "Good" status

---

### User Story 6 - General Application Settings (Priority: P3)

Users want to configure application preferences like theme, language, and notification settings.

**Why this priority**: Enhances user experience but not critical for core functionality. Can be added incrementally.

**Independent Test**: Can be tested by changing theme preference and verifying it persists across sessions.

**Acceptance Scenarios**:

1. **Given** user on general settings, **When** they select theme (light/dark/system), **Then** UI immediately updates to selected theme
2. **Given** theme preference, **When** saved, **Then** preference persists across browser sessions
3. **Given** user on general settings, **When** they select preferred language, **Then** UI elements update to selected language
4. **Given** notification preferences, **When** user toggles email notifications, **Then** preference is saved and respected for future emails
5. **Given** general settings, **When** user clicks "Reset to Defaults", **Then** all preferences return to system defaults with confirmation

---

### User Story 7 - Advanced Settings and Data Management (Priority: P3)

Power users want access to advanced features like data export, account deletion, and API key management.

**Why this priority**: Niche features for advanced users. GDPR compliance may require some features (data export, account deletion).

**Independent Test**: Can be tested by exporting user data and verifying JSON file contains expected information.

**Acceptance Scenarios**:

1. **Given** user on advanced settings, **When** they click "Export My Data", **Then** JSON file downloads with all user data (profile, entities, bookmarks)
2. **Given** user on advanced settings, **When** they click "Delete Account", **Then** confirmation dialog with password verification appears
3. **Given** account deletion confirmation, **When** user confirms with password, **Then** account and associated data are permanently deleted
4. **Given** advanced settings, **When** user generates API key, **Then** key is created and displayed once with copy button
5. **Given** advanced settings, **When** user views developer options, **Then** they see current app version and build information

---

### Edge Cases

- What happens when user tries to change email to existing one? **Validation error: "Email already in use"**
- How does system handle profile image upload failure? **Shows error message, keeps existing image**
- What happens when user changes password while logged in on multiple devices? **All sessions remain valid until expiry**
- How does system handle concurrent profile updates? **Last write wins (optimistic concurrency)**
- What happens when OAuth provider revokes access? **User can still login with password if set, otherwise must re-authorize**
- How does system handle very large profile images? **Image validation limits file size (e.g., 5MB max), shows error if exceeded**
- What happens when user disables 2FA but forgets they had it enabled? **Email notification sent as security measure**
- How does system handle account deletion with existing content? **Option to transfer content to another user or delete with account**
- What happens when user exports data during active session? **Export includes current state, async processing for large datasets**

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to view their profile information (name, email, image, role, creation date)
- **FR-002**: System MUST allow users to update their name and profile image
- **FR-003**: System MUST prevent email changes for security reasons (or require verification)
- **FR-004**: System MUST support profile image upload with validation (file type, size)
- **FR-005**: System MUST allow users with passwords to change their password
- **FR-006**: System MUST validate current password before allowing password change
- **FR-007**: System MUST enforce minimum password length of 8 characters
- **FR-008**: System MUST allow OAuth users to create password for hybrid authentication
- **FR-009**: System MUST display authentication method indicators (password, Google, GitHub)
- **FR-010**: System MUST allow users to enable TOTP 2FA from security settings
- **FR-011**: System MUST allow users to disable TOTP 2FA with confirmation
- **FR-012**: System MUST display 2FA status and backup code count in security settings
- **FR-013**: System MUST support theme selection (light, dark, system) with persistence
- **FR-014**: System MUST support language preference selection with immediate UI update
- **FR-015**: System MUST support notification preference toggles (email, push)
- **FR-016**: System MUST provide "Export My Data" functionality with JSON download
- **FR-017**: System MUST provide "Delete Account" functionality with password verification
- **FR-018**: System MUST send email notifications for security-sensitive changes (password change, 2FA toggle, account deletion)
- **FR-019**: System MUST validate all form inputs with client and server-side validation
- **FR-020**: System MUST return discriminated union responses from all settings update actions
- **FR-021**: System MUST track last updated timestamp for user profiles
- **FR-022**: System MUST display success/error toast notifications for all setting changes
- **FR-023**: System MUST use react-hook-form + zod + zodResolver for all settings forms
- **FR-024**: System MUST persist theme preference in localStorage or user profile
- **FR-025**: System MUST support settings page navigation with tabs (Profile, Security, General, Advanced)

### Key Entities

- **User Profile**: Name, email, image, role, authentication methods, 2FA status, preferences
- **Security Settings**: Password status, OAuth providers, 2FA enabled/disabled, backup code count
- **General Settings**: Theme (light/dark/system), language, notification preferences
- **Advanced Settings**: Data export options, account deletion, API keys, developer info
- **User Preferences**: Theme, language, timezone, notification settings (stored in User model or separate Preferences model)

### Technical Constraints

- Server Actions for all CRUD operations with discriminated union responses
- react-hook-form + zod + zodResolver for form validation
- TanStack Query for state management and cache invalidation
- Optimistic UI updates for instant feedback
- Image upload to /public/assets/ or cloud storage (Cloudinary, S3)
- next-themes for theme management with system preference detection
- Settings page at /settings with nested routes (/settings/profile, /settings/security)
- Toast notifications using Shadcn toast component
- Profile images stored as URLs or file paths in User model

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can update profile name and see changes reflected across UI within 1 second (optimistic update)
- **SC-002**: Profile image upload completes within 5 seconds for images up to 5MB
- **SC-003**: Password change process completes in under 30 seconds including validation and toast notification
- **SC-004**: Theme changes apply instantly without page reload
- **SC-005**: Settings form validation provides real-time feedback within 200ms of input
- **SC-006**: 95%+ of users successfully update their profile on first attempt
- **SC-007**: Zero unauthorized profile updates due to missing authentication checks
- **SC-008**: Data export generates complete JSON file within 10 seconds for typical user data
- **SC-009**: Account deletion process completes within 30 seconds with confirmation
- **SC-010**: Email notifications for security changes arrive within 1 minute
- **SC-011**: 2FA enable/disable operations complete successfully in 100% of cases when properly verified
- **SC-012**: Settings page loads in under 2 seconds with all current values populated
- **SC-013**: Form error messages clearly indicate which field has issue and how to fix it
- **SC-014**: Settings changes persist correctly across browser sessions and devices
- **SC-015**: 90%+ of users find and successfully use settings features without documentation
