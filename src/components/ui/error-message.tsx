import { cn } from '@/lib/utils';

type Props = {
  message: string;
  className?: string;
} & React.HTMLAttributes<HTMLParagraphElement>;

export default function ErrorMessage({ message, className, ...props }: Props) {
  return (
    <p className={cn('text-sm text-red-400', className)} {...props}>
      {message}
    </p>
  );
}
