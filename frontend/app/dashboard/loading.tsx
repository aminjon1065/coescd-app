export default function Loading() {
  // Or a custom loading skeleton component
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary" />
    </div>
  );
}