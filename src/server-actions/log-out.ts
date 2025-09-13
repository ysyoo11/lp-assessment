'use server';

import { redirect } from 'next/navigation';

import { removeUserFromSession } from '@/utils/session';

export async function logOut() {
  try {
    await removeUserFromSession();
  } catch (error) {
    console.error(error);
    return {
      error: 'Failed to log out'
    };
  }

  return redirect('/login');
}
