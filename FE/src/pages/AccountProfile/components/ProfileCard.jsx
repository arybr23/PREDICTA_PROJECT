function ProfileCard() {
  return (
    <section className="flex rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex gap-6">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-primary flex bg-primary/10">
          <img
            src="https://i.pravatar.cc/150?img=3"
            alt="Profile"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-text-main">John Doe</h2>
          <p className="text-sm text-text-muted">Bistro Nusantara Group</p>

          <div className="mt-1 flex gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Admin
            </span>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              Premium
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfileCard;
