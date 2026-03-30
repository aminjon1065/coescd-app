'use client';

export default function Loading() {
  return (
    <div
      role="status"
      className="flex h-screen w-screen items-center justify-center bg-background transition-colors"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
