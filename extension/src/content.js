// LinkedMail AI - Profile Scraper v3
(function () {

  function scrapeProfile() {
    const result = {
      name: "",
      headline: "",
      currentTitle: "",
      currentCompany: "",
      location: "",
      about: "",
      experiences: [],
      skills: "",
      education: "",
      url: window.location.href,
      _debug: {}
    };

    // ── NAME from page title (most reliable) ──────────────────────────
    // LinkedIn title format: "Michel Boretti | LinkedIn" or "(1) Michel Boretti | LinkedIn"
    const rawTitle = document.title || "";
    result._debug.title = rawTitle;

    const titleMatch = rawTitle.replace(/^\(\d+\)\s*/, "").match(/^(.+?)\s*[\|\-–]/);
    if (titleMatch) result.name = titleMatch[1].trim();

    // ── GRAB ALL TEXT FROM THE PAGE ───────────────────────────────────
    // Get all meaningful text nodes - more reliable than CSS selectors
    const allText = document.body.innerText || "";
    const lines = allText.split("\n").map(l => l.trim()).filter(l => l.length > 1);
    result._debug.firstLines = lines.slice(0, 20);

    // ── HEADLINE ──────────────────────────────────────────────────────
    // Find the line right after the name
    if (result.name) {
      const nameIdx = lines.findIndex(l => l === result.name || l.includes(result.name));
      if (nameIdx >= 0) {
        // Headline is usually within the next 5 lines, skip short noise
        for (let i = nameIdx + 1; i < Math.min(nameIdx + 6, lines.length); i++) {
          const line = lines[i];
          if (line.length > 10 && !line.match(/^\d/) && !line.match(/^(1st|2nd|3rd|Contact|Connect|Message|Follow)/i)) {
            result.headline = line;
            break;
          }
        }
      }
    }

    // ── CURRENT TITLE / COMPANY from headline ─────────────────────────
    if (result.headline) {
      if (result.headline.includes("@")) {
        const parts = result.headline.split("@");
        result.currentTitle = parts[0].trim();
        result.currentCompany = parts[1].trim();
      } else if (result.headline.includes(" at ")) {
        const parts = result.headline.split(" at ");
        result.currentTitle = parts[0].trim();
        result.currentCompany = parts[1].trim();
      } else if (result.headline.includes("|")) {
        const parts = result.headline.split("|");
        result.currentTitle = parts[0].trim();
        result.currentCompany = parts[1]?.trim() || "";
      } else {
        result.currentTitle = result.headline;
      }
    }

    // ── ABOUT ─────────────────────────────────────────────────────────
    // Find "About" section in text
    const aboutIdx = lines.findIndex(l => l.toLowerCase() === "about");
    if (aboutIdx >= 0) {
      const aboutLines = [];
      for (let i = aboutIdx + 1; i < Math.min(aboutIdx + 15, lines.length); i++) {
        const line = lines[i];
        if (line.toLowerCase().match(/^(experience|education|skills|services|activity)/)) break;
        if (line.length > 5) aboutLines.push(line);
      }
      result.about = aboutLines.join(" ").slice(0, 800);
    }

    // ── EXPERIENCE (DOM-based via data-testid) ────────────────────────
    const descSpans = document.querySelectorAll('[data-testid="expandable-text-box"]');
    result._debug.descSpanCount = descSpans.length;

    descSpans.forEach(span => {
      if (result.experiences.length >= 3) return;

      // Only process experience entries — they always have a date range in their container
      let containerCheck = span.parentElement;
      let hasDate = false;
      for (let d = 0; d < 10; d++) {
        if (!containerCheck) break;
        if (containerCheck.textContent.match(/\d{4}\s*[-–]\s*(Present|\d{4})/i)) {
          hasDate = true;
          break;
        }
        containerCheck = containerCheck.parentElement;
      }
      if (!hasDate) return;

      const desc = span.textContent.replace(/…\s*more\s*$/i, "").trim().slice(0, 300);

      // Walk up to find the job card container (has title + company paragraphs)
      let container = span.parentElement;
      for (let d = 0; d < 8; d++) {
        if (!container) break;
        const paras = container.querySelectorAll("p");
        if (paras.length >= 2) {
          const title = paras[0]?.textContent?.trim() || "";
          const company = (paras[1]?.textContent || "").replace(/\s*·.*$/, "").trim();
          if (title.length > 3 && !title.match(/^\d/) && !title.match(/\d{4}/)) {
            const entry = company && company !== title ? `${title} at ${company}` : title;
            result.experiences.push(desc ? `${entry}: ${desc}` : entry);
            return;
          }
        }
        container = container.parentElement;
      }
    });

    // ── LOCATION ──────────────────────────────────────────────────────
    // Location usually appears near the top, contains country/city words
    const locationCandidates = lines.slice(0, 30).filter(l =>
      l.length > 3 && l.length < 60 &&
      (l.match(/United States|Japan|Thailand|France|Germany|United Kingdom|Canada|Australia|Brazil|India|Singapore|Netherlands|Spain|Italy|Portugal|Sweden|Norway|Denmark|Finland/) ||
       l.match(/^[A-Za-z\s]+,\s+[A-Za-z\s]+$/))
    );
    if (locationCandidates.length > 0) result.location = locationCandidates[0];

    // ── SKILLS ────────────────────────────────────────────────────────
    const skillIdx = lines.findIndex(l => l.toLowerCase() === "skills");
    if (skillIdx >= 0) {
      const skillLines = [];
      for (let i = skillIdx + 1; i < Math.min(skillIdx + 20, lines.length); i++) {
        const line = lines[i];
        if (line.toLowerCase().match(/^(education|experience|activity|services)/)) break;
        if (line.length > 2 && line.length < 50) skillLines.push(line);
      }
      result.skills = skillLines.slice(0, 8).join(", ");
    }

    return result;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeProfile") {
      sendResponse(scrapeProfile());
    }
    if (request.action === "ping") {
      sendResponse({ ok: true });
    }
  });

})();
