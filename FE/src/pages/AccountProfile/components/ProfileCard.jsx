function ProfileCard({ account, firm }) {
  const initials = (account?.name || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="flex rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex gap-6">
        <div className="flex h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-primary bg-primary/10">
          {account?.avatarUrl ? (
            <img
              src={account.avatarUrl}
              alt={account.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="m-auto text-2xl font-bold text-primary">
              {initials}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="truncate text-xl font-semibold text-text-main">
            {account?.name || "—"}
          </h2>
          {firm?.firmName && (
            <p className="truncate text-sm text-text-muted">{firm.firmName}</p>
          )}

          <div className="mt-1 flex flex-wrap gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
              {account?.role || "member"}
            </span>
            {account?.plan && (
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-dark">
                {account.plan}
              </span>
            )}
          </div>

          {firm && (
            <p className="mt-1 text-xs text-text-muted">
              {firm.openStoreCount} of {firm.storeCount} stores open ·{" "}
              {firm.loggedDays} day{firm.loggedDays === 1 ? "" : "s"} logged
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProfileCard;
