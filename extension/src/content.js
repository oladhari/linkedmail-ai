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

    // ── EXPERIENCE ────────────────────────────────────────────────────
    const expIdx = lines.findIndex(l => l.toLowerCase() === "experience");
    if (expIdx >= 0) {
      const expLines = [];
      for (let i = expIdx + 1; i < Math.min(expIdx + 40, lines.length); i++) {
        const line = lines[i];
        if (line.toLowerCase().match(/^(education|skills|services|activity|licenses)/)) break;
        expLines.push(line);
      }
      // Group into experiences (role + company + duration patterns)
      let current = [];
      expLines.forEach(line => {
        if (line.match(/\d+\s*(yr|mo|year|month)/i)) {
          if (current.length > 0) {
            result.experiences.push(current.slice(0, 3).join(" | "));
            current = [];
          }
        } else if (line.length > 3 && line.length < 120) {
          current.push(line);
        }
      });
      if (current.length > 0) result.experiences.push(current.slice(0, 3).join(" | "));
      result.experiences = result.experiences.slice(0, 4);
    }

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
