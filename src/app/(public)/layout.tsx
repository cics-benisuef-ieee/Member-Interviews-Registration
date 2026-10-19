/** Shared chrome for the public pages: navy header + centered white card. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="relative overflow-hidden bg-gradient-navy px-6 py-5 text-white shadow-md shadow-ieee-navy/20">
        <p className="text-xs font-semibold tracking-widest text-ieee-orange uppercase">
          CS/CIS Beni-Suef Chapter
        </p>
        <p className="mt-1 text-lg font-bold">Member Interviews</p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-gradient-orange" />
      </header>

      <main className="mx-auto max-w-lg px-4 py-10">{children}</main>
    </div>
  );
}
