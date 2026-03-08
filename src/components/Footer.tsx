export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Portfolio. All rights reserved.
        </p>
        <a
          href="/admin"
          className="text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          Admin
        </a>
      </div>
    </footer>
  );
}
