import { cn } from '@/lib/utils';

type Props = {
  message: string;
  className?: string;
};

export default function ErrorMessage({ message, className }: Props) {
  return <p className={cn('text-sm text-red-400', className)}>{message}</p>;
}
