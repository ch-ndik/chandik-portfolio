/* Shared nav — edit here, every page updates.
   {{root}} is replaced with the path to the site root, so links work from any page. */
window.SITE_PARTIALS = window.SITE_PARTIALS || {};
window.SITE_PARTIALS.nav = `
<nav class="nav" aria-label="Primary">
  <div class="container nav__inner">
    <a class="nav__logo" href="{{root}}index.html">chandik.</a>
    <div class="nav__links">
      <a class="nav__link nav__link--hide-sm" href="{{root}}index.html#work" data-nav="work">Work</a>
      <a class="nav__link" href="{{root}}files/chandik-chandran-resume.pdf" target="_blank" rel="noopener">Resume</a>
      <a class="btn btn--primary btn--sm" href="mailto:chandikachandran@gmail.com">Get in touch</a>
    </div>
  </div>
</nav>`;
