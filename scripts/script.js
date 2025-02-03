//#region Local Storage Keys
const YEAR = "scouting_4915_year"
const TBA_KEY  = "scouting_4915_apikey"
const EVENT  = "scouting_4915_event"
const SCOUTING_DATA  = "scouting_4915_scouting_data"
const PIT  = "scouting_4915_pit_scouting_data"
const MAPPING  = "scouting_4915_mapping"
const THEME = "scouting_4915_theme"
const ENABLED_APIS = "scouting_4915_apis"
const SETTINGS = "scouting_4915_settings_general"
const COLUMNS = "scouting_4915_settings_columns"
const TEAM_SAVES = "scouting_4915_settings_starignore"
const LOCAL_STORAGE_KEYS = [YEAR, PIT, TBA_KEY, EVENT, SCOUTING_DATA, MAPPING, THEME, ENABLED_APIS, SETTINGS, COLUMNS, TEAM_SAVES]
//#endregion

//#region Variables
const MISSING_LOGO = "https://frc-cdn.firstinspires.org/eventweb_frc/ProgramLogos/FIRSTicon_RGB_withTM.png"

const toolName = "Orpheus"
const version = 0.1

let doingInitialSetup = false

let event_data
let scouting_data
let pit_data = {}
let team_data = {}
let mapping

let theme = 0

let starred
let usingStar
let ignored
let usingIgnore
let showIgnoredTeams

let loading = 0

let showTeamIcons = true
const defaultColumns = ["Team_Number"]
let columns = JSON.parse(JSON.stringify(defaultColumns))
const defaultHiddenColumns = ["TBA", "Icon", "graphs", "matches"]
let hiddenColumns = JSON.parse(JSON.stringify(defaultHiddenColumns))

let selectedSort = "Team_Number"
let sortDirection = 1

let roundingDigits = 3
let rounding = Math.pow(10, roundingDigits)

let keyboardControls
let brieflyDisableKeyboard = false

let year

let tieValue = 0.5

let desmosColors
const desmosScriptSrc = "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"
let graphSettings = {
    x: "relative", // relative or absolute
    points: true,
    bestfit: true,
}

let showNamesInTeamComments

let usingTBA
let usingTBAMatches
let usingTBAMedia
let usingDesmos

let projectorMode = false


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
    let x = prompt("What event code do you want?")
    if (x === "get") alert(window.localStorage.getItem(EVENT))
    else if (x === "clear") {
        window.localStorage.removeItem(EVENT)
        window.location.reload()
    }
    else if (x !== "") {
        window.localStorage.setItem(EVENT, x.toLowerCase())
        window.location.reload()
        clearSavedTeams()
    }

}
document.querySelector("#top_year").onclick = function() {
    let x = prompt("Change year").trim()
    if (x === "get") alert(window.localStorage.getItem(YEAR))
    else if (x !== "") {
        window.localStorage.setItem(YEAR, x)
        window.location.reload()
        clearSavedTeams()
    }
}
document.querySelector("#top_clear_event").onclick = function() {
    clearSavedTeams()
    starred = []
    ignored = []
    usingStar = true
    usingIgnore = true
    setHeader()
}
function loadEvent() {
    loading++
    if (usingTBA) {
        load("event/" + year + window.localStorage.getItem(EVENT) + "/teams", function (data) {
            event_data = data
            for (let team of data) {
                // Todo - just replace all team["team_number"] with a variable you don't need to keep getting it 3 trillion times
                team_data[team["team_number"]] = {}
                team_data[team["team_number"]].Team_Number = team["team_number"]
                team_data[team["team_number"]].Name = team["nickname"]
                team_data[team["team_number"]].TBA = team
                team_data[team["team_number"]].TBA["matches"] = {}
                if (usingTBAMatches) {
                    loading++
                    load("team/frc" + team["team_number"] + "/event/" + year + window.localStorage.getItem(EVENT) + "/matches", function (data) {
                        loading--
                        checkLoading()
                        let matchesWon = 0
                        for (let match of data) {
                            matchesWon += checkTeamWonMatch(match, team["team_number"])
                            if (match["comp_level"] === "qm")
                                team_data[team["team_number"]].TBA["matches"][match["match_number"]] = match
                        }
                        team_data[team["team_number"]]["Winrate"] = (matchesWon / data.length)
                        regenTable()
                    })
                }
                if (usingTBAMedia) {
                    loading++
                    load("team/frc" + team["team_number"] + "/media/" + year, function (data) {
                        loading--
                        checkLoading()
                        team_data[team["team_number"]].TBA.images = []

                        for (let x of data) {
                            if (x.type === "avatar") team_data[team["team_number"]].Icon = "data:image/png;base64," + x.details["base64Image"]
                            else if (x.type === "imgur") team_data[team["team_number"]].TBA.images.push({type: "image", src: x["direct_url"]})
                            else if (x.type === "youtube") team_data[team["team_number"]].TBA.images.push({type: "youtube", src: x["foreign_key"]})
                            else console.log("Unsupported media type: " + x.type + ". (Team " + team["team_number"] + ")")
                        }
                    })
                }
                regenTable()
            }
            loading--
            checkLoading()
        })
        if (!usingTBAMatches) {
            hiddenColumns.push("Winrate")
            columns.splice(columns.indexOf("Winrate"), 1)
        }
    }
    else {
        hiddenColumns.push("Name")
        hiddenColumns.push("Winrate")
        columns.splice(columns.indexOf("Name"),1)
        columns.splice(columns.indexOf("Winrate"),1)
        processData()
    }
}
function checkTeamWonMatch(match, team) {
    team = "frc" + team
    if (match["winning_alliance"] === "") return tieValue
    let alliance = "red"
    if (match["alliances"]["blue"]["team_keys"].includes(team)) alliance = "blue"
    return alliance === match["winning_alliance"]
}
//#endregion

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
        columns = JSON.parse(JSON.stringify(defaultColumns))
        hiddenColumns = JSON.parse(JSON.stringify(defaultHiddenColumns))
        if (mapping !== undefined) processData()
        window.localStorage.setItem(SCOUTING_DATA, JSON.stringify(scouting_data))
        document.querySelector("#top_data_download").disabled = false
        if (doingInitialSetup) window.location.reload()
    })
}
document.querySelector("#top_pit").onclick = function() {
    loadFile(".csv,.json", (result, filetype) => {
        if (filetype === "csv") pit_data = csvToJson(result) // Converts CSV to JSON
        else if (filetype === "json") pit_data = JSON.parse(result) // Parses json
        else {
            let type = prompt("What is the filetype? (csv/json)").toLowerCase().trim()
            if (type === "csv") pit_data = csvToJson(result) // Converts CSV to JSON
            else if (type === "json") pit_data = JSON.parse(result) // Parses json
            else return // If none of the above, then can't process data
        }
        //columns = JSON.parse(JSON.stringify(defaultColumns))
        //hiddenColumns = JSON.parse(JSON.stringify(defaultHiddenColumns))
        //if (mapping !== undefined) processData()
        window.localStorage.setItem(PIT, JSON.stringify(pit_data))
        document.querySelector("#top_pit_download").disabled = false
        if (doingInitialSetup) window.location.reload()
    })
}
// Import mapping button
document.querySelector("#top_mapping").onclick = function() {
    loadFile(".json", (result) => {
        mapping = JSON.parse(result)
        window.localStorage.setItem(MAPPING, JSON.stringify(mapping))
        columns = JSON.parse(JSON.stringify(defaultColumns))
        hiddenColumns = JSON.parse(JSON.stringify(defaultHiddenColumns))
        handleMapping()
        if (scouting_data !== undefined) processData()
        if (doingInitialSetup) window.location.reload()
    })
}
// Adds all the columns from the mapping to the columns list
function handleMapping() {
    document.querySelector("#top_mapping_download").disabled = false
    columns = JSON.parse(JSON.stringify(defaultColumns)) // Clears columns to avoid duplicates
    if (mapping["mapping_version"] !== 1) {
        console.error("Mapping version " + mapping["mapping_version"] + " is not allowed. Allowed versions: 1")
        alert("Mapping version " + mapping["mapping_version"] + " is not allowed. Allowed versions: 1")
        return
    }
    for (let x in mapping["data"]) {
        if (mapping["data"][x]["hidden"]) hiddenColumns.push(x)
        else columns.push(x)
    }
    if (mapping["match"]["notes"] === undefined || mapping["match"]["scouter_name_key"] === undefined) { // If no notes, then cannot toggle names
        document.querySelector("#top_show_hide_comment_names").disabled = true
        showNamesInTeamComments = false
    }
    setHeader()
    saveColumns()
}
// Processes scouting_data based on information from mapping
function processData() {
    let data = {}

    const teamFormat = mapping["team"]["format"]

    let constants = {
        "pi": Math.PI,
        "e": Math.E,
        "true": 1,
        "false": 0,
    }
    for (let konstant of Object.keys(mapping["constants"])) {
        constants[konstant] = evaluate({}, constants, "" + mapping["constants"][konstant])
    }

    let ratioVars = []
    let variables = []
    let standard = []
    let ratios = []
    for (let x of Object.keys(mapping["data"])) {
        if (mapping["data"][x]["variable"] && mapping["data"][x]["format"] === "ratio")
            ratioVars.push(x)
        else if (mapping["data"][x]["variable"])
            variables.push(x)
        else if (mapping["data"][x]["format"] === "ratio")
            ratios.push(x)
        else
            standard.push(x)
    }

    function getTeam(match) {
        let team = match[mapping["team"]["key"]]
        if (teamFormat === "frc#") team = team.splice(0, 3)
        if (teamFormat === "name") {
            for (let teamKey of Object.keys(team_data)) {
                if (team_data[teamKey].Name.trim().toLowerCase() === name.trim().toLowerCase()) team = teamKey
            }
        }
        return team
    }

    // True if should be skipped, false if not
    function checkSkip(val, vars, match, expressions) {
        if (expressions === undefined) return false
        for (let exp of expressions)
            if(evaluate(Object.assign({"value": val, "match": match[mapping["match"]["number_key"]]}, vars, match), constants, exp))
                return true
        return false
    }

    // Setup Loop
    for (let match of scouting_data) {
        let team = getTeam(match)

        if (!usingTBA) team_data[team] = {Team_Number: team}
        if (typeof team_data[team] !== "undefined") { // Only does calculations if team exists (in case someone put 4951 instead of 4915, no reason to include typos or teams that aren't in the event)
            if (typeof data[team] === "undefined") {
                data[team] = {"graphs": {}, "matches": [], "variables": {}, "processed_matches": []}
                for (let column of Object.keys(mapping["data"])) {
                    if (mapping["data"][column]["format"] === "ratio") {
                        data[team][column] = {
                            "num": [],
                            "den": [],
                        }
                    }
                    else data[team][column] = []
                    if (mapping["data"][column].graph) data[team]["graphs"][column] = {}
                }
                for (let variable of variables)
                    if (mapping["data"][variable]["format"] === "ratio") {
                        data[team]["variables"][variable] = {
                            "num": [],
                            "den": [],
                        }
                    }
                    else data[team]["variables"][variable] = []
            }

            data[team]["matches"].push(match)
        }
    }

    // Ratio variable loop
    for (let match of scouting_data) {
        let team = getTeam(match)
        let matchNum = match[mapping["match"]["number_key"]]
        if (typeof team_data[team] === "undefined") continue
        if (match[mapping["match"]["number_key"]] > 999) continue // Extraneous Match Number
        if (data[team]["processed_matches"].includes(matchNum)) continue // Duplicate submission check
        data[team]["processed_matches"].push(matchNum)

        for (let column of ratioVars) {
            let num = evaluate(Object.assign(Object.assign({"match": matchNum}, match), data[team]["variables"], match), constants, mapping["data"][column].value)
            let den = evaluate(Object.assign(Object.assign({"match": matchNum}, match), data[team]["variables"], match), constants, mapping["data"][column].denominator)
            if (!isNaN(num) && !isNaN(den) && !checkSkip(x, data[team]["variables"], match, mapping["data"][column]["skip"])) {
                data[team][column]["num"].push(num)
                data[team][column]["den"].push(den)

                data[team]["variables"][column]["num"].push(num)
                data[team]["variables"][column]["den"].push(den)

                if (mapping["data"][column].graph) data[team]["graphs"][column][matchNum] = (num / den)
            }
        }
    }
    
    for (let x of Object.keys(data)) data[x]["processed_matches"] = []

    // Variable Loop
    for (let match of scouting_data) {
        let team = getTeam(match)
        let matchNum = match[mapping["match"]["number_key"]]
        if (typeof team_data[team] === "undefined") continue
        if (match[mapping["match"]["number_key"]] > 999) continue // Extraneous Match Number
        if (data[team]["processed_matches"].includes(matchNum)) continue // Duplicate submission check
        data[team]["processed_matches"].push(matchNum)

        for (let column of variables) {
            let x = evaluate(Object.assign({"match": matchNum}, match), constants, mapping["data"][column].value)
            if (!isNaN(x) && !checkSkip(x, data[team]["variables"], match, mapping["data"][column]["skip"])) {
                data[team][column].push(x)
                data[team]["variables"][column].push(x)

                if (mapping["data"][column].graph) data[team]["graphs"][column][matchNum] = x
            }
        }
    }

    for (let x of Object.keys(data)) data[x]["processed_matches"] = []

    // Variable to actual value
    for (let team of Object.keys(data))
        for (let column of variables) {
            switch (mapping["data"][column]["format"]) {
                case "mean": {
                    let num = 0
                    for (let x of data[team][column])
                        num += x
                    num /= data[team][column].length
                    data[team]["variables"][column] = num
                    break;
                }
                case "geomean": {
                    let num = 1
                    for (let x of data[team][column])
                        num *= x
                    data[team]["variables"][column] = Math.pow(num, 1/data[team][column].length)
                    break;
                }
                case "median": {
                    let nums = []
                    for (let x of data[team][column])
                        nums.push(x)
                    nums.sort((a, b) => a - b)
                    if (nums.length % 2) // If true then even, else odd.
                        data[team]["variables"][column] = (nums[Math.floor((nums.length-1)/2)] + nums[Math.ceil((nums.length-1)/2)])/2
                    else
                        data[team]["variables"][column] = nums[Math.floor((nums.length-1)/2)]
                    break;
                }
                case "sum": {
                    let num = 0
                    for (let x of data[team][column])
                        num += x
                    data[team]["variables"][column] = num
                    break;
                }
                case "ratio": {
                    let num = 0
                    let den = 0
                    for (let x of data[team][column]["num"]) num += x
                    for (let x of data[team][column]["den"]) den += x
                    data[team]["variables"][column] = (num / den)
                    break;
                }
            }
        }

    // Standard Loop
    for (let match of scouting_data) {
        let team = getTeam(match)
        let matchNum = match[mapping["match"]["number_key"]]
        if (typeof team_data[team] === "undefined") continue
        if (match[mapping["match"]["number_key"]] > 999) continue // Extraneous Match Number
        if (data[team]["processed_matches"].includes(matchNum)) continue // Duplicate submission check
        data[team]["processed_matches"].push(matchNum)

        for (let column of standard) {
            let x = evaluate(Object.assign({"match": matchNum}, data[team]["variables"], match), constants, mapping["data"][column].value)
            if (!isNaN(x) && !checkSkip(x, data[team]["variables"], match, mapping["data"][column]["skip"])) {
                data[team][column].push(x)

                if (mapping["data"][column].graph) data[team]["graphs"][column][matchNum] = x
            }
        }
    }

    for (let x of Object.keys(data)) data[x]["processed_matches"] = []

    // ratio loop
    for (let match of scouting_data) {
        let team = getTeam(match)
        let matchNum = match[mapping["match"]["number_key"]]
        if (typeof team_data[team] === "undefined") continue
        if (match[mapping["match"]["number_key"]] > 999) continue // Extraneous Match Number
        if (data[team]["processed_matches"].includes(matchNum)) continue // Duplicate submission check
        data[team]["processed_matches"].push(matchNum)

        for (let column of ratios) {
            let num = evaluate(Object.assign({"match": matchNum}, data[team]["variables"], match), constants, mapping["data"][column].value)
            let den = evaluate(Object.assign({"match": matchNum}, data[team]["variables"], match), constants, mapping["data"][column].denominator)
            if (!isNaN(num) && !isNaN(den) && !checkSkip(num / den, data[team]["variables"], match, mapping["data"][column]["skip"])) {
                data[team][column]["num"].push(num)
                data[team][column]["den"].push(den)

                if (mapping["data"][column].graph) data[team]["graphs"][column][matchNum] = (num / den)
            }
        }
    }

    // Adds data to team_data
    for (let t of Object.keys(data)) {
        team_data[t]["graphs"] = data[t]["graphs"]
        team_data[t]["matches"] = data[t]["matches"]
        for (let column of Object.keys(mapping["data"])) {
            switch (mapping["data"][column]["format"]) {
                case "mean": {
                    let num = 0
                    for (let x of data[t][column])
                        num += x
                    num /= data[t][column].length
                    team_data[t][column] = num
                    break;
                }
                case "geomean": {
                    let num = 1
                    for (let x of data[t][column])
                        num *= x
                    team_data[t][column] = Math.pow(num, 1/data[t][column].length)
                    break;
                }
                case "median": {
                    let nums = []
                    for (let x of data[t][column])
                        nums.push(x)
                    nums.sort((a, b) => a - b)
                    if (nums.length % 2) // If true then even, else odd.
                        team_data[t][column] = (nums[Math.floor((nums.length-1)/2)] + nums[Math.ceil((nums.length-1)/2)])/2
                    else
                        team_data[t][column] = nums[Math.floor((nums.length-1)/2)]
                    break;
                }
                case "sum": {
                    let num = 0
                    for (let x of data[t][column])
                        num += x
                    team_data[t][column] = num
                    break;
                }
                case "ratio": {
                    let num = 0
                    let den = 0
                    for (let x of data[t][column]["num"]) num += x
                    for (let x of data[t][column]["den"]) den += x
                    team_data[t][column] = (num / den)
                    break;
                }
                default:
                    team_data[t][column] = "Missing Format"
            }
        }
    }

    // Handles all "display string" cases
    for (let t of Object.keys(data)) {
        for (let column of Object.keys(mapping["data"])) {
            if (typeof mapping["data"][column]["display"] === "object") {
                let value = team_data[t][column]
                team_data[t][column] = NaN
                let vars = Object.assign({}, data[t]["variables"], {"value": value})
                for (let x of Object.keys(mapping["data"][column]["display"])) {
                    if (evaluate(vars, constants, mapping["data"][column]["display"][x]))
                        team_data[t][column] = x
                }
            }
        }
    }

    regenTable()
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
document.querySelector("#top_pit_download").onclick = () => download("pit_data.json", JSON.stringify(pit_data))
document.querySelector("#top_mapping_download").onclick = () => download("mapping.json", JSON.stringify(mapping))

document.querySelector("#top_rounding").onclick = function() {
    let x = prompt("Round to how many digits?")
    x = parseInt(x)
    if (isNaN(x)) return
    roundingDigits = Math.max(Math.min(x, 16), 0)
    rounding = Math.pow(10, roundingDigits)
    saveGeneralSettings()
    setRoundingEl()
    regenTable()
}
function setRoundingEl() {
    document.querySelector("#top_rounding").innerText = "Rounding: " + (roundingDigits === 0 ? "Integer" : (roundingDigits === 16 ? "Float" : roundingDigits + " digits"))
}
//#endregion

//#region Theme, Projector Mode
// Updates the theme in document and handles theme in localStorage
function updateTheme() {
    theme = parseInt(window.localStorage.getItem(THEME))
    if (isNaN(theme)) { // If theme isn't set in localStorage
        window.localStorage.setItem(THEME, "0")
        updateTheme()
        return
    }
    changeThemeTo(theme)
}
function changeThemeTo(theme) {
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
document.querySelector("#top_projector").addEventListener("click", () => {
    projectorMode = !projectorMode
    setProjectorModeSheet()
})

function setProjectorModeSheet() {
    document.querySelector("#top_projector").innerText = "Projector Mode: " + (projectorMode ? "Enabled" : "Disabled")
    for (let stylesheet of document.styleSheets) {
        if (stylesheet.title === "projector") {
            stylesheet.disabled = !projectorMode
            return
        }
    }
    console.error("Couldn't find a projector mode stylesheet")
}
//#endregion

//#region Table
let tableMode = "main"
let tableTeams = []

// Sets the table header
function setHeader() {
    let header = document.querySelector(".table-head.main-table")
    if (tableMode === "team") header = document.querySelector(".table-head.team-table")
    while (header.children.length > 0) header.children[0].remove()

    let starIgnoreHolder = document.createElement("div")
    starIgnoreHolder.className = "star-ignore-holder"
    header.appendChild(starIgnoreHolder)

    let starToggle = document.createElement("span")
    starToggle.id = "select_star"
    starToggle.className = "material-symbols-outlined ar star"
    if (usingStar) starToggle.classList.add("filled")
    starToggle.innerText = "star"
    starToggle.addEventListener("click", star_toggle)
    starToggle.setAttribute("data-context", "star")
    starIgnoreHolder.appendChild(starToggle)

    let ignoreToggle = document.createElement("span")
    ignoreToggle.id = "select_ignore"
    ignoreToggle.className = "material-symbols-outlined ar ignore"
    if (usingIgnore) ignoreToggle.classList.add("filled")
    ignoreToggle.innerText = "block"
    ignoreToggle.addEventListener("click", ignore_toggle)
    ignoreToggle.setAttribute("data-context", "ignore")
    starIgnoreHolder.appendChild(ignoreToggle)

    if (showTeamIcons) {
        let iconPlaceholder = document.createElement("div")
        iconPlaceholder.classList.add("icon")
        iconPlaceholder.title = "Icon Placeholder"
        iconPlaceholder.setAttribute("data-context", "icon-column")
        header.appendChild(iconPlaceholder)
    }
    for (let column of columns) {
        let el = document.createElement("div")
        el.id = "select_" + column.replaceAll(/\W/g, "")
        el.classList.add("data")
        el.classList.add("small")
        if (column === selectedSort) {
            el.classList.add("highlighted")
            if (sortDirection === 1) el.classList.add("top")
            if (sortDirection === -1) el.classList.add("bottom")
        }
        el.addEventListener("click", () => changeSort(column))
        el.innerText = column.replaceAll("_", " ")
        el.setAttribute("data-context", "column")
        el.setAttribute("data-context-index", columns.indexOf(column))
        header.appendChild(el)
    }
    regenTable()
}
// Creates the element for a row in the table for the given team
function element(team) {
    if (ignored.includes(team) && !showIgnoredTeams && tableMode !== "team") return

    let el = document.createElement("div")
    el.classList.add("row")
    el.id = team

    let controls = document.createElement("div")
    controls.classList.add("row-controls")

    let starEl = document.createElement("span")
    starEl.className = "material-symbols-outlined ar star"
    if (starred.includes(team)) starEl.classList.add("filled")
    starEl.onclick = () => star(team)
    starEl.innerText = "star"
    controls.appendChild(starEl)

    let ignoreEl = document.createElement("span")
    ignoreEl.className = "material-symbols-outlined ar ignore"
    if (ignored.includes(team)) ignoreEl.classList.add("filled")
    ignoreEl.onclick = () => ignore(team)
    ignoreEl.innerText = "block"
    controls.appendChild(ignoreEl)

    el.appendChild(controls)

    if (showTeamIcons) {
        let iconParent = document.createElement("button")
        iconParent.className = "icon-holder"
        if (tableMode === "team")
            iconParent.onclick = () => {
                openTeam(team)
            }
        else iconParent.onclick = () => openTeam(team)
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
        // If undefined, leave empty. Else, display the data. If data is a float, round it. Else, leave as is.
        columnEl.innerText = team_data[team][column] === undefined ? "" : (isNaN(parseFloat(team_data[team][column])) ? team_data[team][column] : Math.round(rounding * parseFloat(team_data[team][column])) / rounding)
        if (mapping !== undefined && mapping["data"][column] !== undefined) {
            if (mapping["data"][column]["display"] !== undefined) {
                if (mapping["data"][column]["display"] === "percentage" || mapping["data"][column]["display"] === "percent" || mapping["data"][column]["display"] === "%")
                    columnEl.innerText = (100 * Math.round(rounding * parseFloat(team_data[team][column])) / rounding) + "%"
            }
        }
        if (isNaN(team_data[team][column]) && typeof team_data[team][column] === "number") {
            columnEl.innerText = "-"
        }
        if (columnEl.innerText.length > 10) columnEl.style.fontSize = Math.max(1.2 - ((.025) * (columnEl.innerText.length-10)), .7) + "rem"
        el.appendChild(columnEl)
    }

    if (tableMode === "team") document.querySelector(".table.team-table").appendChild(el)
    else document.querySelector(".table.main-table").appendChild(el)

    el.style.order = sort(team)
}
// Clears the table
function clearTable() {
    if (tableMode === "team")
        while (document.querySelector(".table.team-table").children.length > 0)
            document.querySelector(".table.team-table").children[0].remove()
    else
        while (document.querySelector(".table.main-table").children.length > 0)
            document.querySelector(".table.main-table").children[0].remove()
}
// Regenerates the table
function regenTable() {
    clearTable()
    if (tableMode === "team") for (let team of tableTeams) element(team)
    else for (let team of Object.keys(team_data)) element(team)

    if (ignored.length > 0) {
        if (!showIgnoredTeams) {
            let el = document.createElement("div")
            el.className = "row ignoredlist"
            el.style.order = Math.pow(10,20)

            el.innerText = ignored.length + " teams ignored."

            if (tableMode !== "team") document.querySelector(".table.main-table").appendChild(el)

            let showButton = document.createElement("button")
            showButton.innerText = "Show Ignored Teams"
            showButton.addEventListener("click", () => {
                showIgnoredTeams = true
                regenTable()
            })

            el.appendChild(showButton)

            let remaining = []
            for (let x of Object.keys(team_data))
                if (!ignored.includes(x)) remaining.push(x)
            if (1 < remaining.length && remaining.length <= 6) {
                let openButton = document.createElement("button")
                openButton.innerText = "Compare Remaining " + remaining.length + " Teams"
                openButton.addEventListener("click", () => {
                    openTeam(remaining[0], remaining.slice(1,remaining.length))
                })
                el.appendChild(openButton)
            }
        } else if (usingIgnore) {
            let el = document.createElement("div")
            el.className = "row divider"
            el.style.order = Math.pow(10,8)

            if (tableMode === "team") document.querySelector(".table.team-table").appendChild(el)
            else document.querySelector(".table.main-table").appendChild(el)
        }
    }

    if (starred.length > 0 && usingStar) {
        let el = document.createElement("div")
        el.className = "row divider"
        el.style.order = -Math.pow(10,8)

        if (tableMode === "team") document.querySelector(".table.team-table").appendChild(el)
        else document.querySelector(".table.main-table").appendChild(el)
    }

}

document.querySelector(".table.main-table").addEventListener("scroll", (e) => {
    document.querySelector(".table-head.main-table").scrollLeft = document.querySelector(".table.main-table").scrollLeft
})

//#endregion

//#region Team Pages
let maintainedTeamPageSettings
let openedTeam

let commentsExpanded = true
let pitDataExpanded = true

function openTeam(team, comparisons, hiddenCompares) {
    // Hiding table and showing team page element
    document.querySelector(".table.main-table").classList.add("hidden")
    document.querySelector(".table.main-table").innerText = ""
    document.querySelector(".table-head.main-table").classList.add("hidden")
    document.querySelector(".table-head.main-table").innerText = ""

    openedTeam = team

    let el = document.querySelector(".team-page")
    el.classList.remove("hidden")
    el.innerText = ""

    if (comparisons === undefined) comparisons = []
    if (hiddenCompares === undefined) hiddenCompares = []

    // Start of team page element assembly
    let data = team_data[team]

    let commentsEnabled = mapping["match"]["notes"] !== undefined // todo: check
    let comments = ""

    if (commentsEnabled) {
        for (let match of data.matches) {
            if ((""+match[mapping["match"]["notes"]]).trim() !== "")
                if (match[mapping["match"]["notes"]] !== 0)
                    if (showNamesInTeamComments)
                        comments = comments + match[mapping["match"]["notes"]] + "    -" + match[mapping["match"]["scouter_name_key"]] + " (" + match[mapping["match"]["number_key"]] + ")\n\n"
                    else
                        comments = comments + match[mapping["match"]["notes"]] + " (Match " + match[mapping["match"]["number_key"]] + ")\n\n"
        }
        comments = comments.trim()
    } else comments = "No comments"

    // General Layout Assembly
    let holder = document.createElement("div")
    holder.className = "team-page-holder"

    let teamInfo = document.createElement("div")
    teamInfo.className = "team-info"
    holder.appendChild(teamInfo)

    //#region Team Info
    let basicInfo = document.createElement("div")
    basicInfo.className = "team-info-basic"
    teamInfo.appendChild(basicInfo)

    if (showTeamIcons) {
        let teamLogo = document.createElement("img")
        teamLogo.className = "logo-large"
        teamLogo.src = data.Icon
        basicInfo.appendChild(teamLogo)
    }

    let teamDescription = document.createElement("div")
    teamDescription.className = "team-info-description"
    basicInfo.appendChild(teamDescription)

    let teamName = document.createElement("div")
    teamName.className = "team-name"
    if (data.Name === undefined) teamName.innerText = data.Team_Number
    else teamName.innerText = data.Team_Number + " " + data.Name.substring(0, 20) + (data.Name.length > 20 ? "..." : "")
    teamName.title = data.Name
    teamDescription.appendChild(teamName)

    let pitImages = []
    if (mapping["pit_scouting"] !== undefined && mapping["pit_scouting"]["image"] !== undefined && pit_data !== undefined) {
        for (let x of pit_data) {
            let teamNum = x[mapping["pit_scouting"]["team"]["key"]]
            if (mapping["pit_scouting"]["format"] === "frc#") teamNum = teamNum.splice(0, 3)
            if (mapping["pit_scouting"]["format"] === "name") {
                for (let teamKey of Object.keys(team_data)) {
                    if (team_data[teamKey].Name.trim().toLowerCase() === teamNum.trim().toLowerCase()) teamNum = teamKey
                }
            }
            console.log(teamNum)
            if (teamNum != team) continue

            if (typeof mapping["pit_scouting"]["image"] === "object") {
                for (let key of mapping["pit_scouting"]["image"])
                    pitImages.push(x[key])
            }
            else if (x[mapping["pit_scouting"]["image"]]) pitImages.push(x[mapping["pit_scouting"]["image"]])
        }
    }
    console.log(pitImages)

    let imageButton = document.createElement("button")
    imageButton.innerText = "View Media"
    imageButton.addEventListener("click", () => {
        document.querySelector(".sticky-header").hidden = true

        let bg = document.createElement("div")
        bg.className = "team-image-display-bg"
        document.body.appendChild(bg)

        let imageCycleCounter = document.createElement("div")
        imageCycleCounter.className = "team-image-display-counter"
        bg.appendChild(imageCycleCounter)

        let panel = document.createElement("div")
        panel.className = "team-image-display"

        let imageDisplay = document.createElement("div")
        imageDisplay.className = "team-image-display-holder"

        let imageIndex = 0

        function updateImage() {
            imageCycleCounter.innerText = "(" + (imageIndex+1) + "/" + (data.TBA.images.length+pitImages.length) + ")"
            imageDisplay.innerHTML = ""
            let media = imageIndex >= data.TBA.images.length ? pitImages[imageIndex - data.TBA.images.length] : data.TBA.images[imageIndex]
            if (imageIndex >= data.TBA.images.length) {
                let mediaHolder = document.createElement("img")
                mediaHolder.src = media
                imageDisplay.appendChild(mediaHolder)
            }
            if (media.type === "image") {
                let mediaHolder = document.createElement("img")
                mediaHolder.src = media.src
                imageDisplay.appendChild(mediaHolder)
            }
            if (media.type === "youtube") {
                let mediaHolder = document.createElement("iframe")
                mediaHolder.setAttribute("allow", "fullscreen")
                mediaHolder.src = "https://www.youtube.com/embed/" + media.src
                mediaHolder.width = "600"
                mediaHolder.height = "500"
                imageDisplay.appendChild(mediaHolder)
            }
        }

        if ((data.TBA.images.length + pitImages.length) > 1) {
            let leftButton = document.createElement("span")
            leftButton.innerText = "arrow_back"
            let rightButton = document.createElement("span")
            rightButton.innerText = "arrow_forward"
            leftButton.className = rightButton.className = "material-symbols-outlined"
            leftButton.addEventListener("click", () => {
                imageIndex--
                if (imageIndex < 0) imageIndex += data.TBA.images.length + pitImages.length
                updateImage()
            })
            rightButton.addEventListener("click", () => {
                imageIndex = (imageIndex + 1) % (data.TBA.images.length + pitImages.length)
                updateImage()
            })
            panel.appendChild(leftButton)
            panel.appendChild(imageDisplay)
            panel.appendChild(rightButton)
        } else panel.appendChild(imageDisplay)

        updateImage()

        bg.appendChild(panel)

        let closeImages = document.createElement("button")
        closeImages.innerText = "Close Media"
        closeImages.addEventListener("click", () => {
            bg.remove()
            document.querySelector(".sticky-header").hidden = false
        })
        bg.appendChild(closeImages)
    })

    if ((usingTBAMedia && data.TBA.images.length > 0) || pitImages.length > 0)
        teamDescription.appendChild(imageButton)

    let starEl = document.createElement("span")
    starEl.className = "material-symbols-outlined ar team-star"
    if (starred.includes(team)) starEl.classList.add("filled")
    starEl.onclick = function() {
        star(team)
        if (starred.includes(team)) starEl.classList.add("filled")
        else starEl.classList.remove("filled")
    }
    starEl.innerText = "star"
    teamName.appendChild(starEl)

    let ignoreEl = document.createElement("span")
    ignoreEl.className = "material-symbols-outlined ar team-star ignore"
    if (ignored.includes(team)) ignoreEl.classList.add("filled")
    ignoreEl.onclick = function() {
        ignore(team)
        if (ignored.includes(team)) ignoreEl.classList.add("filled")
        else ignoreEl.classList.remove("filled")
    }
    ignoreEl.innerText = "block"
    teamName.appendChild(ignoreEl)

    if (usingTBA) {
        if (!projectorMode) {
            let teamDescriptionRemainder = document.createElement("div")
            teamDescriptionRemainder.innerText = "Rookie Year: " + data.TBA["rookie_year"] + "\n" + data.TBA["city"] + ", " + data.TBA["state_prov"]
            teamDescription.appendChild(teamDescriptionRemainder)
        }

        if (usingTBAMatches) {
            let matchSearch = document.createElement("input")

            let showMatchesEl = document.createElement("button")
            showMatchesEl.innerText = (maintainedTeamPageSettings.showMatches ? "Hide matches" : "Show Matches")
            showMatchesEl.addEventListener("click", () => {
                maintainedTeamPageSettings.showMatches = !maintainedTeamPageSettings.showMatches
                showMatchesEl.innerText = (maintainedTeamPageSettings.showMatches ? "Hide matches" : "Show Matches")
                matchSearch.classList.toggle("hidden")
                document.querySelector(".matches").classList.toggle("hidden")
                saveGeneralSettings()
                generateTeamMatches(data, team, matchSearch.value)
            })
            teamInfo.appendChild(showMatchesEl)

            matchSearch.placeholder = "Comma separated team numbers (names coming soon)"
            matchSearch.onchange = matchSearch.onkeyup = matchSearch.oninput = function() {
                generateTeamMatches(data, team, matchSearch.value)
            }
            if (!maintainedTeamPageSettings.showMatches) matchSearch.classList.add("hidden")
            teamInfo.appendChild(matchSearch)
        }
    }

    let matches = document.createElement("div")
    matches.className = "matches"
    if (!maintainedTeamPageSettings.showMatches) matches.classList.add("hidden")
    teamInfo.appendChild(matches)

    //#endregion

    //#region Comparisons
    let compareHolder = document.createElement("div")
    compareHolder.className = "compare-holder"
    teamInfo.appendChild(compareHolder)

    let compareHeader = document.createElement("div")
    compareHeader.className = "compare-header"
    compareHolder.appendChild(compareHeader)

    let compareTitle = document.createElement("div")
    compareTitle.innerText = "Compare"
    compareHeader.appendChild(compareTitle)

    let addComparisonBtn = document.createElement("button")
    addComparisonBtn.innerText = "Add Team"
    addComparisonBtn.addEventListener("click", () => {
        if (usingDesmos && comparisons.length >= desmosColors.length - 1) {
            alert("Cannot have more than " + (desmosColors.length - 1) + " teams in comparison. Sorry!")
            return
        }
        let x = prompt("Enter a team number to add to comparison").trim()
        if (x === null) return
        if (comparisons.includes(x) || x === team) return
        if (team_data[x] !== undefined) {
            comparisons.push(x)
            addComparisonElement(x)
        }
        addGraph()

        tableTeams = JSON.parse(JSON.stringify(comparisons))
        tableTeams.push(team)
        regenTable()
    })
    compareHeader.appendChild(addComparisonBtn)

    for (let c of comparisons) {
        addComparisonElement(c)
    }

    function addComparisonElement(c) {
        let compareEl = document.createElement("div")
        compareEl.className = "compare-team"

        let visibility = document.createElement("span")
        visibility.className = "material-symbols-outlined ar team-compare-star"
        visibility.onclick = function() {
            if (hiddenCompares.includes(c)) hiddenCompares.splice(hiddenCompares.indexOf(c), 1)
            else hiddenCompares.push(c)
            openTeam(team, comparisons, hiddenCompares)
        }
        visibility.innerText = "visibility"
        if (hiddenCompares.includes(c)) visibility.innerText = "visibility_off"
        compareEl.appendChild(visibility)

        let starEl = document.createElement("span")
        starEl.className = "material-symbols-outlined ar team-compare-star"
        if (starred.includes(c)) starEl.classList.add("filled")
        starEl.onclick = function() {
            star(c)
            if (starred.includes(c)) starEl.classList.add("filled")
            else starEl.classList.remove("filled")
        }
        starEl.innerText = "star"
        compareEl.appendChild(starEl)

        let ignoreEl = document.createElement("span")
        ignoreEl.className = "material-symbols-outlined ar team-compare-star ignore"
        if (ignored.includes(c)) ignoreEl.classList.add("filled")
        ignoreEl.onclick = function() {
            ignore(team)
            if (ignored.includes(team)) ignoreEl.classList.add("filled")
            else ignoreEl.classList.remove("filled")
        }
        ignoreEl.innerText = "block"
        compareEl.appendChild(ignoreEl)

        let compareTeamName = document.createElement("div")
        compareTeamName.innerText = c
        if (usingTBA) compareTeamName.innerText += " " + team_data[c].Name
        compareTeamName.className = "compare-team-name"
        compareTeamName.addEventListener("click", () => {
            comparisons.splice(comparisons.indexOf(c), 1, team)
            openTeam(c, comparisons)
        })
        compareEl.appendChild(compareTeamName)

        let deleteEl = document.createElement("span")
        deleteEl.className = "material-symbols-outlined ar team-compare-delete"
        deleteEl.onclick = function() {
            comparisons.splice(comparisons.indexOf(c), 1)
            compareEl.remove()
            addGraph()
        }
        deleteEl.innerText = "delete"
        compareEl.appendChild(deleteEl)

        compareHolder.appendChild(compareEl)
    }

    //#endregion

    //#region Team Data
    let teamData = document.createElement("div")
    teamData.className = "team-data"
    holder.appendChild(teamData)

    //#region Graph
    let graph = maintainedTeamPageSettings["graph"]
    if (graph === undefined) graph = Object.keys(data.graphs)[0]

    let graphCommentsHolder = document.createElement("div")
    graphCommentsHolder.className = "graph-comments-holder"
    teamData.appendChild(graphCommentsHolder)

    let graphOverallHolder = document.createElement("div")
    graphOverallHolder.className = "graph-holder"
    if (usingDesmos)
        graphCommentsHolder.appendChild(graphOverallHolder)

    let graphControls = document.createElement("div")
    graphControls.className = "graph-controls"
    graphOverallHolder.appendChild(graphControls)

    let graphSelectionsHolder = document.createElement("select")
    graphSelectionsHolder.className = "graph-selection-holder"
    graphSelectionsHolder.addEventListener("change", () => {
        graph = graphSelectionsHolder.value
        maintainedTeamPageSettings["graph"] = graph
        addGraph()
    })
    graphControls.appendChild(graphSelectionsHolder)

    for (let graphOption of Object.keys(data.graphs)) {
        let goEl = document.createElement("option")
        goEl.innerText = graphOption.replaceAll("_", " ")
        goEl.value = graphOption
        goEl.className = "graph-option"
        if (graphOption === graph) goEl.setAttribute("selected", "selected")
        graphSelectionsHolder.appendChild(goEl)
    }

    let graphRefresh = document.createElement("button")
    graphRefresh.innerText = "Refresh Graph"
    graphRefresh.addEventListener("click", addGraph)
    graphControls.appendChild(graphRefresh)

    let graphHeight = maintainedTeamPageSettings["graphHeight"]
    let graphHolder = document.createElement("div")
    graphHolder.className = "graph initial"
    graphHolder.innerText = "Select something to graph"
    graphOverallHolder.appendChild(graphHolder)

    function addGraph() {
        if (!usingDesmos) return
        while (graphHolder.children.length > 0) graphHolder.children[0].remove()
        let graphData = [data.graphs[graph]]
        let graphTeams = [team]
        for (let team of comparisons) {
            if (!hiddenCompares.includes(team)) {
                graphData.push(team_data[team].graphs[graph])
                graphTeams.push(team)
            }
        }
        let teams = JSON.parse(JSON.stringify(comparisons))
        teams.unshift(team)
        graphHolder.innerText = ""
        graphHolder.classList.remove("initial")
        
        // noinspection JSSuspiciousNameCombination
        graphHolder.appendChild(graphElement(graphData, graph.replaceAll("_", " "), graphTeams, graphHeight, graphHeight))
    }
    addGraph()
    //#endregion

    //#region Comments & Pit Data
    let commentsHolder = document.createElement("div")
    let commentsTitle = document.createElement("div")
    let commentsEl = document.createElement("div")
    commentsHolder.className = "comments-holder"
    graphCommentsHolder.appendChild(commentsHolder)

    commentsTitle.className = "comments-title"
    commentsTitle.innerText = "Team Comments"
    commentsTitle.addEventListener("click", () => {
        commentsExpanded = !commentsExpanded
        commentsEl.hidden = !commentsExpanded
    })
    commentsHolder.appendChild(commentsTitle)
    if (!commentsExpanded)
        commentsEl.hidden = true

    commentsEl.className = "team-comments"
    if (!usingDesmos)
        commentsEl.classList.add("nograph")
    commentsEl.innerText = comments
    commentsHolder.appendChild(commentsEl)

    if (mapping["pit_scouting"] !== undefined && pit_data !== undefined) {
        let pitDataTitle = document.createElement("div")
        pitDataTitle.className = "pit-data-title"
        pitDataTitle.innerText = "Pit Data"
        commentsHolder.appendChild(pitDataTitle)

        let pitDataHolder = document.createElement("div")
        pitDataHolder.className = "comments-holder"
        commentsHolder.appendChild(pitDataHolder)
        if (!pitDataExpanded)
            pitDataHolder.classList.add("hidden")

        pitDataTitle.addEventListener("click", () => {
            pitDataExpanded = !pitDataExpanded
            pitDataHolder.classList.toggle("hidden")
        })
        
        for (let x of pit_data) {
            let teamNum = x[mapping["pit_scouting"]["team"]["key"]]
            if (mapping["pit_scouting"]["format"] === "frc#") teamNum = teamNum.splice(0, 3)
            if (mapping["pit_scouting"]["format"] === "name") {
                for (let teamKey of Object.keys(team_data)) {
                    if (team_data[teamKey].Name.trim().toLowerCase() === teamNum.trim().toLowerCase()) teamNum = teamKey
                }
            }

            if (teamNum != team) continue

            for (let col of Object.keys(mapping["pit_scouting"]["page"])) {
                let el = document.createElement("div")
                el.className = "team-page-pit"

                let columnName = document.createElement("div")
                columnName.className = "team-page-pit-name"
                columnName.innerText = col
                el.appendChild(columnName)

                let columnData = document.createElement("div")
                columnData.className = "team-page-pit-data"
                columnData.innerText = col
                columnData.innerText = x[mapping["pit_scouting"]["page"][col]]
                el.appendChild(columnData)

                pitDataHolder.appendChild(el)
            }

            break
        }
    }

    //#endregion

    let teamTableHead = document.createElement("div")
    teamTableHead.className = "row table-head team-table b"
    teamData.appendChild(teamTableHead)

    let teamTable = document.createElement("div")
    teamTable.className = "table team-table"
    teamData.appendChild(teamTable)

    //#endregion

    //#region Resize Drag things (todo: come up with better name)

    let teamInfoWidth = maintainedTeamPageSettings["teamInfoWidth"]
    teamInfo.style.width = teamInfoWidth + "px"
    let teamInfoDrag = document.createElement("div")
    teamInfoDrag.className = "drag width"
    teamInfoDrag.addEventListener("mousedown", (e) => {
        let startX = e.x
        let startW = teamInfo.clientWidth
        document.body.addEventListener("mousemove", bodyMove)
        document.body.addEventListener("mouseup", bodyUp)
        function bodyMove(e) {
            teamInfoWidth = Math.min(startW - (startX - e.x), window.innerWidth / 2)
            teamInfo.style.width = teamInfoWidth + "px"
            teamInfoWidth = teamInfo.offsetWidth
            maintainedTeamPageSettings["teamInfoWidth"] = teamInfoWidth
            saveGeneralSettings()
            window.getSelection().removeAllRanges()
            restrictTable()
        }
        function bodyUp() {
            document.body.removeEventListener("mousemove", bodyMove)
            document.body.removeEventListener("mouseup", bodyUp)
            window.getSelection().removeAllRanges()
            restrictTable()
        }
    })
    holder.insertBefore(teamInfoDrag, teamData)

    function restrictTable() {
        teamTable.style.maxWidth = teamTableHead.style.maxWidth = (window.innerWidth - teamInfoWidth - 32) + "px"
    }
    restrictTable()

    graphHolder.style.width = graphHolder.style.height = graphHeight + "px"
    if (commentsEnabled) commentsHolder.style.maxHeight = Math.max(graphHeight, 374) + "px"
    let graphDrag = document.createElement("div")
    graphDrag.className = "drag height padding"
    graphDrag.addEventListener("mousedown", (e) => {
        let startY = e.y
        let startH = graphHolder.clientHeight
        if (!usingDesmos) startH = commentsEl.clientHeight
        document.body.addEventListener("mousemove", bodyMove)
        document.body.addEventListener("mouseup", bodyUp)
        graphHolder.innerHTML = ""
        e.preventDefault()
        function bodyMove(e) {
            graphHeight = Math.min(startH - (startY - e.y), window.innerHeight - document.querySelector(".sticky-header").clientHeight - 100)
            commentsHolder.style.maxHeight = graphHolder.style.width = graphHolder.style.height = graphHeight + "px"
            if (!usingDesmos) commentsHolder.style.minHeight = Math.max(graphHeight, 374) + "px"
            if (usingDesmos) graphHeight = graphHolder.offsetHeight
            else graphHeight = commentsEl.offsetHeight
            maintainedTeamPageSettings["graphHeight"] = graphHeight
            saveGeneralSettings()
            e.preventDefault()
            window.getSelection().removeAllRanges()
        }
        function bodyUp(e) {
            document.body.removeEventListener("mousemove", bodyMove)
            document.body.removeEventListener("mouseup", bodyUp)
            addGraph()
            saveGeneralSettings()
            e.preventDefault()
            window.getSelection().removeAllRanges()
        }
    })
    teamData.insertBefore(graphDrag, teamTableHead)

    //#endregion

    // Final Composition
    let backButton = document.createElement("button")
    backButton.className = "back-button"
    backButton.innerHTML = `<span class="material-symbols-outlined">arrow_back</span> Back to Table`
    backButton.addEventListener("click", closeTeam)
    el.appendChild(backButton)

    el.appendChild(holder)

    tableMode = "team"
    tableTeams = JSON.parse(JSON.stringify(comparisons))
    tableTeams.push(team)
    for (let x of hiddenCompares)
        tableTeams.splice(tableTeams.indexOf(x), 1)
    generateTeamMatches(data, team, "")
    setHeader()
    regenTable()

    document.querySelector(".table.team-table").addEventListener("scroll", (e) => {
        document.querySelector(".table-head.team-table").scrollLeft = document.querySelector(".table.team-table").scrollLeft
    })
}
function closeTeam() {
    document.querySelector(".table.main-table").classList.remove("hidden")
    document.querySelector(".table-head.main-table").classList.remove("hidden")
    document.querySelector(".team-page").innerText = ""
    tableMode = "main"
    openedTeam = undefined
    regenTable()
    setHeader()
}

function generateTeamMatches(data, team, teamsWith) {
    while(document.querySelector(".matches").children.length > 0)
        document.querySelector(".matches").children[0].remove()

    let skipTeamCheck = (teamsWith === undefined || teamsWith.trim() === "")
    if (!skipTeamCheck)
        teamsWith = teamsWith.trim().split(",")

    if (usingTBA && usingTBAMatches) {
        let upcoming = false
        for (let match of Object.keys(data.TBA.matches)) {
            let mEl = document.createElement("div")
            mEl.className = "match"

            let matchData = data.TBA.matches[match]
            let alliance = matchData["alliances"]["blue"]["team_keys"].includes(data.TBA.key) ? "blue" : "red"

            if (matchData["alliances"]["blue"]["score"] === -1 && !upcoming) {
                let upcomingEl = document.createElement("div")
                upcomingEl.className = "matches-upcoming-label"
                upcomingEl.innerText = "Awaiting Results"

                upcoming = true
                document.querySelector(".matches").appendChild(upcomingEl)
            }

            //#region Children
            let matchNumber = document.createElement("div")
            matchNumber.className = "match-number"
            matchNumber.innerText = match
            mEl.appendChild(matchNumber)

            let icon = "skull" // Lose
            if (upcoming) icon = "schedule"
            else if (matchData["winning_alliance"] === alliance) icon = "trophy" // Win
            else if (matchData["winning_alliance"] === "") icon = "balance" // Tie

            let iconEl = document.createElement("span")
            iconEl.className = "material-symbols-outlined"
            iconEl.innerText = icon
            matchNumber.classList.add(icon)
            matchNumber.appendChild(iconEl)

            let firstAlliance = document.createElement("div")
            firstAlliance.className = "match-alliance " + alliance
            for (let t of matchData["alliances"][alliance]["team_keys"]) {
                let tEl = document.createElement("div")
                tEl.innerText = t.replace("frc", "")
                if (t.replace("frc", "") === team) tEl.style.order = "-10000"
                firstAlliance.appendChild(tEl)
            }
            mEl.appendChild(firstAlliance)

            let secondAlliance = document.createElement("div")
            secondAlliance.className = "match-alliance " + (alliance === "blue" ? "red" : "blue")
            for (let t of matchData["alliances"][(alliance === "blue" ? "red" : "blue")]["team_keys"]) {
                let tEl = document.createElement("div")
                tEl.innerText = t.replace("frc", "")
                secondAlliance.appendChild(tEl)
            }
            mEl.appendChild(secondAlliance)

            if (icon === "schedule") mEl.title = "Awaiting Results"
            else mEl.title = icon.replace("skull", "Lost").replace("trophy", "Won").replace("balance", "Tie")
                + " " + matchData["alliances"][alliance]["score"] + " | " + matchData["alliances"][(alliance === "blue" ? "red" : "blue")]["score"]
            //#endregion

            let teams = matchData["alliances"]["blue"]["team_keys"].concat(matchData["alliances"]["red"]["team_keys"])
            for (let t in teams) teams[t] = teams[t].replace("frc", "")

            if (skipTeamCheck) document.querySelector(".matches").appendChild(mEl)
            else {
                let containsTeam = false
                for (let t of teamsWith)
                    if (teams.includes(t.trim())) containsTeam = true
                if (containsTeam)
                    document.querySelector(".matches").appendChild(mEl)
            }
        }
    }
    else {
        let mEl = document.createElement("div")
        mEl.innerText = "Matches: "
        mEl.className = "match"
        for (let match of Object.keys(data.matches)) {
            mEl.innerText += data.matches[match][mapping["match"]["number"]] + ", "
        }
        mEl.innerText = mEl.innerText.substring(0, mEl.innerText.length - 2)
        document.querySelector(".matches").appendChild(mEl)
    }
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

function graphElement(data, name, teams, width, height) {
    let el = document.createElement("div")
    el.style.width = width === undefined ? "500px" : width + "px"
    el.style.height = height === undefined ? "500px" : height + "px"
    let calc = Desmos.GraphingCalculator(el, {expressions: false, settingsMenu: false, xAxisLabel: "Matches", yAxisLabel: name, zoomButtons: false, lockViewport: false, })

    function numArrToStrArr(numArr) {
        let strArr = []
        for (let n of numArr) strArr.push(n.toString())
        return strArr
    }

    let minY = 0
    let maxY = 0
    let maxX = 0
    for (let team of data)
        if (graphSettings.x === "relative") {
            let teamKeys = Object.keys(team)
            for (let x in teamKeys) {
                if (team[teamKeys[x]] > maxY) maxY = team[teamKeys[x]]
                if (parseFloat(x) > maxX) maxX = x
                if (team[teamKeys[x]] < minY) minY = team[teamKeys[x]]
            }
        } else
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
    expressions.push({
        latex: "T_{eamListX}=" + (maxX * 1.15)
    })
    expressions.push({
        latex: "T_{eamListY}=" + (1.2 * maxY - maxY * .05)
    })
    for (let i = 0; i < data.length; i++) {
        if (teams[i] === undefined) continue

        if (graphSettings.x === "relative") {
            let xAxis = []
            for (let x in Object.keys(data[i])) xAxis.push(x)
            expressions.push({
                type:"table",
                columns: [
                    {latex: "x_{" + i + "}", values: numArrToStrArr(xAxis)},
                    {latex: "y_{" + i + "}", values: numArrToStrArr(Object.values(data[i])), hidden: true},
                ]
            })
        }
        else expressions.push({
            type:"table",
            columns: [
                {latex: "x_{" + i + "}", values: numArrToStrArr(Object.keys(data[i]))},
                {latex: "y_{" + i + "}", values: numArrToStrArr(Object.values(data[i])), hidden: true},
            ]
        })

        let teamName = ""
        if (usingTBA) teamName = team_data[teams[i]].Name

        expressions.push({latex: "y_{" + i + "}\\sim a_{" + i + "}x_{" + i + "} + b_{" + i + "}", hidden: true})

        if (graphSettings.bestfit)
            expressions.push({latex: "a_{" + i + "}" + "x + " + "b_{" + i + "}" + " = y", color: desmosColors[i], lineWidth: (projectorMode ? 12 : 6), lineOpacity: (projectorMode ? .8 : .6), label: teams[i] + " " + teamName})
        expressions.push({
            latex: "(T_{eamListX},T_{eamListY}-" + (i * .05 * maxY) + ")",
            label: teams[i] + " " + teamName.substring(0, 20) + (teamName.length >= 20 ? "..." : ""),
            showLabel: true,
            labelOrientation: Desmos.LabelOrientations.LEFT,
            color: desmosColors[i],
            labelSize: (projectorMode ? "1.5" : "1"),
            pointSize: (projectorMode ? 24 : 16),
            dragMode: Desmos.DragModes.NONE
        })
        expressions.push({
            latex: "\\left(T_{eamListX},T_{eamListY}-" + (i * .05 * maxY) + "\\right)",
            pointOpacity: 0,
            color: Desmos.Colors.BLACK,
            dragMode: Desmos.DragModes.XY
        })
        if (graphSettings.points)
            expressions.push({
                latex: "(x_{" + i + "}, y_{" + i + "})",
                color: desmosColors[i],
                label: teams[i] + " (${x_{" + i + "}},${y_{" + i + "}})",
                labelSize: (projectorMode ? "1.5" : "1"),
                pointSize: (projectorMode ? 22 : 11),
            })
    }

    calc.setExpressions(expressions);
    return el
}

document.querySelector("#top_show_hide_comment_names").onclick = function() {
    showNamesInTeamComments = !showNamesInTeamComments
    if (openedTeam !== undefined) openTeam(openedTeam)
    document.querySelector("#top_show_hide_comment_names").innerText = "Names in Comments: " + (showNamesInTeamComments ? "Shown" : "Hidden")
    saveGeneralSettings()
}

document.querySelector("#top_graph_x").addEventListener("click", () => {
    graphSettings.x = graphSettings.x === "relative" ? "absolute" : "relative"

    document.querySelector("#top_graph_x").innerText = "X Axis: " + (graphSettings.x === "relative" ? "Relative" : "Absolute")

    saveGeneralSettings()
})

document.querySelector("#top_graph_display").addEventListener("click", () => {
    if (graphSettings.points) {
        if (graphSettings.bestfit) {
            graphSettings.points = false
        } else {
            graphSettings.bestfit = true
        }
    } else {
        graphSettings.points = true
        graphSettings.bestfit = false
    }

    if (graphSettings.points) {
        if (graphSettings.bestfit) document.querySelector("#top_graph_display").innerText = "Graphs: Points & Lines"
        else document.querySelector("#top_graph_display").innerText = "Graphs: Only Points"
    } else document.querySelector("#top_graph_display").innerText = "Graphs: Only lines of best fit"

    saveGeneralSettings()
})

//#endregion

//#region Column Changing, Keyboard Controls
let controlPressed = false

function getColumns() {
    let validColumns = []
    for (let team in team_data)
        for (let col of Object.keys(team_data[team]))
            if (!hiddenColumns.includes(col) && !validColumns.includes(col)) validColumns.push(col)
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

    if (usingTBA && usingTBAMedia) {
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
    }

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
    saveColumns()
}
function toggleColumn(col) {
    if (columns.includes(col))
        columns.splice(columns.indexOf(col),1)
    else columns.push(col)
    setHeader()
    setColumnEditPanel()
    saveColumns()
}
function setColumnVisibility(index, to) {
    if (to) columns.push(index)
    else columns.splice(index, 1)
    setHeader()
    setColumnEditPanel()
}
function changeColumnOrder(col) {
    let current = columns.indexOf(col)
    let target = (Math.max(Math.min((parseInt(document.querySelector("#order_"+col.replaceAll(".","")).value)), columns.length-1), 0))
    let direction = Math.sign(target-current)
    while (columns.indexOf(col) !== target) {
        let i = columns.indexOf(col)
        columns[i] = columns[i+direction] + ""
        columns[i+direction] = col + ""
    }

    setHeader()
    setColumnEditPanel()
    saveColumns()
}

document.querySelector("#top_keyboard").onclick = function() {
    keyboardControls = !keyboardControls
    document.querySelector("#top_keyboard").innerText = "Keyboard Controls: " + (keyboardControls ? "Enabled" : "Disabled")
    saveGeneralSettings()
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
    if (key === "w") sortDirection = 1
    if (key === "s") sortDirection = -1
    if (key === " ") {
        sortDirection *= -1
        e.preventDefault()
    }
    if (key === "control") controlPressed = true
    if (key === "p") {
        projectorMode = !projectorMode
        setProjectorModeSheet()
    }
    setHeader()
    regenTable()
    setColumnEditPanel()
    saveColumns()
})
document.addEventListener("keyup", (e) => {
    if (!keyboardControls || brieflyDisableKeyboard) return
    let key = e.key.toLowerCase()
    if (key === "control") controlPressed = false
})
document.querySelector("#top_column_reset").addEventListener("click", () => {
    handleMapping()
})
//#endregion

//#region Sorting, Stars, Ignore
function sort(team) {
    let starOffset = ((starred.includes(team) && usingStar) ? -Math.pow(10,9) : 0)
    let ignoreOffset = ((ignored.includes(team) && usingIgnore) ? Math.pow(10,9) : 0)
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

        let index = isNaN(team_data[team][selectedSort]) || team_data[team][selectedSort] == undefined ? sortDirection * -10000 : team_data[team][selectedSort] /max
        if (sortDirection === 1) index = 1-index
        return ignoreOffset + starOffset + Math.floor(10000*index)
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

    document.querySelector("#select_" + to.replaceAll(/\W/g,"")).classList.add("highlighted")
    if (sortDirection === 1) document.querySelector("#select_" + to.replaceAll(/\W/g,"")).classList.add("top")
    if (sortDirection === -1) document.querySelector("#select_" + to.replaceAll(/\W/g,"")).classList.add("bottom")

    regenTable()
}
function star(i) {
    set_star(i, !starred.includes(i))
}
function star_toggle() {
    usingStar = !usingStar
    document.querySelector("#select_star").classList.toggle("filled")
    regenTable()
    saveTeams()
}
function set_star(team, to) {
    if (starred.includes(team)) starred.splice(starred.indexOf(team), 1)
    if (to) {
        starred.push(team)
        set_ignore(team, false)
    }
    regenTable()
    saveTeams()
}
function ignore(i) {
    set_ignore(i, !ignored.includes(i))
}
function ignore_toggle() {
    usingIgnore = !usingIgnore
    document.querySelector("#select_ignore").classList.toggle("filled")
    regenTable()
    saveTeams()
}
function set_ignore(team, to) {
    if (ignored.includes(team)) ignored.splice(ignored.indexOf(team), 1)
    if (to) {
        ignored.push(team)
        set_star(team, false)
    }
    regenTable()
    saveTeams()
}

document.querySelector("#top_show_hide_ignored").addEventListener("click", () => {
    showIgnoredTeams = !showIgnoredTeams
    document.querySelector("#top_show_hide_ignored").innerText = "Ignored Teams: " + (showIgnoredTeams ? "Shown" : "Hidden")
    regenTable()
    saveGeneralSettings()
})

//#endregion

//#region File and API loading functions (+ download, API Toggles)
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
        document.querySelector("#loading").className = "hidden"
        if (scouting_data !== undefined && mapping !== undefined) processData()
    } else {
        document.querySelector("#loading").className = ""
        document.querySelector("#loading").innerHTML = "Loading..."
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

document.querySelector("#top_toggle_use_allapi").addEventListener("click", () => {
    usingTBAMedia = true
    usingTBAMatches = true
    usingTBA = true
    usingDesmos = true
    setEnabledAPIS()
})
document.querySelector("#top_toggle_use_noneapi").addEventListener("click", () => {
    usingTBAMedia = false
    usingTBAMatches = false
    usingTBA = false
    usingDesmos = false
    setEnabledAPIS()
})
document.querySelector("#top_toggle_use_tbaevent").addEventListener("click", () => {
    usingTBA = !usingTBA
    setEnabledAPIS()
})
document.querySelector("#top_toggle_use_tbamatch").addEventListener("click", () => {
    usingTBAMatches = !usingTBAMatches
    setEnabledAPIS()
})
document.querySelector("#top_toggle_use_tbamedia").addEventListener("click", () => {
    usingTBAMedia = !usingTBAMedia
    setEnabledAPIS()
})
document.querySelector("#top_toggle_use_desmos").addEventListener("click", () => {
    usingDesmos = !usingDesmos
    setEnabledAPIS()
})

// Sets the localStorage enabled apis
function setEnabledAPIS() {
    window.localStorage.setItem(ENABLED_APIS, JSON.stringify({
        tbaevent: usingTBA,
        tbamatch: usingTBAMatches,
        tbamedia: usingTBAMedia,
        desmos: usingDesmos}))
    location.reload()
}
//#endregion

//#region Context menu (right click menu)
document.addEventListener("contextmenu", (e) => {
    let contextMenu = document.querySelector(".context-menu")

    if (contextMenu.contains(e.target) || controlPressed) { // If right clicking on context menu, open browser context menu
        closeContextMenu()
        controlPressed = false // Opening context menu means the keyup event never happens so this fixes that
        return
    }
    else {
        e.preventDefault()
    }

    contextMenu.style.left = e.pageX + "px"
    contextMenu.style.top = e.pageY + "px"
    contextMenu.style.zIndex = document.querySelector(".sticky-header").contains(e.target) ? "10000" : "999"
    contextMenu.removeAttribute("hidden")
    contextMenu.removeAttribute("empty")

    let options = document.querySelector(".context-menu-options")
    while (options.childElementCount > 0) options.children[0].remove()

    function optionEl(name, action) {
        let option = document.createElement("button")
        option.className = "context-option"
        option.innerText = name
        option.addEventListener("click", action)
        options.appendChild(option)
    }

    if (tableMode === "team")
        optionEl("Back to Table", closeTeam)

    let context = e.target.getAttribute("data-context")
    if (context === "star") {
        optionEl("Star All", () => {
            for (let x in team_data) set_star(x, true)
        })
        optionEl("Unstar All", () => {
            for (let x in team_data) set_star(x, false)
        })
        optionEl("Flip starred teams", () => {
            for (let x in team_data) star(x)
        })
        if (6 >= starred.length && starred.length > 1)
            optionEl("Compare Starred Teams", () => {
                openTeam(starred[0], starred.slice(1,starred.length))
            })
    }
    if (context === "ignore") {
        optionEl("Ignore All", () => {
            for (let x in team_data) set_ignore(x, true)
        })
        optionEl("Unignore All", () => {
            for (let x in team_data) set_ignore(x, false)
        })
        optionEl("Flip ignored teams", () => {
            for (let x in team_data) ignore(x)
        })
        if (showIgnoredTeams)
            optionEl("Hide ignored teams", () => {
                showIgnoredTeams = false
                regenTable()
            })
        else
            optionEl("Show ignored teams", () => {
                showIgnoredTeams = true
                regenTable()
            })
    }
    if (context === "icon-column") {
        optionEl("Hide icons", () => {
            showTeamIcons = false
            setHeader()
        })
    }
    if (context === "column") {
        let column = parseInt(e.target.getAttribute("data-context-index"))
        optionEl("Hide column", () => {
            setColumnVisibility(column, false)
        })
        if (column !== 0)
            optionEl("<- Move left", () => {
                let c = columns[column - 1]
                columns[column - 1] = columns[column]
                columns[column] = c
                setHeader()
                setColumnEditPanel()
            })
        if (column !== columns.length - 1)
            optionEl("Move right ->", () => {
                let c = columns[column + 1]
                columns[column + 1] = columns[column]
                columns[column] = c
                setHeader()
                setColumnEditPanel()
            })
    }
    if (context === null) {
        contextMenu.setAttribute("empty", "empty")
    }

    saveColumns()
})

document.addEventListener("click", closeContextMenu)
document.addEventListener("scroll", closeContextMenu)

function closeContextMenu() {
    document.querySelector(".context-menu").setAttribute("hidden", "hidden")
    document.querySelector(".context-menu").removeAttribute("empty")
}
//#endregion

//#region Save Settings, Load Config File
function saveGeneralSettings() {
    window.localStorage.setItem(SETTINGS, JSON.stringify({
        "keyboardControls": keyboardControls,
        "showNamesInTeamComments": showNamesInTeamComments,
        "showIgnoredTeams": showIgnoredTeams,
        "rounding": roundingDigits,
        "teamPageSettings": maintainedTeamPageSettings,
        "graphSettings": graphSettings
    }))
}
function saveTeams() {
    window.localStorage.setItem(TEAM_SAVES, JSON.stringify({
        "starred": starred,
        "ignored": ignored,
        "usingStar": usingStar,
        "usingIgnore": usingIgnore
    }))
}
function clearSavedTeams() {
    window.localStorage.setItem(TEAM_SAVES, JSON.stringify({
        "starred": [],
        "ignored": [],
        "usingStar": true,
        "usingIgnore": true,
    }))
}
function saveColumns() {
    window.localStorage.setItem(COLUMNS, JSON.stringify({
        "columns": columns,
        "hidden": hiddenColumns
    }))
}

function exportSettings() {
    let data = {
        general: {
            "keyboardControls": keyboardControls,
            "showNamesInTeamComments": showNamesInTeamComments,
            "showIgnoredTeams": showIgnoredTeams,
            "rounding": roundingDigits,
            "teamPageSettings": maintainedTeamPageSettings,
            "graphSettings": graphSettings
        },
        team: {
            "starred": starred,
            "ignored": ignored,
            "usingStar": usingStar,
            "usingIgnore": usingIgnore
        },
        columns: {
            "columns": columns,
            "hidden": hiddenColumns
        },
        mapping: mapping,
        scouting_data: scouting_data,
        year: year,
        apis: {
            tbaevent: usingTBA,
            tbamatch: usingTBAMatches,
            tbamedia: usingTBAMedia,
            desmos: usingDesmos,
        },
        pit: pit_data,
        tbakey: window.localStorage.getItem(TBA_KEY),
        event: window.localStorage.getItem(EVENT),
        theme: window.localStorage.getItem(THEME)
    }
    download("settings.orpheus", JSON.stringify(data))
}
function importSettings(settings) {
    console.log(settings)
    keyboardControls = settings.general.keyboardControls
    showNamesInTeamComments = settings.general.showNamesInTeamComments
    showIgnoredTeams = settings.general.showIgnoredTeams
    roundingDigits = settings.general.rounding
    rounding = Math.pow(10, roundingDigits)
    maintainedTeamPageSettings = settings.general.teamPageSettings
    graphSettings = settings.general.graphSettings
    starred = settings.team.starred
    ignored = settings.team.ignored
    usingStar = settings.team.usingStar
    usingIgnore = settings.team.usingIgnore
    columns = settings.columns.columns
    hiddenColumns = settings.columns.hidden
    saveColumns()
    saveGeneralSettings()
    saveTeams()
    mapping = settings.mapping
    window.localStorage.setItem(MAPPING, JSON.stringify(mapping))
    scouting_data = settings.scouting_data
    window.localStorage.setItem(SCOUTING_DATA, JSON.stringify(scouting_data))
    pit_data = settings.pit
    window.localStorage.setItem(PIT, JSON.stringify(pit_data))
    window.localStorage.setItem(YEAR, settings.year)
    window.localStorage.setItem(EVENT, settings.event)
    window.localStorage.setItem(TBA_KEY, settings.tbakey)
    usingTBA = settings.apis.tbaevent
    usingTBAMatches = settings.apis.tbamatch
    usingTBAMedia = settings.apis.tbamedia
    usingDesmos = settings.apis.desmos
    setEnabledAPIS()
    changeThemeTo(settings.theme)
    window.location.reload()
}

document.querySelector("#top_export_settings").addEventListener("click", exportSettings)
document.querySelector("#top_import_settings").addEventListener("click", () => {
    loadFile(["orpheus"], (a) => {
        let data = JSON.parse(a)
        importSettings(data)
    })
})

//#endregion

//#region Init

// Year
year = window.localStorage.getItem(YEAR)
if (year === null || year < 1992) {
    window.localStorage.setItem(YEAR, new Date().getFullYear().toString())
    window.location.reload()
}
document.querySelector("#top_year").innerText = year

// General Settings Setup
if (window.localStorage.getItem(SETTINGS) === null) {
    window.localStorage.setItem(SETTINGS, JSON.stringify({
        "keyboardControls": true,
        "showNamesInTeamComments": true,
        "showIgnoredTeams": true,
        "rounding": 3,
        "teamPageSettings": {
            "teamInfoWidth": 450,
            "graphHeight": 500,
            "showMatches": true,
        },
        "graphSettings": {
            x: "relative", // relative or absolute
            points: true,
            bestfit: true,
        }
    }))
}
let generalSettings = JSON.parse(window.localStorage.getItem(SETTINGS))
keyboardControls = generalSettings.keyboardControls
document.querySelector("#top_keyboard").innerText = "Keyboard Controls: " + (keyboardControls ? "Enabled" : "Disabled")
showNamesInTeamComments = generalSettings.showNamesInTeamComments
document.querySelector("#top_show_hide_comment_names").innerText = "Names in Comments: " + (showNamesInTeamComments ? "Shown" : "Hidden")
showIgnoredTeams = generalSettings.showIgnoredTeams
document.querySelector("#top_show_hide_ignored").innerText = "Ignored Teams: " + (showIgnoredTeams ? "Shown" : "Hidden")
roundingDigits = generalSettings.rounding
rounding = Math.pow(10, roundingDigits)
setRoundingEl()

maintainedTeamPageSettings = generalSettings.teamPageSettings

graphSettings = generalSettings.graphSettings
document.querySelector("#top_graph_x").innerText = "X Axis: " + (graphSettings.x === "relative" ? "Relative" : "Absolute")
if (graphSettings.points) {
    if (graphSettings.bestfit) document.querySelector("#top_graph_display").innerText = "Graphs: Points & Lines"
    else document.querySelector("#top_graph_display").innerText = "Graphs: Only Points"
} else document.querySelector("#top_graph_display").innerText = "Graphs: Only lines of best fit"

// Stars and Ignore setup
if (window.localStorage.getItem(TEAM_SAVES) === null) clearSavedTeams()
let teamSaves = JSON.parse(window.localStorage.getItem(TEAM_SAVES))
starred = teamSaves.starred
ignored = teamSaves.ignored
usingStar = teamSaves.usingStar
usingIgnore = teamSaves.usingIgnore

// Loading saved mappings or data
scouting_data = window.localStorage.getItem(SCOUTING_DATA)
scouting_data = scouting_data == null ? undefined : JSON.parse(scouting_data)
document.querySelector("#top_data_download").disabled = scouting_data === undefined
pit_data = window.localStorage.getItem(PIT)
pit_data = pit_data == null ? undefined : JSON.parse(pit_data)
document.querySelector("#top_pit_download").disabled = pit_data === undefined
mapping = window.localStorage.getItem(MAPPING)
mapping = mapping == null ? undefined : JSON.parse(mapping)
document.querySelector("#top_mapping_download").disabled = mapping === undefined

// Loading saved columns
if (window.localStorage.getItem(COLUMNS) !== null) {
    let columnData = JSON.parse(window.localStorage.getItem(COLUMNS))
    columns = columnData.columns
    hiddenColumns = columnData.hidden
}

setHeader()
updateTheme()
document.querySelector("#projector-styles").removeAttribute("disabled")
setProjectorModeSheet()

document.querySelector("#foot_clearLocalStorage").onclick = function() {
    let tmp = []
    LOCAL_STORAGE_KEYS.forEach((i) => tmp.push(i.replace("scouting_4915_", "")))
    if (confirm("This will clear the following: " + tmp)) {
        for (let i of LOCAL_STORAGE_KEYS) window.localStorage.removeItem(i)
        window.location.reload()
    }
}

// Version and Title
document.querySelector("title").innerText = toolName
document.querySelector("#title").innerText = toolName
document.querySelector("#version_slot").innerText = toolName + " v"+version

// Apis
let apis = window.localStorage.getItem(ENABLED_APIS)
if (apis === null) {
    window.localStorage.setItem(ENABLED_APIS, JSON.stringify({tbaevent: true, tbamatch: true, tbamedia: true, desmos: true}))
    apis = {tbaevent: true, tbamatch: true, tbamedia: true, desmos: true,}
} else apis = JSON.parse(apis)

usingTBA = apis.tbaevent
document.querySelector("#top_toggle_use_tbaevent").innerText = "TBA API: " + (usingTBA ? "Enabled" : "Disabled")
if (usingTBA) {
    defaultColumns.push("Name")
}

usingTBAMatches = apis.tbamatch
document.querySelector("#top_toggle_use_tbamatch").innerText = "TBA API (Matches): " + (usingTBAMatches ? "Enabled" : "Disabled")
if (!usingTBA) {
    usingTBAMatches = false
    document.querySelector("#top_toggle_use_tbamatch").innerText = "TBA API (Media): Disabled"
    document.querySelector("#top_toggle_use_tbamatch").disabled = true
}
if (usingTBAMatches) {
    defaultColumns.push("Winrate")
}

usingTBAMedia = apis.tbamedia
document.querySelector("#top_toggle_use_tbamedia").innerText = "TBA API (Media): " + (usingTBAMedia ? "Enabled" : "Disabled")
if (!usingTBA) {
    usingTBAMedia = false
    document.querySelector("#top_toggle_use_tbamedia").innerText = "TBA API (Media): Disabled"
    document.querySelector("#top_toggle_use_tbamedia").disabled = true
}
showTeamIcons = (usingTBA && usingTBAMedia)

usingDesmos = apis.desmos
document.querySelector("#top_toggle_use_desmos").innerText = "Desmos API: " + (usingDesmos ? "Enabled" : "Disabled")
if (usingDesmos) {
    let desmosScript = document.createElement("script")
    document.head.appendChild(desmosScript)
    desmosScript.src = desmosScriptSrc
    loading++
    checkLoading()
    desmosScript.addEventListener("load", () => {
        loading--
        checkLoading()
        desmosColors = [Desmos.Colors.RED, Desmos.Colors.BLUE, Desmos.Colors.GREEN, Desmos.Colors.PURPLE, Desmos.Colors.ORANGE, Desmos.Colors.BLACK]
    })
}
// TODO: if desmos is disabled then disable the graph settings options

// Welcome Checklist
doingInitialSetup = false
function welcomeChecklistItem(name, checked) {
    let el = document.createElement("div")
    el.className = "welcome-item"
    let icon = document.createElement("span")
    icon.className = "material-symbols-outlined"
    icon.innerText = (checked ? "check_circle" : "radio_button_unchecked")
    el.appendChild(icon)
    let text = document.createElement("div")
    text.innerText = name
    el.appendChild(text)
    document.querySelector(".welcome").appendChild(el)

    if (!checked) doingInitialSetup = true
}
document.querySelector("#setup-checklist-title").innerText = toolName + " Setup Checklist"
welcomeChecklistItem("The Blue Alliance API Key", !usingTBA || window.localStorage.getItem(TBA_KEY) !== null)
welcomeChecklistItem("Select an Event", !usingTBA || window.localStorage.getItem(EVENT) !== null)
welcomeChecklistItem("Upload your scouting data", scouting_data !== undefined)
welcomeChecklistItem("Upload a mapping for your data", mapping !== undefined)
if (!doingInitialSetup)
    document.querySelector(".welcome").remove()

// Final Prep
if (window.localStorage.getItem(EVENT) !== null)
    document.querySelector("#top_load_event").innerText = window.localStorage.getItem(EVENT).toUpperCase()
if (usingTBA) {
    loading++
    checkLoading()
    loading--
}
loadEvent()

//#endregion
