import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export default function Skeleton({ className, rounded = '2xl' }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden bg-stone-800/50',
        `rounded-${rounded}`,
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          animation: 'shimmer 1.8s infinite',
        }}
      />
    </div>
  );
}
