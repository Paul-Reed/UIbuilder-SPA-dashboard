// ---------- Setup: PWA ---------- //
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('✅ Service Worker registered:', reg.scope))
            .catch(err => console.error('❌ Service Worker registration failed:', err))
    })
}
// ---------- End of PWA ---------- //

// ---------- Setup: Menu ---------- //
const routerConfig = {
    defaultRoute: "energy",
    hide: true,
    routes: [{
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
    routeMenus: [{
        id: "menu1",
        menuType: "horizontal",
        label: "Main Menu",
    },],
};
// ---------- End of Menu ---------- //

// ---------- Setup: Start of Routing ---------- //
const router = new UibRouter(routerConfig);
document.addEventListener("uibrouter:route-changed", function (event) {
    switch (event.detail.newRouteId) {
        case "charger":
            prepChargerEvents();
            break;

        case "energy":
            prepEnergyEvents();
            break;
        // case 'energy': prepEnergyEvents(); break;
        // case 'server': prepServerEvents(); break;
    }
});
// ---------- End of Routing ---------- //

// ---------- Setup: Centralised Message Handling for SPA ---------- //
uibuilder.onChange("msg", handleUibMsg);

function handleUibMsg(msg) {
    if (!msg || typeof msg.payload === "undefined") return;

    const {
        topic,
        payload
    } = msg;
    console.log("[uibuilder msg]", msg);

    switch (topic) {
        case "chargeButton":
            updateChargeButtonUI(payload);
            break;

        case "chargingRate":
            updateChargingRateUI(payload);
            break;

        case "cpuUsage":
            updateCPUusageUI(payload);
            break;

        case "memoryUsage":
            updateMemoryUsageUI(payload);
            break;

//        case "energy/textboxes":
//            updateEnergyUI(payload);
//            break;
        // Future routes:
        // case 'energyData': updateEnergyUI(payload); break
        // case 'serverStatus': updateServerUI(payload); break

        default:
            console.warn(`Unhandled topic: ${topic}`, msg);
    }
}
// ---------- End of Centralised Message Handling for SPA ---------- //

// ---------- Charger Page ---------- //
function prepChargerEvents() {
    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = document.getElementById("dropdown-btn");
    const dropdownContent = document.getElementById("dropdown-content");

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove("show");
        }
    });

    window.startCharge = () => {
        const label = document.querySelector("#start-charge-btn span");
        uibuilder.send({
            topic: "chargeButton",
            payload: label.textContent === "Start Charge" ? true : false,
        });
    };

    window.toggleDropdown = () => {
        dropdown.classList.toggle("show");
    };

    dropdownContent.querySelectorAll("a").forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const rawValue = item.getAttribute("data-value");
            const value = isNaN(rawValue) ? rawValue : Number(rawValue);
            const label = item.textContent.trim();

            // Update button label
            dropdownBtn.textContent = `Rate: ${label}`;

            // Close dropdown
            dropdown.classList.remove("show");

            // Send to Node-RED
            uibuilder.send({
                topic: "chargingRate",
                payload: value,
            });
        });
    });
}

function updateChargeButtonUI(state) { // *** Charger Button ***
    const indicator = document.getElementById("start-indicator");
    const label = document.querySelector("#start-charge-btn span");

    if (indicator) {
        indicator.style.backgroundColor =
            state === true || state === "on" ? "red" : "green";
    }

    if (label) {
        label.textContent =
            state === true || state === "on" ? "Stop Charge" : "Start Charge";
    }
}

function updateChargingRateUI(value) { // *** Charger rate dropdown ***
    const dropdownContent = document.getElementById("dropdown-content");
    const dropdownBtn = document.getElementById("dropdown-btn");

    if (!dropdownContent || !dropdownBtn) return;

    const match = dropdownContent.querySelector(`[data-value="${value}"]`);
    const label = match?.textContent.trim() || value;

    dropdownBtn.textContent = `Rate: ${label}`;
}
// ---------- End of Charger page ---------- //

// ---------- Start of Server page ---------- //
// Track gauges so we only create them once
let cpuGauge = null
let memoryUsage = null

// ------------ Start CPU usage -------------//
function updateCPUusageUI(payload) {
    const gaugeElement = document.getElementById('cpu-usage')
    if (!gaugeElement) return  // gauge container isn't on the page

    if (!cpuGauge) {
        cpuGauge = new JustGage({
            id: 'cpu-usage',
            value: payload,
            min: 0,
            max: 100,
            symbol: '%',
            decimals: 1,
            pointer: true,
            pointerOptions: {
                toplength: -20,
                bottomlength: 15,
                bottomwidth: 5,
                color: '#a2a2a2',
                stroke: '#ffffff',
                stroke_width: 2,
                stroke_linecap: 'round'
            },
            title: 'CPU Gauge (%)',
            label: 'CPU Usage',
            labelMinFontSize: 14,
            valueFontColor: '#a2a2a2',
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

// ------------ Start Memory usage -------------//
function updateMemoryUsageUI(payload) {
    const gaugeElement = document.getElementById('memory-usage')
    if (!gaugeElement) return  // gauge container isn't on the page

    if (!memoryUsage) {
        memoryUsage = new JustGage({
            id: 'memory-usage',
            value: payload,
            min: 0,
            max: 100,
            symbol: '%',
            decimals: 1,
            pointer: true,
            pointerOptions: {
                toplength: -20,
                bottomlength: 15,
                bottomwidth: 5,
                color: '#a2a2a2',
                stroke: '#ffffff',
                stroke_width: 2,
                stroke_linecap: 'round'
            },
            title: 'Memory Gauge (%)',
            label: 'Memory Usage',
            labelMinFontSize: 14,
            valueFontColor: '#a2a2a2',
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

// ---------- Start of Plotly chart ---------- //
//document.addEventListener('DOMContentLoaded', () => {
//    uibuilder.start();
function prepEnergyEvents() {
    // Chart data trace
    let chartData = {
        x: [],
        y: [],
        type: 'scatter',
        mode: 'lines', // could use lines+markers instead
        name: 'Grid',
        hovertemplate: '%{y:.0f} W<br>%{x}<extra></extra>',
        line: {
            color: '#4a4a4a',
            width: 1,
            shape: 'spline',
        },
    };

    // Layout configuration
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
        paper_bgcolor: '#eeeeee',  // outside the grid #E5E4E2
        plot_bgcolor: '#eeeeee'    // inside the grid (plot area)
    };

    // Plotly display configuration
    const plotlyConfig = {
        displayModeBar: false, // Hide floating toolbar
        responsive: true, // Make the chart responsive
        margin: { t: 0 },
    }

    let chartDrawn = false;

    // Handle messages from Node-RED
    uibuilder.onChange('msg', msg => {
        if (!msg.payload || !Array.isArray(msg.payload)) return;

        const incoming = msg.payload[0];

        // Initial or flush full redraw
        if (incoming.x.length > 1 || msg.topic === "flush") {
            chartData.x = incoming.x;
            chartData.y = incoming.y;

            Plotly.newPlot('chart', [chartData], plotlyLayout, plotlyConfig);
            chartDrawn = true;
            return;
        }

        // Single-point update
        if (incoming.x.length === 1 && incoming.y.length === 1) {
            if (!chartDrawn) {
                chartData.x = incoming.x;
                chartData.y = incoming.y;
                Plotly.newPlot('chart', [chartData], plotlyLayout, plotlyConfig);
                chartDrawn = true;
            } else {
                Plotly.extendTraces('chart', {
                    x: [[incoming.x[0]]],
                    y: [[incoming.y[0]]]
                }, [0], 360); // keep last 30 mins (120 points)
            }
        }
    });
//});
}

