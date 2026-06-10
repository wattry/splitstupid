import { Client, OAuth2User } from 'splitwise-ts';

const user = new OAuth2User({
  clientId: import.meta.env.VITE_SPLIT_WISE_KEY,
  clientSecret: import.meta.env.VITE_SPLIT_WISE_SECRET,
});

export async function login() {
  try {
    const res = await user.requestAccessToken();

    console.log('res', res);
    return res;
  } catch (error: unknown) {
    const e = error as Error;

    console.error('Unable to authenticate user:', e.message, e.stack);
  }
}

export const splitClient = new Client(user);
