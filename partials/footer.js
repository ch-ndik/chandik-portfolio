/* Shared footer — edit here, every page updates.
   {{root}} is replaced with the path to the site root, so links work from any page.
   Same layout as the homepage footer (.sheet-footer), on black (.sheet-footer--dark). */
window.SITE_PARTIALS = window.SITE_PARTIALS || {};
window.SITE_PARTIALS.footer = `
<footer class="sheet-footer sheet-footer--dark">
  <div class="container">
    <p class="sheet-footer__cta">Let’s talk. <a href="mailto:chandikachandran@gmail.com">chandikachandran@gmail.com</a></p>
    <div class="sheet-footer__row">
      <p>© 2026 Chandik A Chandran</p>
      <nav class="intro-sheet__links" aria-label="Footer links">
        <a href="{{root}}files/chandik-chandran-resume.pdf" target="_blank" rel="noopener">Resume</a>
        <a href="https://www.linkedin.com/in/chandik/" target="_blank" rel="noopener">LinkedIn</a>
        <a href="https://www.instagram.com/chandik_/" target="_blank" rel="noopener">Instagram</a>
        <a href="mailto:chandikachandran@gmail.com">Email</a>
      </nav>
    </div>
  </div>
</footer>`;
