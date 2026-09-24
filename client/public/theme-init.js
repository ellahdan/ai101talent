// Applies the saved (or system) theme before first paint to avoid a flash.
// Kept as a file rather than an inline script so the Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem('ai101-theme')
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark')
} catch (e) {}
