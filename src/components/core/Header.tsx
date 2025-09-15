'use client';

import { logOut } from '@/server-actions/log-out';

import Logo from '../svg/Logo';
import { VERIFIER_FORM_KEY } from '../verifier/VerifierForm';

export default function Header() {
  const clearFormData = () => {
    localStorage.removeItem(VERIFIER_FORM_KEY);
  };

  return (
    <header className='sticky top-0 z-30 border-b bg-white px-4 py-2'>
      <div className='flex items-center justify-between'>
        <Logo className='w-32 sm:w-40' />
        <form
          action={async () => {
            clearFormData();
            await logOut();
          }}
        >
          <button
            className='cursor-pointer text-sm hover:opacity-80'
            type='submit'
            data-testid='logout-button'
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
