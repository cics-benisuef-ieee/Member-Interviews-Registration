/** Full-bleed chrome for the public hall display: dark, legible across a room. */
export default function TvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ieee-navy px-6 py-8 text-white md:px-10 md:py-10">
      <main className="mx-auto max-w-7xl">{children}</main>
    </div>
  );
}
