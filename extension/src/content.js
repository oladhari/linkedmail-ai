// Scrapes LinkedIn profile data and makes it available to the popup
(function () {
  function scrapeProfile() {
    const get = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.innerText.trim() : "";
    };

    const name = get("h1.text-heading-xlarge") || get("h1");

    const headline = get(".text-body-medium.break-words");

    // Company and title from experience section
    const experienceItems = document.querySelectorAll(
      "#experience ~ .pvs-list__outer-container li"
    );
    let currentTitle = "";
    let currentCompany = "";
    if (experienceItems.length > 0) {
      const first = experienceItems[0];
      const spans = first.querySelectorAll("span[aria-hidden='true']");
      if (spans[0]) currentTitle = spans[0].innerText.trim();
      if (spans[1]) currentCompany = spans[1].innerText.trim();
    }

    // Location
    const location = get(".text-body-small.inline.t-black--light.break-words");

    // About section
    const about = get("#about ~ .pvs-list__outer-container .visually-hidden")
      || get(".pv-shared-text-with-see-more span[aria-hidden='true']")
      || "";

    return {
      name,
      headline,
      currentTitle,
      currentCompany,
      location,
      about: about.slice(0, 500), // limit tokens
      url: window.location.href,
    };
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeProfile") {
      sendResponse(scrapeProfile());
    }
  });
})();
