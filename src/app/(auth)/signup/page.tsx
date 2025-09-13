import { Metadata } from 'next';
import Link from 'next/link';

import SignupForm from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up'
};

export default function SignupPage() {
  return (
    <main className='mx-auto w-full max-w-md space-y-8 rounded-xl border p-6'>
      <h1 className='text-2xl font-bold'>Sign Up</h1>
      <SignupForm />
      <p className='text-center text-sm text-gray-500'>
        Already have an account?{' '}
        <Link href='/login' className='text-primary'>
          Log in
        </Link>
      </p>
    </main>
  );
}
