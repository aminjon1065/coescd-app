export default function DocumentEditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="-m-4 overflow-hidden h-[calc(100vh-3.5rem)]">{children}</div>;
}
