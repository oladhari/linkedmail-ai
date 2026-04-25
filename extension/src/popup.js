const API_BASE = "https://modest-wonder-production-84f9.up.railway.app"; // Change to your deployed URL before publishing

// --- DOM refs ---
const authScreen = document.getElementById("auth-screen");
const mainScreen = document.getElementById("main-screen");
const upgradeScreen = document.getElementById("upgrade-screen");

const authError = document.getElementById("auth-error");
const btnGoogleSignin = document.getElementById("btn-google-signin");
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
let isGenerating = false;

// --- Init ---
const loadingScreen = document.getElementById("loading-screen");

async function init() {
  show(loadingScreen);
  const { token, cachedUser } = await chrome.storage.local.get(["token", "cachedUser"]);
  if (!token) {
    show(authScreen);
    return;
  }
  currentToken = token;
  if (cachedUser) {
    // Show instantly from cache, then validate token in background
    currentUser = cachedUser;
    updateUsageUI();
    show(mainScreen);
    await detectLinkedInProfile();
    refreshUserInBackground();
  } else {
    await loadUserAndShow();
  }
}

function show(screen) {
  [authScreen, mainScreen, upgradeScreen, loadingScreen].forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

// --- Auth ---
btnGoogleSignin.addEventListener("click", signInWithGoogle);
btnLogout.addEventListener("click", logout);

async function getGoogleToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(token);
    });
  });
}

function removeCachedToken(token) {
  return new Promise((resolve) => chrome.identity.removeCachedAuthToken({ token }, resolve));
}

async function signInWithGoogle() {
  btnGoogleSignin.disabled = true;
  btnGoogleSignin.textContent = "Signing in...";
  hideError(authError);

  try {
    let accessToken = await getGoogleToken(true);

    let res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    });

    // Cached token may be expired — remove it and retry once with a fresh one
    if (!res.ok) {
      await removeCachedToken(accessToken);
      accessToken = await getGoogleToken(true);
      res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Sign-in failed");

    currentToken = data.token;
    await chrome.storage.local.set({ token: currentToken });
    await loadUserAndShow(); // also saves cachedUser
  } catch (err) {
    showError(authError, err.message);
  } finally {
    btnGoogleSignin.disabled = false;
    btnGoogleSignin.innerHTML = '<img src="icons/google.svg" width="18" height="18" alt="Google" /> Sign in with Google';
  }
}

async function logout() {
  await chrome.storage.local.remove(["token", "cachedUser"]);
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
    await chrome.storage.local.set({ cachedUser: currentUser });
    updateUsageUI();
    show(mainScreen);
    await detectLinkedInProfile();
  } catch {
    await logout();
  }
}

async function refreshUserInBackground() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (res.ok) {
      const fresh = await res.json();
      await chrome.storage.local.set({ cachedUser: fresh });
      if (!isGenerating) {
        currentUser = fresh;
        updateUsageUI();
      }
    } else {
      await logout();
    }
  } catch {
    // Network error — keep showing cached data
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
    console.log("Scraped profile:", JSON.stringify(currentProfile, null, 2));
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
  const isPro = currentUser?.plan === "pro";
  const used = currentUser?.usage_count || 0;
  if (!isPro && used >= 5) {
    showError(generateError, "Free limit reached (5/month). Upgrade to Pro for unlimited emails.");
    return;
  }

  if (!currentProfile && !await recheckProfile()) return;

  hideError(generateError);
  setGenerating(true);
  isGenerating = true;

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
    await chrome.storage.local.set({ cachedUser: { ...currentUser } });
    updateUsageUI();
  } catch (err) {
    showError(generateError, err.message);
  } finally {
    isGenerating = false;
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
