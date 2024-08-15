//#region Local Storage Keys
let YEAR = "scouting_4915_year"
const TBA_KEY  = "scouting_4915_apikey"
const EVENT  = "scouting_4915_event"
const SCOUTING_DATA  = "scouting_4915_scouting_data"
const MAPPING  = "scouting_4915_mapping"
const THEME = "scouting_4915_theme"
const LOCAL_STORAGE_KEYS = [YEAR, TBA_KEY, EVENT, SCOUTING_DATA, MAPPING, THEME]
//#endregion

//#region Variables
const MISSING_LOGO = "https://frc-cdn.firstinspires.org/eventweb_frc/ProgramLogos/FIRSTicon_RGB_withTM.png"

const toolName = "FRC Scouting Tool"

let event_data
let scouting_data
let team_data = {}
let mapping

let theme = 0

let starred = []
let usingStar = true

let selected = []
let showCheckboxes = true

let loading = 0

let showTeamIcons = true

const defaultColumns = ["Team_Number", "Name", "Winrate"]
let columns = defaultColumns
const hiddenColumns = ["TBA", "Icon", "graphs", "matches"]

let selectedSort = "Team_Number"
let sortDirection = 1

let rounding = 3
rounding = Math.pow(10, rounding)

let keyboardControls = true
let brieflyDisableKeyboard = false

let year
const version = 0.1

const tieValue = 0.5

const desmosColors = [Desmos.Colors.RED, Desmos.Colors.BLUE, Desmos.Colors.GREEN, Desmos.Colors.PURPLE, Desmos.Colors.ORANGE, Desmos.Colors.BLACK]

const alphabet = "abcdefghijklmnopqrstuvwxyz".split('')

//#endregion

//#region Init Header Controls
let modalShowing = false
for (let el of document.querySelector("#top-controls").children) {
    if (el.tagName === "BUTTON") {
        el.onclick = function() {
            for (let el of document.getElementsByClassName("top-control-dropdown"))
                el.close()
            let modal = document.querySelector(`dialog[for="${el.id}"]`)
            modal.show()
            modalShowing = false
            setTimeout(() => modalShowing = true, 0)
        }
    } else {
        el.onclick = function() {
            modalShowing = false
            setTimeout(() => modalShowing = true, 0)
        }
        let inner = document.createElement("div")
        inner.innerHTML = el.innerHTML
        el.innerHTML = ""
        el.appendChild(inner)

        let button = document.querySelector("#"+el.getAttribute("for"))
        el.style.top = button.getBoundingClientRect().bottom + 4 + "px"
        el.style.left = button.getBoundingClientRect().left + 10 + "px"
    }
}

document.addEventListener("click", () => {
    if (modalShowing) {
        for (let el of document.getElementsByClassName("top-control-dropdown"))
            el.close()
        modalShowing = false
    }
})

//#endregion

//#region API Key, Event Loading, Year setting
document.querySelector("#top_setapi").onclick = function() {
    let x = prompt("What is your TBA API key? 'get' to get it, leave blank to skip")
    if (x === "get") alert(window.localStorage.getItem(TBA_KEY))
    else if (x === "clear") {
        window.localStorage.removeItem(TBA_KEY)
        window.location.reload()
    }
    else if (x !== "") {
        window.localStorage.setItem(TBA_KEY, x)
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
        window.localStorage.setItem(EVENT, x.toLowerCase())
        loadEvent()
    }
}
document.querySelector("#top_year").onclick = function() {
    let x = prompt("Change year").trim()
    if (x === "get") alert(window.localStorage.getItem(YEAR))
    else if (x !== "") {
        window.localStorage.setItem(YEAR, x)
        window.location.reload()
    }
}
function loadEvent() {
    loading++
    load("event/" + year + window.localStorage.getItem(EVENT) + "/teams", function(data) {
        event_data = data
        for (let team of data) {
            team_data[team["team_number"]] = {}
            team_data[team["team_number"]].Team_Number = team["team_number"]
            team_data[team["team_number"]].Name = team["nickname"]
            team_data[team["team_number"]].TBA = team
            team_data[team["team_number"]].Icon = "https://api.frc-colors.com/internal/team/" + team["team_number"] + "/avatar.png"
            loading++
            load("team/frc" + team["team_number"] + "/event/" + year + window.localStorage.getItem(EVENT) + "/matches", function(data) {
                loading--
                checkLoading()
                let matchesWon = 0
                for (let match of data)
                    matchesWon += checkTeamWonMatch(match, team["team_number"])
                team_data[team["team_number"]]["Winrate"] = Math.round(rounding*(matchesWon/data.length))/rounding
                regenTable()
            })
            regenTable()
        }
        loading--
        checkLoading()
    })
}
function checkTeamWonMatch(match, team) {
    team = "frc" + team
    if (match["winning_alliance"] === "") return tieValue
    let alliance = "red"
    if (match["alliances"]["blue"]["team_keys"].includes(team)) alliance = "blue"
    return alliance === match["winning_alliance"]
}
//#endregion

document.querySelector("#foot_clearLocalStorage").onclick = function() {
    let tmp = []
    LOCAL_STORAGE_KEYS.forEach((i) => tmp.push(i.replace("scouting_4915_", "")))
    if (confirm("This will clear the following: " + tmp)) {
        for (let i of LOCAL_STORAGE_KEYS) window.localStorage.removeItem(i)
        window.location.reload()
    }
}

//#region Data and Mappings
// Import data button
document.querySelector("#top_data").onclick = function() {
    loadFile(".csv,.json", (result, filetype) => {
        if (filetype === "csv") scouting_data = csvToJson(result) // Converts CSV to JSON
        else if (filetype === "json") scouting_data = JSON.parse(result) // Parses json
        else {
            let type = prompt("What is the filetype? (csv/json)").toLowerCase().trim()
            if (type === "csv") scouting_data = csvToJson(result) // Converts CSV to JSON
            else if (type === "json") scouting_data = JSON.parse(result) // Parses json
            else return // If none of the above, then can't process data
        }
        if (mapping !== undefined) processData()
        window.localStorage.setItem(SCOUTING_DATA, JSON.stringify(scouting_data))
        document.querySelector("#top_data_download").disabled = false
    })
}
// Import mapping button
document.querySelector("#top_mapping").onclick = function() {
    loadFile(".json", (result) => {
        mapping = JSON.parse(result)
        if (scouting_data !== undefined) processData()
        window.localStorage.setItem(MAPPING, JSON.stringify(mapping))
    })
}
// Adds all of the columns from the mapping to the columns list
function handleMapping() {
    document.querySelector("#top_mapping_download").disabled = false
    columns = defaultColumns // Clears columns to avoid duplicates
    if (mapping["mapping_version"] !== 1) {
        console.error("Mapping version " + mapping["mapping_version"] + " is not allowed. Allowed versions: 1")
        alert("Mapping version " + mapping["mapping_version"] + " is not allowed. Allowed versions: 1")
        return
    }
    for (let x of Object.keys(mapping["averages"])) columns.push(x.replaceAll(" ", "_"))
    for (let x of Object.keys(mapping["calculated"])) columns.push(x.replaceAll(" ", "_"))
    for (let x of Object.keys(mapping["calculated_averages"])) columns.push(x.replaceAll(" ", "_"))
    setHeader()
}
// Processes scouting_data based on information from mapping
function processData() {
    handleMapping() // Adds columns
    let data = {}
    // Loops through every scouting submission
    for (let i of scouting_data) {
        let teamFormat, team
        if (typeof mapping["team"] === "object") { // If object, no need to detect format
            team = i[mapping["team"]["key"]].toString().trim()
            teamFormat = mapping["team"]["format"].trim().toLowerCase()
        } else { // Detect format of team number
            team = i[mapping["team"]].toString().trim()
            if (team.startsWith("frc") && !isNaN(parseInt(team.substring(3, team.length)))) teamFormat = "frc#" // Checks if it is frc# format
            else if (isNaN(parseInt(team))) teamFormat = "#" // Checks if it is team number format
            else teamFormat = "name" // If none of the above, it assumes team name format.
        }
        if (teamFormat === "frc#") team = team.substring(3, team.length) // Gets team number
        if (teamFormat === "name") {
            for (let key of Object.keys(team_data)) { // Loops through all teams in team_data to see if they are
                if (team_data[key].Name.toLowerCase().trim() === team) {
                    team = key
                    break
                }
            }
        }
        // If in # format, nothing needs to be done.

        if (typeof team_data[team] !== "undefined") { // Only does calculations if team exists (in case someone put 4951 instead of 4915, no reason to include typos or teams that aren't in the event)
            if (typeof data[team] === "undefined") data[team] = {"averages": {}, "calculated": {}, "calculated_averages": {}, "graphs": {}, "matches": []}
            for (let average of Object.keys(mapping["averages"])) {
                let averageKey = average.replaceAll(" ", "_") // Removes spaces
                if (typeof data[team]["averages"][averageKey] === "undefined") data[team]["averages"][averageKey] = []

                let x = i[mapping["averages"][average]]
                if (typeof x !== "number") x = parseFloat(x)
                if (!isNaN(x)) // Ignores NaN values, caused by a field not being filled in during scouting
                    data[team]["averages"][averageKey].push(x)
            }
            for (let calculated of Object.keys(mapping["calculated"])) {
                let calculatedKey = calculated.replaceAll(" ", "_")
                if (typeof data[team]["calculated"][calculatedKey] === "undefined") data[team]["calculated"][calculatedKey] = 0
                let e = evaluate(i, mapping["calculated"][calculated])
                if (!isNaN(e)) // Ignores NaN values, caused by a field not being filled in during scouting
                    data[team]["calculated"][calculatedKey] += e
            }
            for (let calculated of Object.keys(mapping["calculated_averages"])) {
                let calculatedKey = calculated.replaceAll(" ", "_")
                if (typeof data[team]["calculated_averages"][calculatedKey] === "undefined") data[team]["calculated_averages"][calculatedKey] = []
                let e = evaluate(i, mapping["calculated_averages"][calculated])
                if (!isNaN(e)) // Ignores NaN values, caused by a field not being filled in during scouting
                    data[team]["calculated_averages"][calculatedKey].push(e)
            }

            for (let graph of Object.keys(mapping["graphs"])) {
                let graphKey = graph.replaceAll(" ", "_")
                if (typeof data[team]["graphs"][graphKey] === "undefined") data[team]["graphs"][graphKey] = {}
                let e = evaluate(i, mapping["graphs"][graph])
                if (!isNaN(e)) // Ignores NaN values, caused by a field not being filled in during scouting
                    data[team]["graphs"][graphKey][i[mapping["match"]["number"]]] = e
            }

            data[team]["matches"].push(i)
        }
    }
    // Adds data to team_data
    for (let i of Object.keys(data)) {
        for (let av of Object.keys(data[i]["averages"])) { // Averages up all data that needs to be averaged
            let total = 0
            for (let x of data[i]["averages"][av]) total += x
            team_data[i][av] = Math.round((total/data[i]["averages"][av].length)*rounding)/rounding
        }

        for (let cav of Object.keys(data[i]["calculated_averages"])) { // Averages up all the data that needs to be averaged
            let total = 0
            for (let x of data[i]["calculated_averages"][cav]) total += x
            team_data[i][cav] = Math.round((total/data[i]["calculated_averages"][cav].length)*rounding)/rounding
        }

        for (let calc of Object.keys(data[i]["calculated"])) team_data[i][calc] = data[i]["calculated"][calc]

        if (team_data[i]["graphs"] === undefined) team_data[i]["graphs"] = {}
        for (let graph of Object.keys(data[i]["graphs"])) team_data[i]["graphs"][graph] = data[i]["graphs"][graph]

        team_data[i]["matches"] = data[i]["matches"]
    }
    regenTable()
}
// Evaluates an expression
function evaluate(i, exp) {
    if (i["pi"] === undefined) i["pi"] = Math.PI
    if (i["PI"] === undefined) i["PI"] = Math.PI
    if (i["pI"] === undefined) i["pI"] = Math.PI
    if (i["Pi"] === undefined) i["Pi"] = Math.PI
    if (i["e"] === undefined) i["e"] = Math.E
    if (i["E"] === undefined) i["E"] = Math.E

    if (exp === undefined) return NaN
    else if (exp.length === 3) {
        let a = exp[0]
        let op = exp[1]
        let b = exp[2]

        if (typeof a === "object") a = evaluate(i, a)
        else if (typeof a === "string") a = i[a]
        a = parseFloat(a)
        if (isNaN(a) && op !== "=")  a = 0

        if (typeof b === "object") b = evaluate(i, b)
        else if (typeof b === "string") b = i[b]
        b = parseFloat(b)
        if (isNaN(b) && op !== "=") b = 0

        switch (op) {
            case "+": return a + b
            case "-": return a - b
            case "*": return a * b
            case "/": return a / b
            case "^":
            case "pow": return Math.pow(a, b)
            case "=": return i[exp[0]] == exp[2] ? 1 : 0
        }
    } else if (exp.length === 2) {
        let op = exp[0].toLowerCase().trim()
        let b = exp[1]

        if (typeof b === "object") b = evaluate(i, b)
        else if (typeof b === "string") b = i[b]
        b = parseFloat(b)
        if (isNaN(b)) b = 0

        switch (op) {
            case "abs": return Math.abs(b)
            case "sin": return Math.sin(b)
            case "cos": return Math.cos(b)
            case "tan": return Math.tan(b)
            case "asin": return Math.asin(b)
            case "acos": return Math.acos(b)
            case "atan": return Math.atan(b)
            case "floor": return Math.floor(b)
            case "ceil": return Math.ceil(b)
            case "log10": return Math.log10(b)
            case "round": return Math.round(b)
            case "sign": return Math.sign(b)
            case "sqrt": return Math.sqrt(b)
            case "cbrt": return Math.cbrt(b)
        }
    } else if (exp.length === 1) {
        let a = exp[0]
        if (typeof a === "object") a = evaluate(i, a)
        else if (typeof a === "string") a = i[a]
        a = parseFloat(a)
        if (isNaN(a)) a = 0
        return a
    } else if (exp.length === 0) return 0
    else return NaN
}
// Adds button functionality to clear mappings and scouting data
document.querySelector("#foot_clearDataMappings").onclick = function() {
    if (confirm("Are you sure? This is irreversible")) {
        window.localStorage.removeItem(SCOUTING_DATA)
        window.localStorage.removeItem(MAPPING)
        window.location.reload()
    }
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

// Download buttons
document.querySelector("#top_data_download").onclick = () => download("scouting_data.json", JSON.stringify(scouting_data))
document.querySelector("#top_mapping_download").onclick = () => download("mapping.json", JSON.stringify(mapping))

//#endregion

//#region Theme
// Updates the theme in document and handles theme in localStorage
function updateTheme() {
    theme = parseInt(window.localStorage.getItem(THEME))
    if (isNaN(theme)) { // If theme isn't set in localStorage
        window.localStorage.setItem(THEME, "0")
        updateTheme()
        return
    }
    let root = document.querySelector(":root").classList
    root.remove("dark")
    root.remove("spartronics_theme")
    if (theme === 1) root.add("dark")
    if (theme === 2) root.add("spartronics_theme")
    window.localStorage.setItem(THEME, ""+theme)
}
// Theme toggle button
document.querySelector("#top_theme").onclick = function() {
    window.localStorage.setItem(THEME, ""+((theme + 1) % 3))
    updateTheme()
}
//#endregion

//#region Table
// Sets the table header
function setHeader() {
    let header = document.querySelector(".table-head")
    while (header.children.length > 1) header.children[header.children.length-1].remove()
    if (showTeamIcons) {
        let iconPlaceholder = document.createElement("div")
        iconPlaceholder.classList.add("icon")
        iconPlaceholder.title = "Icon Placeholder"
        header.appendChild(iconPlaceholder)
    }
    for (let column of columns) {
        let el = document.createElement("div")
        el.id = "select_" + column.replaceAll(".", "")
        el.classList.add("data")
        el.classList.add("small")
        if (column === selectedSort) {
            el.classList.add("highlighted")
            if (sortDirection === 1) el.classList.add("top")
            if (sortDirection === -1) el.classList.add("bottom")
        }
        el.addEventListener("click", () => changeSort(column))
        el.innerText = column.replaceAll("_", " ")
        header.appendChild(el)
    }
    regenTable()
}
// Creates the element for a row in the table for the given team
function element(team) {
    let el = document.createElement("div")
    el.classList.add("row")
    el.id = team

    let controls = document.createElement("div")
    controls.classList.add("row-controls")

    let starEl = document.createElement("span")
    starEl.className = "material-symbols-outlined ar"
    if (starred.includes(team)) starEl.classList.add("filled")
    starEl.onclick = () => star(team)
    starEl.innerText = "star"
    controls.appendChild(starEl)

    if (showCheckboxes) {
        let checkbox = document.createElement("span")
        checkbox.className = "material-symbols-outlined ar"
        if (selected.includes(team)) el.classList.add("selected-row")
        checkbox.onclick = () => select(team)
        checkbox.innerText = selected.includes(team) ? "check_box" : "check_box_outline_blank"
        controls.appendChild(checkbox)
    }

    el.appendChild(controls)

    if (showTeamIcons) {
        let iconParent = document.createElement("button")
        iconParent.className = "icon-holder"
        iconParent.onclick = () => openTeam(team)
        let iconEl = document.createElement("img")
        iconEl.src = team_data[team].Icon
        iconEl.alt = "Icon"
        iconEl.className = "icon"
        iconEl.id = "icon-" + team
        iconEl.onerror = () => {
            team_data[team].Icon = MISSING_LOGO
            iconEl.src = MISSING_LOGO
        }
        iconEl.title = team_data[team].Name
        iconParent.appendChild(iconEl)
        el.appendChild(iconParent)
    }

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
// Clears the table
function clearTable() {
    while (document.querySelector(".table").children.length > 0) {
        document.querySelector(".table").children[0].remove()
    }
}
// Regenerates the table
function regenTable() {
    clearTable()
    for (let team of Object.keys(team_data)) element(team)
}
//#endregion

//#region Team Pages
function openTeam(team) {
    let data = team_data[team]

    document.querySelector(".table").classList.add("hidden")
    document.querySelector(".table-head").classList.add("hidden")

    let el = document.querySelector(".team-data")
    el.classList.remove("hidden")

    for (let child of el.children) child.remove()

    let backButton = document.createElement("button")
    backButton.className = "back-button"
    backButton.innerHTML = `<span class="material-symbols-outlined">arrow_back</span> Return back`
    backButton.addEventListener("click", closeTeam)

    let info = document.createElement("div")
    info.className = "team-info"

    let basicInfo = document.createElement("div")
    basicInfo.className = "team-info"

    let teamLogo = document.createElement("img")
    teamLogo.className = "logo-large"
    teamLogo.src = data.Icon
    basicInfo.appendChild(teamLogo)

    let basicInfoInfo = document.createElement("div")
    basicInfoInfo.className = "team-infoinfo"

    let teamName = document.createElement("div")
    teamName.className = "team-name"
    teamName.innerText = team + " - " + data.Name
    basicInfoInfo.appendChild(teamName)

    let desc = document.createElement("div")
    desc.className = "team-desc"
    desc.innerText = data.TBA.name
    basicInfoInfo.appendChild(desc)

    basicInfo.appendChild(basicInfoInfo)
    info.appendChild(basicInfo)

    let holder = document.createElement("div")
    holder.className = "team-data-holder"
    holder.appendChild(backButton)
    holder.appendChild(info)

    let graph = "Bot_Rating"
    holder.appendChild(graphElement([data.graphs[graph], team_data[4915].graphs[graph]], graph.replaceAll("_", " "), [team, 4915]))

    el.appendChild(holder)

    /*
        <div class="team-info">
            <div class="team-info">
                <img>
            </div>
            <div class="team-info-matches">

            </div>
        </div>
     */
}
function closeTeam() {
    document.querySelector(".table").classList.remove("hidden")
    document.querySelector(".table-head").classList.remove("hidden")
    document.querySelector(".team-data").classList.add("hidden")
}

function search() {
    const chars = /[!@#$%^&*()\-=_+`~[\]{};'\\:"|,./<>?]/g

    let el = document.querySelector("#search4915")
    let val = el.value.toLowerCase().trim().replaceAll(chars, "")

    if (val === "") {
        if (el.value !== val)
            alert("Cannot search for nothing \nWhitespace and the following characters are ignored:\n!@#$%^&*()-=_+`![]{};'\\:\"|,./<>?")
        else
            alert("Cannot search for nothing")
        return
    }

    let teamNumber = undefined
    if (team_data[val] !== undefined) teamNumber = val
    else {
        for (let t of Object.keys(team_data))
            if (team_data[t].Name.toLowerCase().trim().replaceAll(chars, "") === val) teamNumber = t
    }
    if (teamNumber === undefined) {
        for (let t of Object.keys(team_data))
            if ((" " + team_data[t].Name.toLowerCase().trim().replaceAll(chars, "")).match(/\s./g, "").join("").trim().replaceAll(" ", "") === val)
                if (confirm(`Did you mean team ${t} ${team_data[t].Name}?`)) teamNumber = t
    }
    if (teamNumber === undefined) {
        for (let t of Object.keys(team_data))
            if (team_data[t].Name.toLowerCase().trim().replaceAll(chars, "").startsWith(val))
                if (confirm(`Did you mean team ${t} ${team_data[t].Name}?`)) teamNumber = t
    }
    if (teamNumber === undefined) {
        alert(`Could not find team ${val} from the list of teams`)
        return
    }

    el.value = ""
    openTeam(teamNumber)
}
document.querySelector("#search4915").addEventListener("keydown", (e) => {
    if (e.code === "Enter") search()
})
document.querySelector("#search4915").addEventListener("focus", () => {
    brieflyDisableKeyboard = true
})
document.querySelector("#search4915").addEventListener("blur", () => {
    brieflyDisableKeyboard = false
})

function graphElement(data, name, teams) {
    let el = document.createElement("div")
    el.style.width = "400px"
    el.style.height = "400px"
    let calc = Desmos.GraphingCalculator(el, {expressions: false, settingsMenu: false, xAxisLabel: "Matches", yAxisLabel: name, zoomButtons: false, lockViewport: true, })

    function numArrToStrArr(numArr) {
        let strArr = []
        for (let n of numArr) strArr.push(n.toString())
        return strArr
    }

    let minY = 0
    let maxY = 0
    let maxX = 0
    for (let team of data)
        for (let x of Object.keys(team)) {
            if (team[x] > maxY) maxY = team[x]
            if (parseFloat(x) > maxX) maxX = x
            if (team[x] < minY) minY = team[x]
        }

    calc.setMathBounds({
        left: maxX * -.05,
        right: maxX * 1.2,
        bottom: maxY * -.05,
        top: maxY * 1.2
    })

    let expressions = []
    for (let i = 0; i < data.length; i++) {
        expressions.push({
            type:"table",
            columns: [
                {latex: "x_{" + i + "}", values: numArrToStrArr(Object.keys(data[i]))},
                {latex: "y_{" + i + "}", values: numArrToStrArr(Object.values(data[i])), hidden: true},
            ]
        })
        let v1 = alphabet[i*2]
        let v2 = alphabet[(i*2)+1]
        expressions.push({latex: "y_{" + i + "}\\sim " + v1 + "x_{" + i + "}" + v2, hidden: true})
        expressions.push({latex: v1 + "x + " + v2 + " = y", color: desmosColors[i], lineWidth: 6, lineOpacity: .6, label: teams[i] + " " + team_data[teams[i]].Name})
        expressions.push({
            latex: "(" + maxX * 1.15 + "," + ((1.2 - ((i + 1)*.05)) * maxY ) + ")",
            label: teams[i] + " " + team_data[teams[i]].Name.substring(0, 20) + (team_data[teams[i]].Name.length >= 20 ? "..." : ""),
            showLabel: true,
            labelOrientation: Desmos.LabelOrientations.LEFT,
            color: desmosColors[i],
            labelSize: Desmos.FontSizes.SMALL,
            pointSize: 16
        })
        expressions.push({
            latex: "(x_{" + i + "}, y_{" + i + "})",
            color: desmosColors[i],
            label: teams[i] + " (${x_{" + i + "}},${y_{" + i + "}})",
            labelSize: Desmos.FontSizes.SMALL,
            pointSize: 11,
        })
    }

    calc.setExpressions(expressions);
    return el
}

//#endregion

//#region Column Changing, Keyboard Controls
function getColumns() {
    let validColumns = []
    for (let col of Object.keys(team_data[Object.keys(team_data)[0]]))
        if (!hiddenColumns.includes(col)) validColumns.push(col)
    return validColumns
}
let columnEditButton = document.querySelector("#top_columns")
columnEditButton.onclick = function() {
    document.querySelector(".edit-columns").show()
    setColumnEditPanel()
}
function setColumnEditPanel() {
    let columnEditPanel = document.querySelector(".edit-columns")
    columnEditPanel.style.top = columnEditButton.getBoundingClientRect().bottom + "px"
    columnEditPanel.style.left = columnEditButton.getBoundingClientRect().left + "px"
    columnEditPanel.innerHTML = ""

    let button = document.createElement("button")
    button.innerText = "Close"
    button.addEventListener("click", () => columnEditPanel.close())
    columnEditPanel.appendChild(button)
    columnEditPanel.appendChild(document.createElement("margin"))

    let iconCheckbox = document.createElement("input")
    iconCheckbox.type = "checkbox"
    iconCheckbox.id = "checkbox_enableIcons"
    iconCheckbox.checked = showTeamIcons
    iconCheckbox.addEventListener("change", () => {
        showTeamIcons = iconCheckbox.checked
        setHeader()
    })
    let iconCheckboxLabel = document.createElement("label")
    iconCheckboxLabel.innerText = "Team Icons"
    iconCheckboxLabel.setAttribute("for", iconCheckbox.id)

    let icon = document.createElement("div")
    icon.appendChild(iconCheckbox)
    icon.appendChild(iconCheckboxLabel)
    columnEditPanel.appendChild(icon)
    columnEditPanel.appendChild(document.createElement("margin"))

    let list = document.createElement("div")
    list.class = "list"
    for (let col of getColumns()) {
        let order = document.createElement("input")
        order.type = "number"
        order.id = "order_"+col.replaceAll(".","")
        order.disabled = columns.includes(col) ? "" : "true"
        order.addEventListener("change", () => {
            order.value = ""+(columns.indexOf(col)+(columns.indexOf(col)-parseInt(order.value)))
            changeColumnOrder(col)
        })
        order.value = "" + (columns.includes(col) ? (columns.indexOf(col)) : "-1")

        let checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.id = "checkbox_"+col.replaceAll(".","")
        checkbox.checked = columns.includes(col) ? "true" : ""
        checkbox.addEventListener("change", () => toggleColumn(col))

        let label = document.createElement("label")
        label.setAttribute("for", checkbox.id)
        label.innerText = col.replaceAll("_", " ")

        let el = document.createElement("div")
        el.classList.add("columnEditItem")
        el.appendChild(order)
        el.appendChild(checkbox)
        el.appendChild(label)
        el.style.order = order.value === "-1" ? "1000" : order.value
        list.appendChild(el)
    }
    columnEditPanel.appendChild(list)

    columnEditPanel.appendChild(document.createElement("margin"))

    let selectAllButton = document.createElement("button")
    selectAllButton.innerText = "Select All"
    selectAllButton.addEventListener("click", () => {
        columns = getColumns()
        setColumnEditPanel()
        setHeader()
    })
    columnEditPanel.appendChild(selectAllButton)

    let deselectAllButton = document.createElement("button")
    deselectAllButton.innerText = "Deselect All"
    deselectAllButton.addEventListener("click", () => {
        columns = []
        setColumnEditPanel()
        setHeader()
    })
    columnEditPanel.appendChild(deselectAllButton)
}
function toggleColumn(col) {
    if (columns.includes(col))
        columns.splice(columns.indexOf(col),1)
    else columns.push(col)
    setHeader()
    setColumnEditPanel()
}
function changeColumnOrder(col) {
    console.log(col)
    let current = columns.indexOf(col)
    let target = (Math.max(Math.min((parseInt(document.querySelector("#order_"+col.replaceAll(".","")).value)), columns.length-1), 0))
    let direction = Math.sign(target-current)
    console.log(current, target, direction)
    while (columns.indexOf(col) !== target) {
        let i = columns.indexOf(col)
        columns[i] = columns[i+direction] + ""
        columns[i+direction] = col + ""
    }

    setHeader()
    setColumnEditPanel()
}

document.querySelector("#top_keyboard").onclick = function() {
    keyboardControls = !keyboardControls
    document.querySelector("#top_keyboard").innerText = "Keyboard Controls: " + (keyboardControls ? "Enabled" : "Disabled")
}
document.addEventListener("keydown", (e) => {
    if (!keyboardControls || brieflyDisableKeyboard) return
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
    regenTable()
    setColumnEditPanel()
})
//#endregion

//#region Sorting, Stars, Selecting
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

    regenTable()
}
function star(i) {
    if (starred.includes(i)) starred.splice(starred.indexOf(i),1)
    else starred.push(i)

    regenTable()
}
function select(i) {
    if (selected.includes(i)) selected.splice(selected.indexOf(i),1)
    else selected.push(i)

    regenTable()
}
function star_toggle() {
    usingStar = !usingStar
    document.querySelector("#select_star").classList.toggle("filled")
    regenTable()
}
//#endregion

//#region File and API loading functions (+ download)
// Loads data from TheBlueAlliance
async function load(sub, onload) {
    loading++
    let url = (`https://www.thebluealliance.com/api/v3/${sub}?X-TBA-Auth-Key=${window.localStorage.getItem(TBA_KEY)}`)
    await fetch(url).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok')
        }
        loading--
        checkLoading()
        return response.json()
    }).then(data => {
        onload(data)
    })
}
function checkLoading() {
    if (loading === 0) {
        document.querySelector("#err").className = "hidden"
        if (scouting_data !== undefined && mapping !== undefined) processData()
    } else {
        document.querySelector("#err").className = ""
        document.querySelector("#err").innerHTML = "Loading Data... Do not touch anything"
    }
}
function loadFile(accept, listener) {
    let fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = accept
    fileInput.addEventListener("change", (e) => {
        const reader = new FileReader()
        reader.onload = (loadEvent) => {
            listener(loadEvent.target.result, filename.split('.').pop().toLowerCase())
        }
        let filename = e.target.files[0].name
        reader.readAsText(e.target.files[0])
    })
    fileInput.click()
}
function download(filename, text) {
    let el = document.createElement("a")
    el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
    el.setAttribute("download", filename)
    //document.appendChild(el)
    el.click()
    //document.removeChild(el)
}
//#endregion

//#region Init
year = window.localStorage.getItem(YEAR)
if (year === null || year < 1992) {
    window.localStorage.setItem(YEAR, new Date().getFullYear().toString())
    window.location.reload()
}
document.querySelector("#top_year").innerText = year

scouting_data = window.localStorage.getItem(SCOUTING_DATA)
scouting_data = scouting_data == null ? undefined : JSON.parse(scouting_data)
document.querySelector("#top_data_download").disabled = scouting_data === undefined
mapping = window.localStorage.getItem(MAPPING)
mapping = mapping == null ? undefined : JSON.parse(mapping)
document.querySelector("#top_mapping_download").disabled = mapping === undefined

setHeader()
updateTheme()

document.querySelector("#version_slot").innerText = "v"+version

if (window.localStorage.getItem(TBA_KEY) == null || window.localStorage.getItem(TBA_KEY).trim() === "") {
    document.querySelector("#err").className = ""
    document.querySelector("#err").innerHTML = "No API Key"
}
if (window.localStorage.getItem(EVENT) == null || window.localStorage.getItem(EVENT).trim() === "") {
    document.querySelector("#err").className = ""
    document.querySelector("#err").innerHTML = (document.querySelector("#err").innerHTML + " No Event").trim()
} else {
    loading = 1
    checkLoading()
    loading = 0
    loadEvent()
}

document.querySelector("title").innerText = toolName
document.querySelector("#title").innerText = toolName

//#endregion
