let year
const version = 0.1

let YEAR = "scouting_4915_year"
const TBA_KEY  = "scouting_4915_apikey"
const EVENT  = "scouting_4915_event"
const SCOUTING_DATA  = "scouting_4915_scouting_data"
const MAPPING  = "scouting_4915_mapping"
const THEME = "scouting_4915_theme"
const LOCAL_STORAGE_KEYS = [YEAR, TBA_KEY, EVENT, SCOUTING_DATA, MAPPING, THEME]

const MISSING_LOGO = "https://frc-cdn.firstinspires.org/eventweb_frc/ProgramLogos/FIRSTicon_RGB_withTM.png"

let event_data
let scouting_data
let team_data = {}
let mapping

let theme = 0

let starred = []
let usingStar = true

let loading = 0

let columns = ["Team_Number", "Name"]
let selectedSort = "Team_Number"
let sortDirection = 1

let rounding = 3
rounding = Math.pow(10, rounding)

let keyboardControls = true

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
document.querySelector("#top_data").onclick = function() {
    loadFile(".csv,.json", (result, filetype) => {
        if (filetype === "csv")
            scouting_data = csvToJson(result)
        else if (filetype === "json")
            scouting_data = JSON.parse(result)
        if (mapping !== undefined) processData()
        window.localStorage.setItem(SCOUTING_DATA, JSON.stringify(scouting_data))
    })
}
document.querySelector("#top_mapping").onclick = function() {
    loadFile(".json", (result) => {
        mapping = JSON.parse(result)
        if (scouting_data !== undefined) processData()
        window.localStorage.setItem(MAPPING, JSON.stringify(mapping))
    })
}
document.querySelector("#top_year").onclick = function() {
    let x = prompt("Change year").trim()
    if (x === "get") alert(window.localStorage.getItem(YEAR))
    else if (x !== "") {
        window.localStorage.setItem(YEAR, x);
        window.location.reload()
    }
}
document.querySelector("#foot_clearLocalStorage").onclick = function() {
    let tmp = []
    LOCAL_STORAGE_KEYS.forEach((i) => tmp.push(i.replace("scouting_4915_", "")))
    if (confirm("This will clear the following: " + tmp)) {
        for (let i of LOCAL_STORAGE_KEYS) window.localStorage.removeItem(i)
        window.location.reload()
    }
}
document.querySelector("#foot_clearDataMappings").onclick = function() {
    if (confirm("Are you sure? This is irreversible")) {
        window.localStorage.removeItem(SCOUTING_DATA)
        window.localStorage.removeItem(MAPPING)
        window.location.reload()
    }
}
document.querySelector("#top_keyboard").onclick = function() {
    keyboardControls = !keyboardControls
    document.querySelector("#top_keyboard").innerText = "Keyboard Controls: " + (keyboardControls ? "Enabled" : "Disabled")
}
document.addEventListener("keydown", (e) => {
    if (!keyboardControls) return
    let key = e.key.toLowerCase()
    if (key === "d" || key === "arrowright") {
        let currentIndex = columns.indexOf(selectedSort)
        if (currentIndex !== columns.length-1) {
            if (e.shiftKey) {
                    columns[currentIndex] = columns[currentIndex+1]
                    columns[currentIndex+1] = selectedSort
            } else changeSort(columns[currentIndex+1])
        }
        e.preventDefault()
    }
    if (key === "a" || key === "arrowleft") {
        let currentIndex = columns.indexOf(selectedSort)
        if (currentIndex !== 0) {
            if (e.shiftKey) {
                columns[currentIndex] = columns[currentIndex-1]
                columns[currentIndex-1] = selectedSort
            } else changeSort(columns[currentIndex-1])
        }
        e.preventDefault()
    }
    if (key === " ") {
        sortDirection *= -1
        e.preventDefault()
    }
    setHeader()
    regenList()
})

function handleMapping() {
    for (let x of Object.keys(mapping["averages"])) columns.push(x.replaceAll(" ", "_"))
    for (let x of Object.keys(mapping["calculated"])) columns.push(x.replaceAll(" ", "_"))
    for (let x of Object.keys(mapping["calculated_averages"])) columns.push(x.replaceAll(" ", "_"))
    setHeader()
}
function processData() {
    handleMapping()
    let data = {}
    for (let i of scouting_data) {
        let team = i[mapping["team"]]
        if (typeof team_data[team] !== undefined) {
            if (typeof data[team] === "undefined") data[team] = {"averages": {}, "calculated": {}, "calculated_averages": {}}
            for (let average of Object.keys(mapping["averages"])) {
                let averageKey = average.replaceAll(" ", "_")
                if (typeof data[team]["averages"][averageKey] === "undefined") data[team]["averages"][averageKey] = []

                let x = i[mapping["averages"][average]]
                if (typeof x !== "number") x = parseFloat(x)
                if (!isNaN(x))
                    data[team]["averages"][averageKey].push(x)
            }
            for (let calculated of Object.keys(mapping["calculated"])) {
                let calculatedKey = calculated.replaceAll(" ", "_")
                if (typeof data[team]["calculated"][calculatedKey] === "undefined") data[team]["calculated"][calculatedKey] = 0
                let e = evaluate(i, mapping["calculated"][calculated])
                if (!isNaN(e))
                    data[team]["calculated"][calculatedKey] += e
            }
            for (let calculated of Object.keys(mapping["calculated_averages"])) {
                let calculatedKey = calculated.replaceAll(" ", "_")
                if (typeof data[team]["calculated_averages"][calculatedKey] === "undefined") data[team]["calculated_averages"][calculatedKey] = []
                let e = evaluate(i, mapping["calculated_averages"][calculated])
                if (!isNaN(e))
                    data[team]["calculated_averages"][calculatedKey].push(e)
            }
        }
    }
    for (let i of Object.keys(data)) {
        if (typeof team_data[i] != "undefined") {
            for (let av of Object.keys(data[i]["averages"])) {
                let total = 0
                for (let x of data[i]["averages"][av]) total += x
                team_data[i][av] = Math.round((total/data[i]["averages"][av].length)*rounding)/rounding
            }

            for (let cav of Object.keys(data[i]["calculated_averages"])) {
                let total = 0
                for (let x of data[i]["calculated_averages"][cav]) total += x
                team_data[i][cav] = Math.round((total/data[i]["calculated_averages"][cav].length)*rounding)/rounding
            }

            for (let calc of Object.keys(data[i]["calculated"])) team_data[i][calc] = data[i]["calculated"][calc]
        }
    }
    regenList()
}
function evaluate(i, exp) {
    let a = exp[0]
    let op = exp[1]
    let b = exp[2]

    if (typeof a === "object") a = evaluate(i, a)
    else if (typeof a === "string") a = i[a]
    a = parseFloat(a)
    if (isNaN(a) && op !== "=") return NaN

    if (typeof b === "object") b = evaluate(i, b)
    else if (typeof b === "string") b = i[b]
    b = parseFloat(b)
    if (isNaN(b) && op !== "=") return NaN

    switch (op) {
        case "+": return a + b
        case "-": return a - b
        case "*": return a * b
        case "/": return a / b
        case "=": return i[exp[0]] == exp[2] ? 1 : 0
    }
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

function loadEvent() {
    loading++
    load("event/" + year + window.localStorage.getItem(EVENT) + "/teams", function(data) {
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
        el.id = "select_" + column.replaceAll(".", "")
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
        if (columnEl.innerText.toString() === "NaN") columnEl.classList.add("NaN")
        el.appendChild(columnEl)
    }

    document.querySelector(".table").appendChild(el)

    el.style.order = sort(team)
}

function sort(team) {
    let starOffset = ((starred.includes(team) && usingStar) ? -Math.pow(10,9) : 0)
    if (typeof team_data[Object.keys(team_data)[0]][selectedSort] == "string") {
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

        return starOffset + (index)
    } else { // Number
        let max = -100000
        for (let x of Object.keys(team_data))
            if (team_data[x][selectedSort] >= max) max = team_data[x][selectedSort]

        let index = isNaN(team_data[team][selectedSort]) ? 0 : team_data[team][selectedSort] /max
        if (sortDirection === 1) index = 1-index
        return starOffset + Math.floor(1000*index)
    }
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

    document.querySelector("#select_" + to.replaceAll(".","")).classList.add("highlighted")
    if (sortDirection === 1) document.querySelector("#select_" + to.replaceAll(".","")).classList.add("top")
    if (sortDirection === -1) document.querySelector("#select_" + to.replaceAll(".","")).classList.add("bottom")

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
function checkLoading() {
    if (loading === 0) {
        document.querySelector("err").classList = "hidden"
        if (scouting_data !== undefined && mapping !== undefined) processData()
    } else {
        document.querySelector("err").classList = ""
        document.querySelector("err").innerHTML = "Loading Data... Do not touch anything"
    }
}
function loadFile(accept, listener) {
    let fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = accept
    fileInput.addEventListener("change", (e) => {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            listener(loadEvent.target.result, filename.split('.').pop().toLowerCase())
        }
        let filename = e.target.files[0].name
        reader.readAsText(e.target.files[0]);
    })
    fileInput.click()
}

function csvToJson(csv) {
    let rawFields = csv.split("\n")[0]

    let fields = []
    let inQuote = false
    let current = ""
    for (let char of rawFields) {
        if (char === '"') inQuote = !inQuote
        else if (char === ',' && !inQuote) {
            fields.push(current.trim())
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

year = window.localStorage.getItem(YEAR)
if (year === null || year < 1992) {
    window.localStorage.setItem(YEAR, new Date().getFullYear().toString())
    window.location.reload()
}
document.querySelector("#top_year").innerText = year

scouting_data = window.localStorage.getItem(SCOUTING_DATA)
scouting_data = scouting_data == null ? undefined : JSON.parse(scouting_data)
mapping = window.localStorage.getItem(MAPPING)
mapping = mapping == null ? undefined : JSON.parse(mapping)

updateTheme()

let versionElement = document.createElement("span")
versionElement.innerText = "v"+version
document.querySelector(".sticky-header").children[0].appendChild(versionElement)

// Final Stuff
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
