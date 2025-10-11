
let mainElement = null;
let latestDeviceCount = null;
let initialMarkup = null;
let nameQueue = [];
let queueListElement = null;
let queueEmptyMessage = null;
const QUEUE_STORAGE_KEY = "incoachQueue";

function main() {
    mainElement = document.querySelector("main");
    initialMarkup = mainElement.innerHTML;
    nameQueue = loadQueueFromStorage();
    bindWelcomeHandlers();
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
    latestDeviceCount = deviceCount;
    showTabletView(deviceCount);
}

function showTabletView(deviceCount) {
    queueListElement = null;
    queueEmptyMessage = null;
    mainElement.innerHTML = "";

    const tabletContainer = document.createElement("div");
    tabletContainer.className = "tablet-view";

    const heading = document.createElement("h2");
    heading.textContent = "Tablet view";
    tabletContainer.appendChild(heading);

    const queueSection = setupQueueSection();
    tabletContainer.appendChild(queueSection);

    const deviceGrid = document.createElement("div");
    deviceGrid.className = "tablet-device-grid";

    for (let i = 1; i <= deviceCount; i += 1) {
        deviceGrid.appendChild(createTabletTimer(i));
    }

    const backButton = document.createElement("button");
    backButton.id = "backToWelcome";
    backButton.type = "button";
    backButton.textContent = "Back";
    backButton.addEventListener("click", restoreWelcome);

    tabletContainer.appendChild(deviceGrid);
    tabletContainer.appendChild(backButton);
    mainElement.appendChild(tabletContainer);
}

function createTabletTimer(index) {
    // Timer container
    const deviceCard = document.createElement("div");
    deviceCard.className = "tablet-device";

    // Occupant display
    const occupantHeading = document.createElement("h3");
    occupantHeading.textContent = `Tablet ${index}`;

    const occupantDisplay = document.createElement("p");
    occupantDisplay.className = "tablet-occupant";
    occupantDisplay.textContent = "Available";

    // Timer display
    const timerDisplay = document.createElement("span");
    timerDisplay.className = "timer-display";
    timerDisplay.textContent = "30:00";

    // Timer state
    let timer = null;
    let timeLeft = 30 * 60; // seconds
    let running = false;
    let currentName = null;
    let lastClearedName = null;

    // Timer controls
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
    const assignBtn = document.createElement("button");
    assignBtn.textContent = "Assign Next";
    assignBtn.type = "button";

    startBtn.addEventListener("click", () => {
        if (!currentName) {
            alert("Assign someone to this tablet first.");
            return;
        }
        if (!running) {
            running = true;
            timer = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay(timerDisplay, timeLeft);
                }
                if (timeLeft === 0) {
                    clearInterval(timer);
                    running = false;
                }
            }, 1000);
        }
    });

    stopBtn.addEventListener("click", () => {
        if (running) {
            clearInterval(timer);
            running = false;
        }
    });

    cancelBtn.addEventListener("click", () => {
        if (timer) clearInterval(timer);
        running = false;
        timeLeft = 30 * 60;
        updateTimerDisplay(timerDisplay, timeLeft);
        timerDisplay.classList.remove("timer-yellow", "timer-red");
        let queueUpdated = false;
        if (currentName) {
            nameQueue.unshift(currentName);
            renderQueueList();
            currentName = null;
            occupantDisplay.textContent = "Available";
            queueUpdated = true;
        } else if (lastClearedName) {
            nameQueue.unshift(lastClearedName);
            renderQueueList();
            lastClearedName = null;
            queueUpdated = true;
        }
        if (queueUpdated) {
            occupantDisplay.textContent = "Available";
        }
    });

    clearBtn.addEventListener("click", () => {
        if (timer) clearInterval(timer);
        running = false;
        timeLeft = 30 * 60;
        updateTimerDisplay(timerDisplay, timeLeft);
        timerDisplay.classList.remove("timer-yellow", "timer-red");
        lastClearedName = currentName;
        currentName = null;
        occupantDisplay.textContent = "Available";
        // You can add logic here for confirming the session
    });

    assignBtn.addEventListener("click", () => {
        if (currentName) {
            alert("This tablet is already in use.");
            return;
        }
        if (nameQueue.length === 0) {
            alert("The queue is empty.");
            return;
        }
        currentName = nameQueue.shift();
        occupantDisplay.textContent = currentName;
        lastClearedName = null;
        timeLeft = 30 * 60;
        updateTimerDisplay(timerDisplay, timeLeft);
        renderQueueList();
    });

    // Layout
    deviceCard.appendChild(occupantHeading);
    deviceCard.appendChild(occupantDisplay);
    const controlsWrapper = document.createElement("div");
    controlsWrapper.className = "tablet-controls";

    assignBtn.classList.add("span-2");

    controlsWrapper.appendChild(assignBtn);
    controlsWrapper.appendChild(startBtn);
    controlsWrapper.appendChild(stopBtn);
    controlsWrapper.appendChild(cancelBtn);
    controlsWrapper.appendChild(clearBtn);

    deviceCard.appendChild(timerDisplay);
    deviceCard.appendChild(controlsWrapper);
    return deviceCard;
}

function updateTimerDisplay(display, seconds) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    display.textContent = `${mm}:${ss}`;
    display.classList.remove("timer-yellow", "timer-red");
    if (seconds === 0) {
        display.classList.add("timer-red");
    } else if (seconds <= 10 * 60) {
        display.classList.add("timer-yellow");
    }
}

function restoreWelcome() {
    mainElement.innerHTML = initialMarkup;
    bindWelcomeHandlers();
    nameQueue = [];
    queueListElement = null;
    queueEmptyMessage = null;
    if (latestDeviceCount !== null) {
        const input = document.getElementById("deviceCountInput");
        if (input) {
            input.value = latestDeviceCount;
        }
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
        if (name) {
            nameQueue.push(name);
            saveQueueToStorage();
            input.value = "";
            renderQueueList();
        }
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
    if (!nameQueue || nameQueue.length === 0) {
        queueEmptyMessage.style.display = "block";
        return;
    }

    queueEmptyMessage.style.display = "none";

    nameQueue.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        queueListElement.appendChild(li);
    });
}

function loadQueueFromStorage() {
    try {
        const stored = window.localStorage.getItem(QUEUE_STORAGE_KEY);
        if (!stored) {
            return [];
        }
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Failed to load queue from storage", error);
        return [];
    }
}

function saveQueueToStorage() {
    try {
        const serialised = JSON.stringify(nameQueue);
        window.localStorage.setItem(QUEUE_STORAGE_KEY, serialised);
    } catch (error) {
        console.warn("Failed to save queue to storage", error);
    }
}

main();