import { Metadata } from 'next';
import Link from 'next/link';

import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Log In'
};

export default function LoginPage() {
  return (
    <main className='mx-auto w-full max-w-md space-y-8 rounded-xl border p-6'>
      <h1 className='text-2xl font-bold'>Log In</h1>
      <LoginForm />
      <p className='text-center text-sm text-gray-500'>
        Don&apos;t have an account?{' '}
        <Link href='/signup' className='text-primary'>
          Sign up
        </Link>
      </p>
    </main>
  );
}
