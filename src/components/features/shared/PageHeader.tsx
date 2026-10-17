interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned slot, e.g. counts or an action. */
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-ieee-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ieee-gray">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
