// https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200
// https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />

//https://api.frc-colors.com/internal/team/4915/avatar.png for logos

const TBA_KEY  = "scouting_4915_apikey"
const EVENT  = "scouting_4915_event"
const YEAR = 2024
const MISSING_LOGO = "https://frc-cdn.firstinspires.org/eventweb_frc/ProgramLogos/FIRSTicon_RGB_withTM.png"
const THEME = "scouting_4915_theme"

let event_data
let team_data = {}

let theme = 0

let starred = [4915]
let usingStar = true
let sorting = 0

let loading = 0

document.querySelector("#teamsearch").onkeydown = search_keydown
document.querySelector("#teamsearch_btn").onclick = search
function search_keydown(e) {
    if (/^\D$/.test(e.key)) e.preventDefault();
    if (e.key === "Enter") search()
}
function search() {
    console.log("Searching for " + document.querySelector("#teamsearch").value)
}

document.querySelector("#top_setapi").onclick = function() {
    let x = prompt("What is your TBA API key? 'get' to get it, leave blank to skip")
    if (x === "get") alert(window.localStorage.getItem(TBA_KEY))
    else if (x !== "") {
        window.localStorage.setItem(TBA_KEY, x);
        window.location.reload()
    }
}
document.querySelector("#top_load_event").onclick = function() {
    let x = prompt("event")
    if (x === "get") alert(window.localStorage.getItem(EVENT))
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
    let fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = ".csv"
    fileInput.addEventListener("change", (e) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            csvToJson(e.target.result)
        }
        reader.readAsText(e.target.files[0]);

        regenList()
    })
    fileInput.click()
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
    clearList()
    load("event/" + YEAR + window.localStorage.getItem(EVENT) + "/teams", function(data) {
        event_data = data
        for (let team of data) {
            create(team.team_number)
        }
        loading--
        checkLoading()
    })
}

function create(team) {
    let a = document.createElement('div')
    a.innerHTML = `
      <div class="row" id="${team}">
        <span class="material-symbols-outlined ar" id="star${team}" onclick="star(${team})">
          star
        </span>
        
        <img src="https://api.frc-colors.com/internal/team/${team}/avatar.png" alt="Icon" class="icon" id="icon-${team}">
        <div class="data" id="name-${team}">${team}</div>
        
        <div class="data"> </div>
        <div class="data"> </div>
        <div class="data" id="win${team}"> % </div>
        
      </div>
    `

    team_data[team] = {}

    loading++
    load("team/frc"+team, function(data) {
        document.querySelector("#icon-"+team).title = data.nickname
        document.querySelector("#name-"+team).title = data.nickname

        team_data[team]["overall"] = data

        loading--
        checkLoading()
    })

    loading++
    load("team/frc"+team+"/event/" + YEAR + window.localStorage.getItem(EVENT) + "/matches", function(data) {
        let wins = 0
        let losses = 0
        for (let match of data) {
            let winning = match.winning_alliance
            let alliance = match.alliances.blue.team_keys.includes("frc"+team) ? "blue" : "red"
            if (winning === alliance) wins++
            else losses++
        }
        document.querySelector("#win"+team).innerHTML = (Math.round(((wins/(wins+losses))*1000))/10) + "%"

        team_data[team]["matches"] = data

        loading--
        checkLoading()
    })

    let img = new Image()
    img.onerror = () => { document.querySelector("#icon-"+team).src = MISSING_LOGO }
    img.src = `https://api.frc-colors.com/internal/team/${team}/avatar.png`

    let elem = a.children[0]

    document.querySelector(".table").append(elem)

    sort(team, elem)
}
function element(team) {
    let a = document.createElement('div')
    a.innerHTML = `
  <div class="row" id="${team}">
    <span class="material-symbols-outlined ar" id="star${team}" onclick="star(${team})">
      star
    </span>
    
    <img src="https://api.frc-colors.com/internal/team/${team}/avatar.png" alt="Icon" class="icon" id="icon-${team}">
    <div class="data" id="name-${team}">${team}</div>
    
    <div class="data"> </div>
    <div class="data"> </div>
    <div class="data" id="win${team}"> % </div>
    <div class="data"> ${team_data[team]["points"]} </div>
    
  </div>
  `

    let elem = a.children[0]

    elem.querySelector("#icon-"+team).title = team_data[team].overall.nickname
    elem.querySelector("#name-"+team).title = team_data[team].overall.nickname

    let wins = 0
    let losses = 0

    for (match of team_data[team]["matches"]) {
        let winning = match.winning_alliance
        let alliance = match.alliances.blue.team_keys.includes("frc"+team) ? "blue" : "red"
        if (winning === alliance) wins++
        else losses++
    }
    elem.querySelector("#win"+team).innerHTML = (Math.round(((wins/(wins+losses))*1000))/10) + "%"

    let img = new Image()
    img.onerror = () => { elem.querySelector("#icon-"+team).src = MISSING_LOGO }
    img.src = `https://api.frc-colors.com/internal/team/${team}/avatar.png`

    document.querySelector(".table").append(elem)

    sort(team,elem)
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

function clearList() {
    while (document.querySelector(".table").children.length > 0) {
        document.querySelector(".table").children[0].remove()
    }
}
function regenList() {
    clearList()
    for (team of Object.keys(team_data)) element(team)
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

/* Default is 0
0 - Team # Low to High
1 - Team # High to Low
2 - Team Name A-Z
3 - Team Name Z-A
4 - Win Rate High to Low
5 - Win Rate Low to High
*/
function sort(team, elem) {
    let order = Math.floor(team/1000)
    elem.style.order = order;
    if (starred.includes(parseInt(team)) && usingStar) {
        elem.style.order = -100+order;
        elem.children[0].classList.add("filled")
    } else {
        elem.style.order = sort_(team)
        if (sort_(team) < 0) console.log(team)
    }
}
function sort_(team) {
    switch(sorting) {
        case 0: return team
        case 1: return 1000000-team
        case 4: return 1000+Math.floor(100-(100*winRate(team)))
        case 5: return 1000+Math.floor((100*winRate(team)))
    }
}

function set_sort(to) {
    document.getElementsByClassName("highlighted")[0].classList.remove("highlighted")
    if (to === "team-number") set_sort_("#select_team_number", 0, 1)
    else if (to === "win-rate") set_sort_("#select_win_rate", 4, 5)
    regenList()
}

function set_sort_(id, top, bottom) {
    if (sorting === top) sorting = bottom
    else sorting = top
    document.querySelector(id).classList.add("highlighted")
    document.querySelector(id).classList.remove("bottom")
    document.querySelector(id).classList.remove("top")
    if (sorting === top) document.querySelector(id).classList.add("top")
    else document.querySelector(id).classList.add("bottom")
}

function winRate(team) {
    let wins = 0
    let losses = 0

    for (match of team_data[team]["matches"]) {
        let winning = match.winning_alliance
        let alliance = match.alliances.blue.team_keys.includes("frc"+team) ? "blue" : "red"
        if (winning === alliance) wins++
        else losses++
    }
    return wins/losses
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
    console.log(str)
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
