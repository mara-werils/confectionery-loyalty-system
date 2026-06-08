import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export default function Skeleton({ className, rounded = '2xl' }: SkeletonProps) {
  return (
    <div
      className={clsx('skeleton', `rounded-${rounded}`, className)}
    />
  );
}
