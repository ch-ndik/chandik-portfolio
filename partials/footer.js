/* Shared footer — edit here, every page updates.
   {{root}} is replaced with the path to the site root, so links work from any page. */
window.SITE_PARTIALS = window.SITE_PARTIALS || {};
window.SITE_PARTIALS.footer = `
<footer class="footer">
  <div class="container footer__inner">
    <p class="eyebrow">Chandik A Chandran • 2026</p>
    <div class="footer__links">
      <a class="btn btn--primary" href="{{root}}files/chandik-chandran-resume.pdf" target="_blank" rel="noopener">Download Resume</a>
      <a class="btn btn--secondary" href="https://www.instagram.com/chandik_/" target="_blank" rel="noopener">Instagram</a>
      <a class="btn btn--secondary" href="https://www.linkedin.com/in/chandik/" target="_blank" rel="noopener">LinkedIn</a>
      <a class="btn btn--secondary" href="mailto:chandikachandran@gmail.com">Mail</a>
    </div>
  </div>
</footer>`;
