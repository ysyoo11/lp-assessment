'use client';

import { CheckIcon, XIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)'
        } as React.CSSProperties
      }
      icons={{
        success: (
          <div className='relative size-5 rounded-full bg-[#96D381]'>
            <CheckIcon className='absolute top-1/2 left-[55%] size-4 -translate-x-1/2 -translate-y-1/2 stroke-2 text-white' />
          </div>
        ),
        error: (
          <div className='relative size-5 rounded-full bg-[#EE6B7E]'>
            <XIcon className='absolute top-1/2 left-[55%] size-4 -translate-x-1/2 -translate-y-1/2 stroke-2 text-white' />
          </div>
        )
      }}
      data-testid='sonner'
      {...props}
    />
  );
};

export { Toaster };
