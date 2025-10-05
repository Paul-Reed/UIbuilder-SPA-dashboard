// ---------- Setup: PWA ----------
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('✅ Service Worker registered:', reg.scope))
            .catch(err => console.error('❌ Service Worker registration failed:', err))
    })
}
// ---------- End of PWA ---------- //

// ---------- Setup: Menu & Routing ----------
const routerConfig = {
    defaultRoute: "energy",   // Which page to load first
    hide: false,             // If true, router won't auto-generate menu
    routeContainer: "#view-container",
    routes: [
        {
            id: "energy",
            src: "./views/energy.html",
            type: "url",
            title: "Energy",
            description: "Home energy",
        },
        {
            id: "charger",
            src: "./views/charger.html",
            type: "url",
            title: "Charger",
            description: "EV Charger",
        },
        {
            id: "server",
            src: "./views/server.html",
            type: "url",
            title: "Server",
            description: "Server performance",
        },
    ],
    routeMenus: [
        {
            id: "menu1",
            menuType: "horizontal",
            label: "Main Menu",
            mountPoint: "#menu1",   // 👈 Tells UibRouter to mount menu here
        },
    ],
}

// ---------- Setup: Start of Routing ----------
const router = new UibRouter(routerConfig)
document.addEventListener("uibrouter:route-changed", function (event) {
    switch (event.detail.newRouteId) {
        case "charger":
            prepChargerEvents()
            setupChargerSpinButtons()
            setupChargerSchedule()
            break

        case "energy":
            prepEnergyEvents()
            break
    }
})
// ---------- End of Routing ---------- //

// ---------- Setup: Centralised Message Handling for SPA ----------
uibuilder.onChange("msg", handleUibMsg)

function handleUibMsg(msg) {
    if (!msg || typeof msg.payload === "undefined") return

    const { topic, payload } = msg
    console.log("[uibuilder msg]", msg)

    switch (topic) {
        case 'gridpower':
            ['gridData', 'gridData2'].forEach(id => {
                const el = document.getElementById(id)
                if (el) el.textContent = msg.payload
            })
            break

        case 'solar':
            {
                const el = document.getElementById('solarData')
                if (el) el.textContent = msg.payload
            }
            break

        case 'usage':
            {
                const el = document.getElementById('usageData')
                if (el) el.textContent = msg.payload
            }
            break

        case 'diverted':
            {
                const el = document.getElementById('divertedData')
                if (el) el.textContent = msg.payload
            }
            break

        case 'diverterTemp':
            {
                const el = document.getElementById('divTempData')
                if (el) el.textContent = msg.payload
            }
            break

        case 'voltage':
            {
                const el = document.getElementById('voltageData')
                if (el) el.textContent = msg.payload
            }
            break

        // EV charger
        case "chargeButton":
            updateChargeButtonUI(payload)
            break

        case "chargingRate":
            updateChargingRateUI(payload)
            break

        case "cpuUsage":
            // payload expected to be numeric percentage
            updateCPUusageUI(payload)
            break

        case "memoryUsage":
            // payload expected to be numeric percentage
            updateMemoryUsageUI(payload)
            break

        case "energyboxes":
        case "chargingState":
            // intentionally no-op for now
            break

        default:
            console.warn(`Unhandled topic: ${topic}`, msg)
    }
}
// ---------- End of Centralised Message Handling for SPA ---------- //

// ---------- Charger Page -----------
function prepChargerEvents() {
    const dropdown = document.querySelector(".dropdown")
    const dropdownBtn = document.getElementById("dropdown-btn")
    const dropdownContent = document.getElementById("dropdown-content")

    if (!dropdown || !dropdownBtn || !dropdownContent) return

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove("show")
        }
    })

    window.startCharge = () => {
        const label = document.querySelector("#start-charge-btn span")
        uibuilder.send({
            topic: "chargeButton",
            payload: label && label.textContent === "Start Charge" ? true : false,
        })
    }

    window.toggleDropdown = () => {
        dropdown.classList.toggle("show")
    }

    dropdownContent.querySelectorAll("a").forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault()
            e.stopPropagation()

            const rawValue = item.getAttribute("data-value")
            const value = isNaN(rawValue) ? rawValue : Number(rawValue)
            const label = item.textContent.trim()

            dropdownBtn.textContent = `Rate: ${label}`
            dropdown.classList.remove("show")

            uibuilder.send({
                topic: "chargingRate",
                payload: value,
            })
        })
    })
}

function updateChargeButtonUI(state) {
    const indicator = document.getElementById("start-indicator")
    const label = document.querySelector("#start-charge-btn span")

    if (indicator) {
        indicator.style.backgroundColor =
            state === true || state === "on" ? "red" : "green"
    }

    if (label) {
        label.textContent =
            state === true || state === "on" ? "Stop Charge" : "Start Charge"
    }
}

function updateChargingRateUI(value) {
    const dropdownContent = document.getElementById("dropdown-content")
    const dropdownBtn = document.getElementById("dropdown-btn")

    if (!dropdownContent || !dropdownBtn) return

    const match = dropdownContent.querySelector(`[data-value="${value}"]`)
    const label = match?.textContent.trim() || value

    dropdownBtn.textContent = `Rate: ${label}`
}

// ----- Time dropdowns -----
// Populate start (0..23) and end (1..24) selects with HH:00 labels
function populateHourDropdowns() {
    const startEl = document.getElementById("start-hour")
    const endEl = document.getElementById("end-hour")

    if (!startEl || !endEl) return

    // Clear any existing options (safe if function called multiple times)
    startEl.innerHTML = ""
    endEl.innerHTML = ""

    for (let h = 0; h < 24; h++) {
        const label = String(h).padStart(2, "0") + ":00"
        startEl.add(new Option(label, h))
    }

    // End: 1..24 shown (24:00 shown for UX), but will be normalised before send
    for (let h = 1; h <= 24; h++) {
        const displayLabel = h === 24 ? "24:00" : String(h).padStart(2, "0") + ":00"
        endEl.add(new Option(displayLabel, h))
    }
}

// Set sensible defaults: next whole hour for start, start+1 for end, with midnight wrap
function setDefaultScheduleTimes() {
    const now = new Date()
    let startHour = now.getHours()
    // If we're part-way through the hour, schedule for next hour
    if (now.getMinutes() > 0) startHour = (startHour + 1) % 24

    let endHour = startHour + 1
    // endHour domain shown as 1..24 for UX; keep as such here
    if (endHour > 24) endHour = endHour - 24

    const startEl = document.getElementById("start-hour")
    const endEl = document.getElementById("end-hour")

    if (startEl) startEl.value = startHour
    if (endEl) endEl.value = endHour
}

function setupChargerSpinButtons() {
    populateHourDropdowns()
    setDefaultScheduleTimes()
}

// ----- Schedule buttons -----
function setupChargerSchedule() {
    const startEl = document.getElementById("start-hour")
    const endEl = document.getElementById("end-hour")
    const setBtn = document.getElementById("set-schedule-btn")
    const cancelBtn = document.getElementById("cancel-schedule-btn")

    if (!startEl || !endEl || !setBtn || !cancelBtn) return

    setBtn.addEventListener("click", () => {
        let start = parseInt(startEl.value, 10)
        let end = parseInt(endEl.value, 10)

        // normalise 24 → 0 (cron-plus / JS Date midnight)
        if (end === 24) end = 0

        if (!Number.isInteger(start) || !Number.isInteger(end)) {
            // defensive: don't send invalid values
            console.warn("Invalid schedule values", startEl.value, endEl.value)
            return
        }

        uibuilder.send({
            topic: "chargerSchedule",
            payload: { start, end }
        })

        setBtn.textContent = "Schedule Set ✅"
        setBtn.classList.add("success")
        setTimeout(() => {
            setBtn.textContent = "Set Schedule"
            setBtn.classList.remove("success")
        }, 1500)
    })

    cancelBtn.addEventListener("click", () => {
        uibuilder.send({
            topic: "chargerSchedule",
            payload: { cancel: true }
        })

        cancelBtn.textContent = "Cancelled ❌"
        cancelBtn.classList.add("danger-active")
        setTimeout(() => {
            cancelBtn.textContent = "Cancel Schedule"
            cancelBtn.classList.remove("danger-active")
        }, 1500)
    })
}
// ---------- End of Charger page ---------- //

// ---------- Server Page ----------
let cpuGauge = null
let memoryUsage = null

function updateCPUusageUI(payload) {
    const gaugeElement = document.getElementById('cpu-usage')
    if (!gaugeElement) return

    if (!cpuGauge) {
        cpuGauge = new JustGage({
            id: 'cpu-usage',
            value: payload,
            min: 0,
            max: 100,
            symbol: '%',
            decimals: 1,
            pointer: true,
            relativeGaugeSize: true,   // enable auto-scaling
            gaugeWidthScale: 0.8,
            title: 'CPU Gauge (%)',
            label: 'CPU Usage',
            labelMinFontSize: 12,
            valueFontSize: 22,
            valueFontColor: '#a2a2a2',
            titleFontColor: '#a2a2a2',
            labelFontColor: '#a2a2a2',
            pointerOptions: {
                toplength: -20,
                bottomlength: 15,
                bottomwidth: 5,
                color: '#a2a2a2',
                stroke: '#ffffff',
                stroke_width: 2,
                stroke_linecap: 'round'
            },
            targetLine: 20,
            targetLineColor: '#ffffff',
            customSectors: {
                percents: true,
                ranges: [
                    { color: "#ff3b30", lo: 0, hi: 20 },
                    { color: "#43bf58", lo: 21, hi: 80 },
                    { color: "#ff3b30", lo: 81, hi: 100 }
                ]
            }
        })
    } else {
        cpuGauge.refresh(payload)
    }
}

function updateMemoryUsageUI(payload) {
    const gaugeElement = document.getElementById('memory-usage')
    if (!gaugeElement) return

    if (!memoryUsage) {
        memoryUsage = new JustGage({
            id: 'memory-usage',
            value: payload,
            min: 0,
            max: 100,
            symbol: '%',
            decimals: 1,
            pointer: true,
            gaugeWidthScale: 0.8,
            title: 'Memory Gauge (%)',
            label: 'Memory Usage',
            labelMinFontSize: 12,
            valueFontSize: 22,
            valueFontColor: '#a2a2a2',
            titleFontColor: '#a2a2a2',
            labelFontColor: '#a2a2a2',
            pointerOptions: {
                toplength: -20,
                bottomlength: 15,
                bottomwidth: 5,
                color: '#a2a2a2',
                stroke: '#ffffff',
                stroke_width: 2,
                stroke_linecap: 'round'
            },
            targetLine: 20,
            targetLineColor: '#ffffff',
            customSectors: {
                percents: true,
                ranges: [
                    { color: "#ff3b30", lo: 0, hi: 20 },
                    { color: "#43bf58", lo: 21, hi: 80 },
                    { color: "#ff3b30", lo: 81, hi: 100 }
                ]
            }
        })
    } else {
        memoryUsage.refresh(payload)
    }
}


// ---------- Energy Page ----------
function prepEnergyEvents() {
    let chartData = {
        x: [],
        y: [],
        type: 'scatter',
        mode: 'lines',
        name: 'Grid',
        hovertemplate: '%{y:.0f} W<br>%{x}<extra></extra>',
        line: {
            color: '#4a4a4a',
            width: 1,
            shape: 'spline',
        },
    }

    const plotlyLayout = {
        title: { text: 'Live Grid Power (W)', font: { size: 20 } },
        height: 450,
        margin: { t: 60, l: 50, r: 30, b: 50 },
        xaxis: {
            fixedrange: true,
            title: { text: 'Time' }
        },
        yaxis: {
            fixedrange: true,
            title: { text: 'Watts' }
        },
        paper_bgcolor: '#eeeeee',
        plot_bgcolor: '#eeeeee'
    }

    const plotlyConfig = {
        displayModeBar: false,
        responsive: true,
        margin: { t: 0 },
    }

    let chartDrawn = false

    uibuilder.onChange('msg', msg => {
        if (!msg.payload || !Array.isArray(msg.payload)) return

        const incoming = msg.payload[0]

        if (incoming.x.length > 1 || msg.topic === "flush") {
            chartData.x = incoming.x
            chartData.y = incoming.y

            Plotly.newPlot('chart', [chartData], plotlyLayout, plotlyConfig)
            chartDrawn = true
            return
        }

        if (incoming.x.length === 1 && incoming.y.length === 1) {
            if (!chartDrawn) {
                chartData.x = incoming.x
                chartData.y = incoming.y
                Plotly.newPlot('chart', [chartData], plotlyLayout, plotlyConfig)
                chartDrawn = true
            } else {
                Plotly.extendTraces('chart', {
                    x: [[incoming.x[0]]],
                    y: [[incoming.y[0]]]
                }, [0], 360)
            }
        }
    })
}
// ---------- End of file ----------