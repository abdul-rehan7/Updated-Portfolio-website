export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()}  
        <a href="/admin" className='px-1'>
          Portfolio
        </a>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}