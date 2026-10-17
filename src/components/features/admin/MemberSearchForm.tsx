'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Form';

/** Member search — updates the ?q= URL parameter. */
export function MemberSearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(query ? `/admin/members?q=${encodeURIComponent(query)}` : '/admin/members');
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or phone…"
        aria-label="Search members"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-ieee-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ieee-navy"
      >
        <Search className="h-4 w-4" />
        Search
      </button>
    </form>
  );
}
