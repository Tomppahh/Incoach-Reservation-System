const APP_STORAGE_KEY = "incoachAppStateV1";
const DEFAULT_SESSION_SECONDS = 30 * 60;

let mainElement = null;
let initialMarkup = null;
let queueListElement = null;
let queueEmptyMessage = null;
let appState = {
  deviceCount: null,
  queue: [],
  tablets: [],
  view: "welcome",
};
const timerIntervals = new Map();

function main() {
  mainElement = document.querySelector("main");
  initialMarkup = mainElement.innerHTML;

  const storedState = loadAppState();
  appState = { ...appState, ...storedState };

  if (appState.view === "tablet" && typeof appState.deviceCount === "number") {
    showTabletView(appState.deviceCount, { skipSave: true });
  } else {
    showWelcomeView({ skipSave: true });
  }
}

function showWelcomeView(options = {}) {
  clearAllTimers();
  mainElement.innerHTML = initialMarkup;
  bindWelcomeHandlers();
  queueListElement = null;
  queueEmptyMessage = null;
  const input = document.getElementById("deviceCountInput");
  if (input && typeof appState.deviceCount === "number") {
    input.value = appState.deviceCount;
  }
  appState.view = "welcome";
  if (!options.skipSave) {
    saveAppState();
  }
}

function bindWelcomeHandlers() {
  const confirmButton = document.getElementById("deviceAmountConfirmButton");
  if (confirmButton) {
    confirmButton.addEventListener("click", handleConfirm);
  }
}

function handleConfirm(event) {
  event.preventDefault();
  const value = document.getElementById("deviceCountInput").value;
  const deviceCount = Number.parseInt(value, 10);
  if (Number.isNaN(deviceCount) || deviceCount < 1 || deviceCount > 15) {
    alert("Please enter a number between 1 and 15.");
    return;
  }
  appState.deviceCount = deviceCount;
  appState.view = "tablet";
  ensureTabletStates(deviceCount);
  showTabletView(deviceCount);
}

function showTabletView(deviceCount, options = {}) {
  clearAllTimers();
  ensureTabletStates(deviceCount);

  mainElement.innerHTML = "";
  queueListElement = null;
  queueEmptyMessage = null;

  const container = document.createElement("div");
  container.className = "tablet-view";

  const heading = document.createElement("h2");
  heading.textContent = "Tablet view";
  container.appendChild(heading);

  const queueSection = setupQueueSection();
  container.appendChild(queueSection);

  const grid = document.createElement("div");
  grid.className = "tablet-device-grid";

  for (let i = 0; i < deviceCount; i += 1) {
    grid.appendChild(createTabletCard(i));
  }

  const backButton = document.createElement("button");
  backButton.id = "backToWelcome";
  backButton.type = "button";
  backButton.textContent = "Back";
  backButton.addEventListener("click", () => showWelcomeView());

  container.appendChild(grid);
  container.appendChild(backButton);
  mainElement.appendChild(container);

  appState.view = "tablet";
  if (!options.skipSave) {
    saveAppState();
  }
}

function setupQueueSection() {
  const section = document.createElement("section");
  section.className = "queue-section";

  const header = document.createElement("div");
  header.className = "queue-header";

  const title = document.createElement("h3");
  title.textContent = "Waiting Queue";
  header.appendChild(title);

  const form = document.createElement("form");
  form.className = "queue-form";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter customer name";
  input.required = true;

  const addButton = document.createElement("button");
  addButton.type = "submit";
  addButton.textContent = "Add";

  form.appendChild(input);
  form.appendChild(addButton);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) {
      return;
    }
    appState.queue.push(name);
    saveAppState();
    input.value = "";
    renderQueueList();
  });

  queueListElement = document.createElement("ol");
  queueListElement.className = "queue-list";

  queueEmptyMessage = document.createElement("p");
  queueEmptyMessage.className = "queue-empty";
  queueEmptyMessage.textContent = "No customers waiting.";

  header.appendChild(form);
  section.appendChild(header);
  section.appendChild(queueEmptyMessage);
  section.appendChild(queueListElement);

  renderQueueList();

  return section;
}

function renderQueueList() {
  if (!queueListElement || !queueEmptyMessage) {
    return;
  }
  queueListElement.innerHTML = "";
  if (!appState.queue || appState.queue.length === 0) {
    queueEmptyMessage.style.display = "block";
    return;
  }

  queueEmptyMessage.style.display = "none";

  appState.queue.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    queueListElement.appendChild(li);
  });
}

function createTabletCard(index) {
  const tablet = appState.tablets[index];

  const card = document.createElement("div");
  card.className = "tablet-device";

  const heading = document.createElement("h3");
  heading.textContent = `Tablet ${index + 1}`;

  const occupantDisplay = document.createElement("p");
  occupantDisplay.className = "tablet-occupant";

  const timerDisplay = document.createElement("span");
  timerDisplay.className = "timer-display";

  const assignBtn = document.createElement("button");
  assignBtn.textContent = "Assign Next";
  assignBtn.type = "button";
  assignBtn.classList.add("span-2");

  const startBtn = document.createElement("button");
  startBtn.textContent = "Start";
  startBtn.type = "button";

  const stopBtn = document.createElement("button");
  stopBtn.textContent = "Stop";
  stopBtn.type = "button";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.type = "button";

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear";
  clearBtn.type = "button";

  const syncDisplay = () => {
    occupantDisplay.textContent = tablet.occupant || "Available";
    const remaining = computeRemainingSeconds(tablet);
    updateTimerDisplay(timerDisplay, remaining);
  };

  const startInterval = () => {
    if (timerIntervals.has(index)) {
      return;
    }
    const id = window.setInterval(() => {
      const remaining = computeRemainingSeconds(tablet);
      updateTimerDisplay(timerDisplay, remaining);
      if (remaining === 0) {
        stopInterval();
        tablet.status = "idle";
        tablet.timeLeft = 0;
        tablet.targetTime = null;
        saveAppState();
      }
    }, 1000);
    timerIntervals.set(index, id);
  };

  const stopInterval = () => {
    const id = timerIntervals.get(index);
    if (id) {
      window.clearInterval(id);
      timerIntervals.delete(index);
    }
  };

  assignBtn.addEventListener("click", () => {
    if (tablet.occupant) {
      alert("This tablet is already in use.");
      return;
    }
    if (!appState.queue || appState.queue.length === 0) {
      alert("The queue is empty.");
      return;
    }
    stopInterval();
    tablet.occupant = appState.queue.shift();
    tablet.status = "idle";
    tablet.lastClearedName = null;
    tablet.timeLeft = DEFAULT_SESSION_SECONDS;
    tablet.targetTime = null;
    renderQueueList();
    syncDisplay();
    saveAppState();
  });

  startBtn.addEventListener("click", () => {
    if (!tablet.occupant) {
      alert("Assign someone to this tablet first.");
      return;
    }
    if (tablet.status === "running") {
      return;
    }
    const baseline = tablet.timeLeft && tablet.timeLeft > 0 ? tablet.timeLeft : DEFAULT_SESSION_SECONDS;
    tablet.status = "running";
    tablet.timeLeft = baseline;
    tablet.targetTime = Date.now() + baseline * 1000;
    syncDisplay();
    startInterval();
    saveAppState();
  });

  stopBtn.addEventListener("click", () => {
    if (tablet.status !== "running") {
      return;
    }
    const remaining = computeRemainingSeconds(tablet);
    stopInterval();
    tablet.status = "paused";
    tablet.timeLeft = remaining;
    tablet.targetTime = null;
    syncDisplay();
    saveAppState();
  });

  cancelBtn.addEventListener("click", () => {
    stopInterval();
    const returningName = tablet.occupant || tablet.lastClearedName;
    if (returningName) {
      appState.queue.unshift(returningName);
      renderQueueList();
    }
    tablet.occupant = null;
    tablet.lastClearedName = null;
    tablet.status = "idle";
    tablet.timeLeft = DEFAULT_SESSION_SECONDS;
    tablet.targetTime = null;
    syncDisplay();
    saveAppState();
  });

  clearBtn.addEventListener("click", () => {
    stopInterval();
    tablet.lastClearedName = tablet.occupant;
    tablet.occupant = null;
    tablet.status = "idle";
    tablet.timeLeft = DEFAULT_SESSION_SECONDS;
    tablet.targetTime = null;
    syncDisplay();
    saveAppState();
  });

  const controls = document.createElement("div");
  controls.className = "tablet-controls";
  controls.appendChild(assignBtn);
  controls.appendChild(startBtn);
  controls.appendChild(stopBtn);
  controls.appendChild(cancelBtn);
  controls.appendChild(clearBtn);

  card.appendChild(heading);
  card.appendChild(occupantDisplay);
  card.appendChild(timerDisplay);
  card.appendChild(controls);

  syncDisplay();
  if (tablet.status === "running") {
    if (!tablet.targetTime) {
      const baseline = tablet.timeLeft && tablet.timeLeft > 0 ? tablet.timeLeft : DEFAULT_SESSION_SECONDS;
      tablet.targetTime = Date.now() + baseline * 1000;
    }
    startInterval();
  }

  return card;
}

function computeRemainingSeconds(tablet) {
  if (tablet.status === "running" && tablet.targetTime) {
    const diff = Math.max(0, Math.round((tablet.targetTime - Date.now()) / 1000));
    tablet.timeLeft = diff;
    return diff;
  }
  const stored = typeof tablet.timeLeft === "number" ? tablet.timeLeft : DEFAULT_SESSION_SECONDS;
  return Math.max(0, stored);
}

function updateTimerDisplay(display, seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  display.textContent = `${mm}:${ss}`;
  display.classList.remove("timer-yellow", "timer-red");
  if (seconds === 0) {
    display.classList.add("timer-red");
  } else if (seconds <= 10 * 60) {
    display.classList.add("timer-yellow");
  }
}

function ensureTabletStates(deviceCount) {
  if (!Array.isArray(appState.tablets)) {
    appState.tablets = [];
  }
  while (appState.tablets.length < deviceCount) {
    appState.tablets.push(createDefaultTabletState());
  }
  if (appState.tablets.length > deviceCount) {
    appState.tablets.length = deviceCount;
  }
}

function createDefaultTabletState() {
  return {
    occupant: null,
    lastClearedName: null,
    status: "idle",
    timeLeft: DEFAULT_SESSION_SECONDS,
    targetTime: null,
  };
}

function clearAllTimers() {
  timerIntervals.forEach((id) => {
    window.clearInterval(id);
  });
  timerIntervals.clear();
}

function loadAppState() {
  try {
    const stored = window.localStorage.getItem(APP_STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to load app state", error);
    return {};
  }
}

function saveAppState() {
  try {
    const serialised = JSON.stringify(appState);
    window.localStorage.setItem(APP_STORAGE_KEY, serialised);
  } catch (error) {
    console.warn("Failed to save app state", error);
  }
}

main();
