// https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200
// https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />

//https://api.frc-colors.com/internal/team/4915/avatar.png for logos

const TBA_KEY  = "scouting_4915_apikey"
const EVENT  = "scouting_4915_event"
const YEAR = 2024
const MISSING_LOGO = "https://frc-cdn.firstinspires.org/eventweb_frc/ProgramLogos/FIRSTicon_RGB_withTM.png"
const THEME = "scouting_4915_theme"

let event_data
let scouting_data
let team_data = {}

let theme = 0

let starred = ['4915']
let usingStar = true

let loading = 0

let columns = ["Team_Number", "Name"]
let selectedSort = "Team_Number"
let sortDirection = 1

document.querySelector("#top_setapi").onclick = function() {
    let x = prompt("What is your TBA API key? 'get' to get it, leave blank to skip")
    if (x === "get") alert(window.localStorage.getItem(TBA_KEY))
    else if (x === "clear") {
        window.localStorage.removeItem(TBA_KEY)
        window.location.reload()
    }
    else if (x !== "") {
        window.localStorage.setItem(TBA_KEY, x);
        window.location.reload()
    }
}
document.querySelector("#top_load_event").onclick = function() {
    let x = prompt("event")
    if (x === "get") alert(window.localStorage.getItem(EVENT))
    else if (x === "clear") {
        window.localStorage.removeItem(EVENT)
        window.location.reload()
    }
    else if (x !== "") {
        window.localStorage.setItem(EVENT, x.toLowerCase());
        loadEvent()
    }
}
document.querySelector("#top_theme").onclick = function() {
    theme = Math.abs(theme-1)
    if (theme === 0) document.querySelector(":root").classList = ""
    if (theme === 1) document.querySelector(":root").classList = "dark"
    window.localStorage.setItem(THEME, ""+theme)
    updateTheme()
}
document.querySelector("#top_csv").onclick = function() {
    loadFile(".csv", (result) => {
        let json = csvToJson(result)
        scouting_data = json
    })
}
document.querySelector("#top_json").onclick = function() {
    loadFile(".json", (result) => {
        scouting_data = JSON.parse(result)
        console.log(scouting_data)
    })
}
document.querySelector("#top_mapping").onclick = function() {
    loadFile(".json", (result) => {
        let json = JSON.parse(result)
        console.log(json)
    })
}

function updateTheme() {
    theme = window.localStorage.getItem(THEME)
    if (theme == null) {
        window.localStorage.setItem(THEME, "0")
        updateTheme();
        return
    } else theme = parseInt(theme)
    if (theme === 0) document.querySelector(":root").classList = ""
    if (theme === 1) document.querySelector(":root").classList = "dark"
}
updateTheme()

function loadEvent() {
    loading++
    load("event/" + YEAR + window.localStorage.getItem(EVENT) + "/teams", function(data) {
        event_data = data
        for (let team of data) {
            team_data[team.team_number] = {}
            team_data[team.team_number].Team_Number = team.team_number
            team_data[team.team_number].Name = team.nickname
            team_data[team.team_number].TBA = team
            team_data[team.team_number].Icon = "https://api.frc-colors.com/internal/team/" + team.team_number + "/avatar.png"
            element(team.team_number)
            regenList()
        }
        loading--
        checkLoading()
    })
}


function setHeader() {
    let header = document.querySelector(".table-head")
    while (header.children.length > 2) header.children[header.children.length-1].remove()
    for (let column of columns) {
        let el = document.createElement("div")
        el.id = "select_" + column
        el.classList.add("data")
        el.classList.add("smol")
        if (column === selectedSort) {
            el.classList.add("highlighted")
            if (sortDirection === 1) el.classList.add("top")
            if (sortDirection === -1) el.classList.add("bottom")
        }
        el.addEventListener("click", () => changeSort(column))
        el.innerText = column.replaceAll("_", " ")
        header.appendChild(el)
    }
}
function element(team) {
    let el = document.createElement("div")
    el.className = "row"
    el.id = team

    let starEl = document.createElement("span")
    starEl.className = "material-symbols-outlined ar"
    if (starred.includes(team)) starEl.classList.add("filled")
    starEl.onclick = () => star(team)
    starEl.innerText = "star"
    el.appendChild(starEl)

    let iconEl = document.createElement("img")
    iconEl.src = team_data[team].Icon
    iconEl.alt = "Icon"
    iconEl.className = "icon"
    iconEl.id = "icon-" + team
    iconEl.onerror = () => {
        team_data[team].Icon = MISSING_LOGO
        iconEl.src = MISSING_LOGO
    }
    el.appendChild(iconEl)

    for (let column of columns) {
        let columnEl = document.createElement("div")
        columnEl.className = "data"
        columnEl.innerText = team_data[team][column] === undefined ? "" : team_data[team][column]
        if ((""+team_data[team][column]).length > 10) columnEl.style.fontSize = Math.max(1.2 - ((.025) * ((""+team_data[team][column]).length-10)), .7) + "rem"
        el.appendChild(columnEl)
    }

    document.querySelector(".table").appendChild(el)

    el.style.order = sort(team)
}

function sort(team) {
    let arr = []
    for (let i of Object.keys(team_data)) {
        arr.push(i)
    }
    arr.sort(function(a, b) {
        if (team_data[a][selectedSort].toString().toLowerCase() < team_data[b][selectedSort].toString().toLowerCase()) return -1
        if (team_data[a][selectedSort].toString().toLowerCase() > team_data[b][selectedSort].toString().toLowerCase()) return 1
        return 0
    })

    let index = arr.indexOf(team)
    if (sortDirection === -1) index = 10000 - index

    let starOffset = ((starred.includes(team) && usingStar) ? -Math.pow(10,9) : 0)
    return starOffset + (index)
}
function changeSort(to) {
    if (selectedSort === to) sortDirection *= -1
    else {
        selectedSort = to
        sortDirection = 1
    }

    for (let el of document.getElementsByClassName("highlighted")) el.classList.remove("highlighted")
    for (let el of document.getElementsByClassName("top")) el.classList.remove("top")
    for (let el of document.getElementsByClassName("bottom")) el.classList.remove("bottom")

    document.querySelector("#select_" + to).classList.add("highlighted")
    if (sortDirection === 1) document.querySelector("#select_" + to).classList.add("top")
    if (sortDirection === -1) document.querySelector("#select_" + to).classList.add("bottom")

    regenList()
}
function star(i) {
    if (starred.includes(i)) starred.splice(starred.indexOf(i),1)
    else starred.push(i)

    regenList()
}
function star_toggle() {
    usingStar = !usingStar
    document.querySelector("#select_star").classList.toggle("filled")
    regenList()
}

function clearList() {
    while (document.querySelector(".table").children.length > 0) {
        document.querySelector(".table").children[0].remove()
    }
}
function regenList() {
    clearList()
    for (let team of Object.keys(team_data)) element(team)
}


async function load(sub, onload) {
    loading++
    let url = (`https://www.thebluealliance.com/api/v3/${sub}?X-TBA-Auth-Key=${window.localStorage.getItem(TBA_KEY)}`);
    await fetch(url).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        loading--
        checkLoading()
        return response.json();
    }).then(data => {
        onload(data)
    })
}
function loadFile(accept, listener) {
    let fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = accept
    fileInput.addEventListener("change", (e) => {
        const reader = new FileReader();
        reader.onload = (e) => listener(e.target.result)
        reader.readAsText(e.target.files[0]);
    })
    fileInput.click()
}

function checkLoading() {
    if (loading === 0) {
        document.querySelector("err").classList = "hidden"
    } else {
        document.querySelector("err").classList = ""
        document.querySelector("err").innerHTML = "Loading Data... Do not touch anything"
    }
}

if (window.localStorage.getItem(TBA_KEY) == null || window.localStorage.getItem(TBA_KEY).trim() === "") {
    document.querySelector("err").classList = ""
    document.querySelector("err").innerHTML = "No API Key"
}
if (window.localStorage.getItem(EVENT) == null || window.localStorage.getItem(EVENT).trim() === "") {
    document.querySelector("err").classList = ""
    document.querySelector("err").innerHTML = (document.querySelector("err").innerHTML + " No Event").trim()
} else {
    loading = 1
    checkLoading()
    loading = 0
    loadEvent()
}

setHeader()

function csvToJson(csv) {
    let rawFields = csv.split("\n")[0]

    let fields = []
    let inQuote = false
    let current = ""
    for (let char of rawFields) {
        if (char === '"') inQuote = !inQuote
        else if (char === ',' && !inQuote) {
            fields.push(current)
            current = ""
        } else current = current + char
    }
    fields.push(current)

    let str = ""
    inQuote = false
    for (let substring of csv.split("\n").slice(1)) {
        for (let char of substring) {
            str = str + char
            if (char === '"') inQuote = !inQuote
        }
        if (!inQuote) str = str + ","
        str = str + "\n"
        //inQuote = false
    }

    let json = []
    current = ""
    let currentMatch = {}
    inQuote = false
    for (let char of str) {
        if (char === '"') inQuote = !inQuote
        if (char === ',' && !inQuote) {
            current = current.trim()
            if (current.startsWith('"')) current = current.substring(1)
            if (current.endsWith('"')) current = current.substring(0, current.length - 1)
            current = current.replaceAll('""', '"')
            currentMatch[fields[Object.keys(currentMatch).length]] = current.trim()

            current = ""
            if (Object.keys(currentMatch).length === fields.length) {
                json.push(currentMatch)
                currentMatch = {}
            }
        } else current = current + char
    }

    return json
}