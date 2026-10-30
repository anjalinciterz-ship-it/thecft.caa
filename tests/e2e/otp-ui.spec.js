import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const member = { id: 'otp-ui-member', name: 'Browser Member', email: 'member@payments.test', emailVerified: true, phoneVerified: false, hasPassword: false, role: 'student', timeZone: 'UTC' };
const test = base.extend({
  authMock: async ({ page }, use, testInfo) => {
    const state = {
      user: null, requests: [], verifyError: null, sendError: null,
      ttl: 300000, cooldown: 60000,
      config: { google: { configured: false }, password: { configured: true }, otp: { email: { enabled: true }, sms: { enabled: true, countries: ['CA', 'IN', 'GB'] }, codeLength: 6 } },
      offering: {
        id: 'accelerator', productId: 'mock-offering-id', productKind: 'course', slug: 'accelerator', name: 'Accelerator',
        short: 'A twelve-week accelerator.', currency: 'CAD', priceMinor: 19900, price: 199, isFree: false, level: 'Intermediate',
        length: '12 weeks', accessPolicy: 'lifetime', publishedModuleCount: 3, publishedLessonCount: 24, deliverableLessonCount: 24,
        contentReady: true, availableForPurchase: true, includedOfferings: [], outcomes: [], whoFor: [], faqs: [], curriculum: [],
      },
    };
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    state.route = async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace('/api/v1', '');
      const body = request.postDataJSON();
      state.requests.push({ path, method: request.method(), body });
      const ok = (data) => route.fulfill({ json: { data } });
      const fail = (code, message, status = 400) => route.fulfill({ status, json: { error: { code, message } } });
      if (path === '/auth/status') return ok(state.config);
      if (path === '/auth/me') return ok({ authenticated: !!state.user, user: state.user });
      if (path === '/auth/csrf') return ok({ csrfToken: 'browser-ui-only-csrf' });
      if (path === '/student/courses') return ok({ enrollments: [] });
      if (path === '/auth/otp/request') {
        if (state.sendError) return fail(...state.sendError);
        return ok({ challengeId: `ui-challenge-${state.requests.length}`, maskedDestination: body.channel === 'sms' ? '+91••••••3210' : 'm•••@payments.test', expiresAt: new Date(Date.now() + state.ttl).toISOString(), resendAt: new Date(Date.now() + state.cooldown).toISOString() });
      }
      if (path === '/auth/otp/verify' || path === '/auth/login' || path === '/auth/google') {
        if (state.verifyError) return fail(...state.verifyError);
        state.user ||= { ...member };
        return ok({ user: state.user });
      }
      if (path === '/auth/password/forgot' || path === '/auth/password/reset') return ok({ accepted: true });
      if (path === '/users/me') {
        if (request.method() === 'PATCH') Object.assign(state.user, body);
        return ok({ user: state.user });
      }
      if (path === '/users/me/password') { state.user.hasPassword = true; return ok({ updated: true }); }
      if (path === '/notifications') return ok({ notifications: [], unreadCount: 0 });
      if (path === '/session-types') return ok({ sessionTypes: state.sessionTypes || [] });
      if (path.startsWith('/offerings/')) return ok({ offering: state.offering });
      if (path === '/cart/price') return ok({ currency: 'CAD', items: [{ unitPriceMinor: state.offering.priceMinor }], subtotalMinor: state.offering.priceMinor, discountMinor: 0, totalMinor: state.offering.priceMinor, isFree: false });
      if (path === '/cart/checkout') return fail('email_required', 'Verify an email before checkout.');
      return ok({ items: [], courses: [], notifications: [], unreadCount: 0 });
    };
    await page.route('**/api/v1/**', state.route);
    await use(state);
    await testInfo.attach('mock-api-requests', { body: JSON.stringify(state.requests, null, 2), contentType: 'application/json' });
    expect(errors, 'No uncaught browser errors').toEqual([]);
  },
});

async function requestEmailCode(page, path = '/login?course=accelerator') {
  await page.goto(path);
  await page.getByLabel('Email address', { exact: true }).fill(member.email);
  await page.getByRole('button', { name: 'Send email code', exact: true }).click();
  await expect(page.getByLabel('Verification code')).toBeVisible();
}

async function verifyCode(page, name = 'Verify and sign in') {
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name, exact: true }).click();
}

test('mocked email OTP returns to the selected course without a password', async ({ page, authMock }) => {
  await requestEmailCode(page);
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await expect(page.getByLabel('Verification code')).toBeFocused();
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled();
  await verifyCode(page);
  await expect(page).toHaveURL(/\/checkout\?course=accelerator$/);
  await expect(page.locator('h1')).toBeVisible();
  expect(authMock.requests.find((request) => request.path === '/auth/otp/request').body).toEqual({ channel: 'email', purpose: 'login', destination: member.email });
});

test('international SMS normalizes local entry and rejects invalid numbers', async ({ page, authMock }) => {
  await page.goto('/login?course=accelerator');
  await page.getByRole('button', { name: 'Mobile code', exact: true }).click();
  await page.getByLabel('Country / region').selectOption('IN');
  await page.getByLabel('Mobile number', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'Send SMS code' }).click();
  await expect(page.locator('.au-otp [role="alert"]')).toContainText('valid mobile number');
  expect(authMock.requests.filter((request) => request.path === '/auth/otp/request')).toHaveLength(0);
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await page.getByRole('button', { name: 'Send SMS code' }).click();
  await expect(page.getByLabel('Verification code')).toBeVisible();
  expect(authMock.requests.find((request) => request.path === '/auth/otp/request').body.destination).toBe('+919876543210');
  await verifyCode(page);
  await expect(page).toHaveURL(/\/checkout\?course=accelerator$/);
});

test('signup requires consent and sends no password or date of birth', async ({ page, authMock }) => {
  await page.goto('/signup?course=accelerator');
  await page.getByLabel('First name', { exact: true }).fill('New');
  await page.getByLabel('Last name (optional)').fill('Member');
  await page.getByLabel('Email address', { exact: true }).fill('new@payments.test');
  await page.getByRole('button', { name: 'Send email code' }).click();
  expect(authMock.requests.filter((request) => request.path === '/auth/otp/request')).toHaveLength(0);
  await page.locator('.au-otp input[type=checkbox][required]').check();
  await page.getByRole('button', { name: 'Send email code' }).click();
  await expect(page.getByLabel('Verification code')).toBeVisible();
  const payload = authMock.requests.find((request) => request.path === '/auth/otp/request').body;
  expect(payload).toMatchObject({ purpose: 'signup', firstName: 'New', lastName: 'Member', termsAccepted: true, marketingConsent: false });
  expect(payload).not.toHaveProperty('password');
  expect(payload).not.toHaveProperty('dob');
  await verifyCode(page, 'Verify and create account');
  await expect(page).toHaveURL(/\/checkout\?course=accelerator$/);
});

test('incorrect codes stay on the challenge and unknown accounts offer signup with intent', async ({ page, authMock }) => {
  authMock.verifyError = ['otp_invalid', 'The verification code is incorrect.'];
  await requestEmailCode(page);
  await verifyCode(page);
  await expect(page.locator('.au-otp [role="alert"]')).toHaveText('The verification code is incorrect.');
  await expect(page).toHaveURL(/\/login\?course=accelerator$/);
  authMock.verifyError = ['account_not_found', 'Create an account to continue.'];
  await verifyCode(page);
  await expect(page.getByRole('link', { name: 'Create your account', exact: true })).toHaveAttribute('href', '/signup?course=accelerator');
});

test('expired codes cannot submit and can be replaced after the cooldown', async ({ page, authMock }) => {
  authMock.ttl = -1;
  authMock.cooldown = 0;
  await requestEmailCode(page);
  await expect(page.getByText('This code has expired. Request a new code to continue.')).toBeVisible();
  await expect(page.getByLabel('Verification code')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Verify and sign in', exact: true })).toBeDisabled();
  authMock.ttl = 300000;
  await page.getByRole('button', { name: 'Send a new code', exact: true }).click();
  await expect(page.getByLabel('Verification code')).toBeEnabled();
  expect(authMock.requests.filter((request) => request.path === '/auth/otp/request')).toHaveLength(2);
});

test('provider unavailable and send failures never claim that a code was sent', async ({ page, authMock }) => {
  authMock.config.otp.sms.enabled = false;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Mobile code', exact: true }).click();
  await expect(page.getByText(/Mobile verification is not available yet/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send SMS code' })).toBeDisabled();
  await page.getByRole('button', { name: 'Email code', exact: true }).click();
  authMock.sendError = ['otp_delivery_failed', 'The code could not be sent.'];
  await page.getByLabel('Email address', { exact: true }).fill(member.email);
  await page.getByRole('button', { name: 'Send email code' }).click();
  await expect(page.locator('.au-otp [role="alert"]')).toHaveText('The code could not be sent.');
  await expect(page.getByLabel('Verification code')).toHaveCount(0);
});

for (const identifier of [member.email, '+14165550123', 'browser_member']) {
  test(`optional password supports ${identifier} and keeps course intent`, async ({ page, authMock }) => {
    await page.goto('/login?course=accelerator');
    await page.getByRole('button', { name: 'Password', exact: true }).click();
    await page.getByLabel('Email, mobile number or username').fill(identifier);
    await page.getByLabel('Password', { exact: true }).fill('Existing-Password-123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/checkout\?course=accelerator$/);
    expect(authMock.requests.find((request) => request.path === '/auth/login').body).toEqual({ identifier, password: 'Existing-Password-123!' });
  });
}

test('login, signup and recovery navigation retains the course without retaining reset tokens', async ({ page, authMock }) => {
  await page.goto('/signup?course=accelerator');
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?course=accelerator$/);
  await page.getByRole('button', { name: 'Password', exact: true }).click();
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password\?course=accelerator$/);
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login?course=accelerator');
  await page.goto('/reset-password?token=mock-token&course=accelerator');
  await page.getByLabel('New Password', { exact: true }).fill('Updated-Password-123!');
  await page.getByLabel('Confirm New Password', { exact: true }).fill('Updated-Password-123!');
  await page.getByRole('button', { name: /Save new password/ }).click();
  await expect(page).toHaveURL(/\/reset-password\?course=accelerator$/);
  await expect(page.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login?course=accelerator');
});

for (const path of ['/dashboard/courses', '/admin/courses']) {
  test(`protected ${path} retains its destination`, async ({ page, authMock }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`));
  });
}

test('phone-only settings can add an email and set an optional password', async ({ page, authMock }) => {
  authMock.user = { ...member, email: undefined, emailVerified: false, phone: '+14165550123', phoneVerified: true };
  await page.goto('/dashboard/settings?verifyEmail=1&next=%2Fcheckout%3Fcourse%3Daccelerator');
  await expect(page.getByText('No email added', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to your selection' })).toHaveAttribute('href', '/checkout?course=accelerator');
  await page.getByRole('button', { name: 'Add email', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(member.email);
  await page.getByRole('button', { name: 'Send email code' }).click();
  await expect(page.getByLabel('Verification code')).toBeVisible();
  expect(authMock.requests.filter((request) => request.path === '/auth/otp/request').at(-1).body.purpose).toBe('link');
  authMock.user.email = member.email; authMock.user.emailVerified = true;
  await verifyCode(page, 'Verify and add');
  await expect(page.getByText('Verification complete.', { exact: true })).toBeVisible();
  await page.getByLabel('Username (optional)').fill('browser_member');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Your profile has been saved.')).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('Optional-Password-123!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('Optional-Password-123!');
  await page.getByRole('button', { name: 'Set password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Change password', exact: true })).toBeVisible();
});

test('phone-only checkout states the email rule and returns to the same review page', async ({ page, authMock }) => {
  authMock.user = { ...member, email: undefined, emailVerified: false, phone: '+14165550123', phoneVerified: true };
  await page.goto('/course/accelerator');
  await page.getByRole('link', { name: 'Enroll Now' }).first().click();
  await expect(page).toHaveURL(/\/checkout\?course=accelerator$/);
  await expect(page.getByText('CAD 199.00').first()).toBeVisible();
  await page.getByRole('button', { name: 'Pay CAD 199.00' }).click();
  await expect(page.locator('.au-err')).toContainText('Verify an email before checkout.');
  await page.getByRole('link', { name: 'add and verify it' }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings\?verifyEmail=1&next=%2Fcheckout%3Fcourse%3Daccelerator$/);
  await expect(page.getByRole('link', { name: 'Return to your selection' })).toHaveAttribute('href', '/checkout?course=accelerator');
  await expect(page.getByRole('button', { name: 'Add email', exact: true })).toBeVisible();
});

test('paid appointments request email verification before collecting booking details', async ({ page, authMock }) => {
  authMock.user = { ...member, email: undefined, emailVerified: false, phone: '+14165550123', phoneVerified: true };
  authMock.sessionTypes = [{ id: 'paid-call', name: 'Personal guidance', description: 'A private appointment.', durationMinutes: 30, priceMinor: 5000, currency: 'CAD', isFree: false, intakeQuestions: [] }];
  await page.goto('/dashboard/bookings?sessionType=paid-call');
  await expect(page.getByLabel('Choose a date', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Add and verify your email', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Return to your selection' })).toHaveAttribute('href', '/dashboard/bookings?sessionType=paid-call');
  authMock.user.email = member.email; authMock.user.emailVerified = true;
  await page.reload();
  await page.getByRole('link', { name: 'Return to your selection' }).click();
  await expect(page.getByLabel('Choose a date', { exact: true })).toBeVisible();
});

test('settings re-verification stays bound to the current sign-in identity', async ({ page, authMock }) => {
  authMock.user = { ...member };
  await page.goto('/dashboard/settings');
  await page.getByText('Confirm a recent sign-in', { exact: true }).click();
  await page.getByRole('button', { name: 'Confirm by email', exact: true }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(member.email);
  await expect(page.getByLabel('Email address', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Send email code', exact: true }).click();
  await verifyCode(page);
  await expect(page.getByText('Verification complete.', { exact: true })).toBeVisible();
  expect(authMock.requests.find((request) => request.path === '/auth/otp/request').body).toMatchObject({ purpose: 'login', destination: member.email });
});

test('an identity refresh discards an open challenge for the previous email', async ({ page, authMock }) => {
  authMock.user = { ...member };
  await page.goto('/dashboard/settings');
  await page.getByText('Confirm a recent sign-in', { exact: true }).click();
  await page.getByRole('button', { name: 'Confirm by email', exact: true }).click();
  await page.getByRole('button', { name: 'Send email code', exact: true }).click();
  await expect(page.getByLabel('Verification code')).toBeVisible();
  authMock.user.email = 'updated@payments.test';
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Your profile has been saved.')).toBeVisible();
  await expect(page.getByLabel('Verification code')).toHaveCount(0);
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('updated@payments.test');
});

test('a recovery link opened in another tab restores the course without storing credentials', async ({ page, context, authMock }) => {
  await page.goto('/forgot-password?course=accelerator');
  await page.getByLabel('Email Address', { exact: true }).fill(member.email);
  await page.getByRole('button', { name: /Email me a reset link/ }).click();
  await expect(page.getByText('Check your inbox', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('cft.recovery-intent'));
  expect(saved).toContain('accelerator');
  expect(saved).not.toContain(member.email);
  const other = await context.newPage();
  const errors = [];
  other.on('pageerror', (error) => errors.push(error.message));
  await other.route('**/api/v1/**', authMock.route);
  try {
    await other.goto('/reset-password?token=mock-email-token');
    await other.getByLabel('New Password', { exact: true }).fill('Recovered-Password-123!');
    await other.getByLabel('Confirm New Password', { exact: true }).fill('Recovered-Password-123!');
    await other.getByRole('button', { name: /Save new password/ }).click();
    await expect(other).toHaveURL(/\/reset-password\?course=accelerator$/);
    await expect(other.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login?course=accelerator');
    expect(await other.evaluate(() => localStorage.getItem('cft.recovery-intent'))).toBeNull();
    expect(errors).toEqual([]);
  } finally { await other.close(); }
});

test('Google button uses its credential callback and retains the selected course', async ({ page, authMock }) => {
  authMock.config.google = { configured: true, clientId: 'browser-ui-only.apps.googleusercontent.com' };
  await page.addInitScript(() => {
    let callback;
    window.google = { accounts: { id: {
      initialize(options) { callback = options.callback; },
      renderButton(container) {
        const button = document.createElement('button');
        button.textContent = 'Continue with Google';
        button.onclick = () => callback({ credential: 'mocked-browser-credential' });
        container.append(button);
      },
    } } };
  });
  await page.goto('/signup?course=accelerator');
  await expect(page.locator('.au-gis-button')).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('To continue with Google', { exact: false }).check();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\?course=accelerator$/);
  expect(authMock.requests.find((request) => request.path === '/auth/google').body).toMatchObject({ credential: 'mocked-browser-credential' });
});

for (const width of [1440, 768, 390, 320]) {
  test(`mobile OTP signup is accessible without overflow at ${width}px`, async ({ page, authMock }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/signup?course=accelerator');
    await page.getByRole('button', { name: 'Mobile code', exact: true }).click();
    await expect(page.getByLabel('Country / region')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter((item) => ['serious', 'critical'].includes(item.impact))).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`signup-mobile-${width}.png`), fullPage: true });
  });
}
