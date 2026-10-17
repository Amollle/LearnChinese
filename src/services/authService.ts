import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Accounts and login.
 *
 * TEMPORARY: accounts are stored only on this phone. When the backend is
 * added, write an `apiAuthService` that implements `AuthService` (calling
 * your server) and swap it in `AuthContext.tsx`. Screens won't need changes.
 */
export type User = {
  id: string;
  name: string;
  email: string;
  placementDone: boolean;
  level: string | null;
  startLessonId: string | null;
};

export interface AuthService {
  getCurrentUser(): Promise<User | null>;
  signUp(name: string, email: string, password: string): Promise<User>;
  logIn(email: string, password: string): Promise<User>;
  logOut(): Promise<void>;
  updateUser(user: User): Promise<void>;
  /** Confirm a new account with the code from the confirmation email. */
  verifyEmail(email: string, code: string): Promise<User>;
  /** Send the confirmation code again. */
  resendCode(email: string): Promise<void>;
}

/** Thrown by signUp/logIn when the account exists but the email isn't confirmed yet. */
export class NeedsVerificationError extends Error {
  constructor(public email: string, message: string) {
    super(message);
    this.name = 'NeedsVerificationError';
  }
}

type StoredAccount = { user: User; passwordHash: string };

const ACCOUNTS_KEY = 'learnchinese.accounts.v1';
const SESSION_KEY = 'learnchinese.session.v1';

// Simple placeholder hash so passwords aren't kept as plain text on the device.
// The real backend must do proper password hashing on the server.
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

async function readAccounts(): Promise<Record<string, StoredAccount>> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeAccounts(accounts: Record<string, StoredAccount>) {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

const normalizeEmail = (e: string) => e.trim().toLowerCase();

export const localAuthService: AuthService = {
  async getCurrentUser() {
    try {
      const email = await AsyncStorage.getItem(SESSION_KEY);
      if (!email) return null;
      const accounts = await readAccounts();
      return accounts[email]?.user ?? null;
    } catch {
      return null;
    }
  },

  async signUp(name, email, password) {
    const key = normalizeEmail(email);
    const accounts = await readAccounts();
    if (accounts[key]) throw new Error('An account with this email already exists. Try logging in.');
    const user: User = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      email: key,
      placementDone: false,
      level: null,
      startLessonId: null,
    };
    accounts[key] = { user, passwordHash: hash(password) };
    await writeAccounts(accounts);
    await AsyncStorage.setItem(SESSION_KEY, key);
    return user;
  },

  async logIn(email, password) {
    const key = normalizeEmail(email);
    const accounts = await readAccounts();
    const account = accounts[key];
    if (!account || account.passwordHash !== hash(password)) {
      throw new Error('Wrong email or password.');
    }
    await AsyncStorage.setItem(SESSION_KEY, key);
    return account.user;
  },

  async logOut() {
    await AsyncStorage.removeItem(SESSION_KEY);
  },

  async verifyEmail() {
    throw new Error('Email confirmation needs the online database.');
  },

  async resendCode() {
    // nothing to send in offline mode
  },

  async updateUser(user) {
    const accounts = await readAccounts();
    const account = accounts[user.email];
    if (!account) return;
    accounts[user.email] = { ...account, user };
    await writeAccounts(accounts);
  },
};
