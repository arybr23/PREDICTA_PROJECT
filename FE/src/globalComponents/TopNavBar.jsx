function TopNavBar() {
  return (
    <nav className="sticky top-0 z-30 ml-60 flex items-center justify-end border-b border-border bg-surface px-4 py-3 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Connected
        </span>
        <span className="rounded-full bg-bg px-2.5 py-1 text-xs font-medium text-text-muted">
          Aug 26, 2026
        </span>
      </div>
    </nav>
  );
}

export default TopNavBar;
