const API_BASE = "http://localhost:3001"; // Change to your deployed URL before publishing

// --- DOM refs ---
const authScreen = document.getElementById("auth-screen");
const mainScreen = document.getElementById("main-screen");
const upgradeScreen = document.getElementById("upgrade-screen");

const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authError = document.getElementById("auth-error");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");
const btnLogout = document.getElementById("btn-logout");

const profileCard = document.getElementById("profile-card");
const profileName = document.getElementById("profile-name");
const profileMeta = document.getElementById("profile-meta");

const toneSelect = document.getElementById("tone-select");
const purposeSelect = document.getElementById("purpose-select");
const customContext = document.getElementById("custom-context");

const btnGenerate = document.getElementById("btn-generate");
const btnGenerateText = document.getElementById("btn-generate-text");
const btnSpinner = document.getElementById("btn-spinner");

const notLinkedin = document.getElementById("not-linkedin");
const resultBox = document.getElementById("result-box");
const emailOutput = document.getElementById("email-output");
const btnCopy = document.getElementById("btn-copy");
const generateError = document.getElementById("generate-error");

const usageText = document.getElementById("usage-text");
const btnUpgrade = document.getElementById("btn-upgrade");
const userStatus = document.getElementById("user-status");

const btnBackFromUpgrade = document.getElementById("btn-back-from-upgrade");

// --- State ---
let currentToken = null;
let currentProfile = null;
let currentUser = null;

// --- Init ---
async function init() {
  const { token } = await chrome.storage.local.get("token");
  if (token) {
    currentToken = token;
    await loadUserAndShow();
  } else {
    show(authScreen);
  }
}

function show(screen) {
  [authScreen, mainScreen, upgradeScreen].forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

// --- Auth ---
btnLogin.addEventListener("click", () => doAuth("login"));
btnRegister.addEventListener("click", () => doAuth("register"));
btnLogout.addEventListener("click", logout);

async function doAuth(mode) {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  if (!email || !password) return showError(authError, "Email and password required.");

  setLoading(btnLogin, true);
  try {
    const res = await fetch(`${API_BASE}/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Auth failed");

    currentToken = data.token;
    await chrome.storage.local.set({ token: currentToken });
    hideError(authError);
    await loadUserAndShow();
  } catch (err) {
    showError(authError, err.message);
  } finally {
    setLoading(btnLogin, false);
  }
}

async function logout() {
  await chrome.storage.local.remove("token");
  currentToken = null;
  currentUser = null;
  currentProfile = null;
  show(authScreen);
}

// --- Load user + show main ---
async function loadUserAndShow() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!res.ok) throw new Error("Session expired");
    currentUser = await res.json();
    updateUsageUI();
    show(mainScreen);
    await detectLinkedInProfile();
  } catch {
    await logout();
  }
}

function updateUsageUI() {
  if (!currentUser) return;
  const isPro = currentUser.plan === "pro";
  userStatus.textContent = isPro ? "Pro" : "Free";
  userStatus.className = isPro ? "badge badge-pro" : "badge badge-free";

  if (isPro) {
    usageText.textContent = "Unlimited emails (Pro)";
    btnUpgrade.classList.add("hidden");
  } else {
    const used = currentUser.usage_count || 0;
    usageText.textContent = `${used} / 5 emails used this month`;
    btnUpgrade.classList.remove("hidden");
  }
}

// --- LinkedIn profile detection ---
async function detectLinkedInProfile() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes("linkedin.com/in/")) {
    notLinkedin.classList.remove("hidden");
    profileCard.classList.add("hidden");
    btnGenerate.disabled = true;
    return;
  }

  notLinkedin.classList.add("hidden");
  btnGenerate.disabled = false;

  try {
    currentProfile = await chrome.tabs.sendMessage(tab.id, { action: "scrapeProfile" });
    if (currentProfile?.name) {
      profileName.textContent = currentProfile.name;
      profileMeta.textContent = [currentProfile.currentTitle, currentProfile.currentCompany]
        .filter(Boolean).join(" at ") || currentProfile.headline || "";
      profileCard.classList.remove("hidden");
    }
  } catch {
    // Content script not injected yet (page still loading) — soft fail
  }
}

// --- Generate email ---
btnGenerate.addEventListener("click", generateEmail);

async function generateEmail() {
  if (!currentProfile && !await recheckProfile()) return;

  const isPro = currentUser?.plan === "pro";
  const used = currentUser?.usage_count || 0;
  if (!isPro && used >= 5) {
    showError(generateError, "Free limit reached (5/month). Upgrade to Pro for unlimited emails.");
    return;
  }

  hideError(generateError);
  setGenerating(true);

  try {
    const res = await fetch(`${API_BASE}/email/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({
        profile: currentProfile,
        tone: toneSelect.value,
        purpose: purposeSelect.value,
        context: customContext.value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Generation failed");

    emailOutput.textContent = data.email;
    resultBox.classList.remove("hidden");
    currentUser.usage_count = data.usage_count;
    updateUsageUI();
  } catch (err) {
    showError(generateError, err.message);
  } finally {
    setGenerating(false);
  }
}

async function recheckProfile() {
  await detectLinkedInProfile();
  return !!currentProfile;
}

// --- Copy ---
btnCopy.addEventListener("click", () => {
  navigator.clipboard.writeText(emailOutput.textContent);
  btnCopy.textContent = "Copied!";
  setTimeout(() => (btnCopy.textContent = "Copy"), 1500);
});

// --- Upgrade ---
btnUpgrade.addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/stripe/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    chrome.tabs.create({ url: data.url });
  } catch (err) {
    showError(generateError, err.message);
  }
});

btnBackFromUpgrade.addEventListener("click", () => show(mainScreen));

// Poll for upgrade completion (user returns to extension after Stripe)
chrome.tabs.onActivated.addListener(async () => {
  if (currentToken) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (res.ok) {
      currentUser = await res.json();
      if (currentUser.plan === "pro") {
        updateUsageUI();
        show(upgradeScreen);
      }
    }
  }
});

// --- Helpers ---
function setGenerating(on) {
  btnGenerate.disabled = on;
  btnGenerateText.textContent = on ? "Generating..." : "Generate Email";
  btnSpinner.classList.toggle("hidden", !on);
}

function setLoading(btn, on) {
  btn.disabled = on;
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideError(el) {
  el.textContent = "";
  el.classList.add("hidden");
}

// --- Start ---
init();
