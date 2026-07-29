// script.js
/* =========================================================
   Cloud Fun Facts Generator — frontend logic (vanilla JS)
   Backend: AWS API Gateway -> Lambda (Python) -> DynamoDB
   ========================================================= */

// DO NOT CHANGE — production backend endpoint
const API_URL = "https://5uk1h0n1y3.execute-api.ap-south-1.amazonaws.com/funfact";

/* ---------- DOM references ---------- */
const generateBtn = document.getElementById("generateBtn");
const btnLabel = document.getElementById("btnLabel");
const factBody = document.getElementById("factBody");
const factCounter = document.getElementById("factCounter");
const alertBox = document.getElementById("alert");
const alertText = document.getElementById("alertText");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("statusText");

let factCount = 0;
let isLoading = false;

/* ---------- UI helpers ---------- */

/** Update the connection status pill. */
function setStatus(state) {
  statusEl.dataset.state = state;
  statusText.textContent = state === "connected" ? "API Connected" : "Connection Error";
}

/** Show / hide the error alert. */
function showAlert(message) {
  alertText.textContent = message;
  alertBox.hidden = false;
}

function hideAlert() {
  alertBox.hidden = true;
}

/** Render the skeleton + pulse loading state inside the fact card. */
function renderSkeleton() {
  factBody.setAttribute("aria-busy", "true");
  factBody.innerHTML = `
    <div class="skeleton">
      <div class="skeleton__line"></div>
      <div class="skeleton__line"></div>
      <div class="skeleton__line"></div>
      <span class="loading-note">
        <span class="mini-spinner" aria-hidden="true"></span>
        Querying DynamoDB via AWS Lambda…
      </span>
    </div>`;
}

/** Render a fact with a fade-in animation. */
function renderFact(text) {
  factBody.setAttribute("aria-busy", "false");
  factBody.innerHTML = "";
  const p = document.createElement("p");
  p.className = "fact-text";
  p.textContent = text;
  factBody.appendChild(p);
}

/** Toggle the button between idle and loading states. */
function setLoading(loading) {
  isLoading = loading;
  generateBtn.disabled = loading;
  generateBtn.classList.toggle("is-loading", loading);
  generateBtn.setAttribute("aria-busy", String(loading));
  btnLabel.textContent = loading ? "Generating..." : "Generate Fun Fact";
}

/**
 * The Lambda may return a plain string, { fact }, { funfact }, { body: "..." },
 * so normalise defensively without touching the backend.
 */
function extractFact(payload) {
  if (typeof payload === "string") {
    try {
      return extractFact(JSON.parse(payload));
    } catch {
      return payload;
    }
  }
  if (payload && typeof payload === "object") {
    if (typeof payload.body === "string") return extractFact(payload.body);
    const key = ["fact", "funfact", "funFact", "message", "data", "text"].find(
      (k) => typeof payload[k] === "string"
    );
    if (key) return payload[key];
  }
  return null;
}

/* ---------- Main action ---------- */
async function getFunFact() {
  if (isLoading) return;

  hideAlert();
  setLoading(true);
  renderSkeleton();
  factCounter.textContent = "Loading";

  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

    const raw = await response.text();
    let payload = raw;
    try {
      payload = JSON.parse(raw);
    } catch {
      /* plain-text response is fine */
    }

    const fact = extractFact(payload);
    if (!fact) throw new Error("The API response did not contain a fact.");

    renderFact(fact);
    factCount += 1;
    factCounter.textContent = `Fact #${factCount}`;
    setStatus("connected");
  } catch (error) {
    console.error("[CloudFacts]", error);
    setStatus("error");
    showAlert(
      "We couldn't reach the AWS API Gateway endpoint. Check your connection and try again."
    );
    factCounter.textContent = "Retry";
    factBody.setAttribute("aria-busy", "false");
    factBody.innerHTML = `
      <p class="fact-empty">
        Nothing to show yet — press <strong>Generate Fun Fact</strong> to retry the request.
      </p>`;
  } finally {
    setLoading(false);
  }
}

/* ---------- Events ---------- */
generateBtn.addEventListener("click", getFunFact);
