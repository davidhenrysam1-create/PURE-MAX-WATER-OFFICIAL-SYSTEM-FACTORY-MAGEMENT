/**
 * Firebase client initialisation.
 *
 * IMPORTANT — READ BEFORE WIRING IN sendPasswordResetEmail (Issue #2)
 * ------------------------------------------------------------------
 * This module is currently NOT imported anywhere in the app. It exists because
 * the original spec asked for "full Firebase Password Reset email verification
 * (sendPasswordResetEmail)".
 *
 * That call cannot work as-is, and wiring it in blindly would break password
 * reset for every user:
 *
 *   Pure Max accounts are NOT provisioned in Firebase Auth. They are created by
 *   a Manager inside UserManagementModule and stored in this browser's
 *   localStorage, with optional mirroring to the app's own PostgreSQL
 *   `users` table. `sendPasswordResetEmail()` looks the address up in FIREBASE
 *   Auth, finds nothing, and rejects with `auth/user-not-found` for 100% of
 *   accounts.
 *
 * Password reset is instead handled by the app's own OTP engine:
 *   - Server available (Google AI Studio / any Node host):
 *       POST /api/auth/request-reset -> 6-digit code, emailed via SMTP, or sent
 *       over WhatsApp Cloud API. POST /api/auth/verify-code -> redeems it.
 *       The account-takeover flaw in this flow (code returned in the response,
 *       and codes redeemable against any account) was fixed in a prior session.
 *   - No server (static GitHub Pages deploy):
 *       LoginModal falls back to a device-local single-use recovery code, since
 *       a static host cannot send email or WhatsApp at all.
 *
 * To adopt genuine Firebase Auth you would need to migrate every existing
 * account into Firebase Auth first, then switch login() in AppContext over to
 * signInWithEmailAndPassword(). Until that migration happens, this file is
 * intentionally unused.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
