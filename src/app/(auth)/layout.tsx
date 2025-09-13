export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='flex h-screen w-screen items-center justify-center px-4'>
      {children}
    </div>
  );
}
