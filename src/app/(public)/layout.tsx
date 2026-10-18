/** Shared chrome for the public pages: navy header + centered white card. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ieee-navy px-6 py-5 text-white">
        <p className="text-xs font-semibold tracking-widest text-ieee-orange uppercase">
          CS/CIS Beni-Suef Chapter
        </p>
        <p className="mt-1 text-lg font-bold">Member Interviews</p>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10">{children}</main>
    </div>
  );
}
