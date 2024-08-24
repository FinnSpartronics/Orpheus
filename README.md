# FRC Scouting Tool

This tool isn't intended to help with the collection of data,
but rather to help teams look at the data they've collected with the help of other tools.

## 1. APIs

### 1.1 What is an API?
This tool makes use of a few APIs, which are basically websites that store a collection of data that other websites or apps, like this one, can access at any time.

| API | A brief explanation | Features that depend on this API |
| ---- | ---- | ---- |
| The Blue Alliance | TBA is a collection of a bunch of data on the First Robotics Competition (FRC). This is used for data on each team, and the event as a whole. | Team names and information other than icon and number, Event-specific information,  |
| The Blue Alliance (Matches) | This is part of the above API, but can be disabled even while using the main API. It requires that the above is enabled for this one to be enabled. This is used for data on individual matches that each team is a part of. | Team winrate calculations, as well as matches, what alliance a team was on, who they were with, and who they were against. |
| Desmos | Desmos is an amazing online graphing calculator with a plethora of features. | Graphs of team data |
| FRC Colors | FRC Colors has information on most team's primary and secondary colors, but they also host a copy of each of those teams' icons, which is what this tool uses FRC Colors for. | Team icons |

### 1.2 The Blue Alliance API Key

You'll need to provide your own API key for The Blue Alliance, which can be obtained by following the following steps:
1. Go to https://www.thebluealliance.com/account and create an account or sign in
2. Scroll down to **Read  API Keys**
3. Type anything in the field for **Description**. I suggest something like "Scouting Analysis", but its up to you.
4. Press **+ Add New Key**
5. The page will reload, and you need to scroll back down to **Read API Keys**, where you can now copy the odd string of text and numbers underneath **X-TBA-Auth-Key**

Now that you have your API key, return to the FRC Scouting Tool, press the **APIs** button at the top of the screen, and then **Set TBA API Key**.
You will be prompted for your API Key. Paste it in the pop-up, and then press enter or the confirmation button. This will be automatically saved in your browser for future sessions.

If you are prompted with the lack of a TBA API key, follow the previous instructions to (if needed) obtain one, and re-paste it into the tool.

### 1.3 Enabling and Disabling APIs
If the FRC Scouting tool encounters a strange error, you may want to enable or disable an API. 
They can be toggled on or off in the **APIs** menu at the top of the screen.

## 2. Event and Year

Event and Year settings will not apply if TBA API is disabled.

###2.1 Event
You can set what event you are looking at by finding whatever your event code is, for example:

WABON - PNW District Bonney Lake Event,

and typing that event code into the **Set Event** button located inside of the **Event** menu. 
If you have previously entered an event, the **Set Event** button will instead show the event code for that previous event.

###2.2 Year
When you first load the FRC Scouting Tool, the year will be assumed based on the current year, 
but you can change the year by going into the **Event** menu and clicking on the year button, which will display whatever the currently selected year is.

## 3. Data and Data Mappings

You've now reached the part that this whole tool is made for, the data.

I recognize that all teams have their unique scouting data tools, formats, and everyone looks for different things in what they want.
This tool should fit most team's needs, but if you want more features, please suggest them in a Github Issue.

### 3.1 Data
Accepted formats for scouting data are in the form of .csv files, and in the form of .json files.

Note: .CSV files will be automatically converted into JSON, so if you later choose to download your data from the tool it may be in a different format from what you originally had.

Data needs to be in the form of individual scouting submissions, for example:
```json
[
  {
    "Team": 4915,
    "Match Number": 52,
    "Notes/Comments": "This is an example note/comment",
    "Your Name": "John Doe",
    "Points scored": 17
  }
]
```
or, in CSV format:
```csv
"Team","Match Number","Notes/Comments","Your Name","Points scored"
"4915","52","This is an example note/comment","John Doe","17"
```

JSON data must not have any further objects in the fields, for example, you cannot do something like:
```json
"Points scored": {
  "Speaker Points": 5,
  "Amp Points": 2
}
```

Field names can be whatever you would like them to be, as will be explained in the next section on data mappings,
but there must be the following four bits of data in some form or another:
- Team 
  - Their team number, for example, 4915
  - Their team number proceeded by frc, for example, frc4915,
  - Their team name, for example, Spartronics (Not suggested)
- Match number
- Notes/Comments
  - Should be a string containing comments on that individual team's performance during that match.
- Scouter's Name
  - Should be a string with the name of whoever scouted that team during that match.
  - Likely will not be a requirement in future versions
    
To put your data into the tool, open the **File** menu at the top of the screen, and press **Import Data**. 
You will be prompted for the file that contains your scouting data. It will automatically be saved for future sessions.

###3.2 Data Mappings
So, the tool has your data, but it doesn't really know what to do with it. That's where data mappings come in. 
Data mappings tell the tool what to do with your data.

This is the most complicated part of the tool, but once it is set up for a season it likely will not need to be changed.

####3.2.1 Data Mapping Format
Data mappings are stored in JSON files.

Here is an empty template for a data mapping:
```json
{
  "team": "",
  "match": {
    "number": ""
  },
  "notes": "",
  "scouter": "",
  "mapping_version": 1,
  "averages": {},
  "calculated": {},
  "calculated_averages": {},
  "graphs": {}
}
```

How this works is there is the field on the left, for example, "notes", and then whatever is on the right is the key for that bit of data in the scouting data.

For example, if your data looked like this:
```json
[
  {
    "Team": 4915,
    "Match Number": 52,
    "Notes/Comments": "This is an example note/comment",
    "Your Name": "John Doe",
    "Points scored": 17
  }
]
```
Your mapping would look like this:
```json
{
  "team": "Team",
  "match": {
    "number": "Match Number"
  },
  "notes": "Notes/Comments",
  "scouter": "Your Name",
  "mapping_version": 1,
  "averages": {},
  "calculated": {},
  "calculated_averages": {},
  "graphs": {}
}
```

####3.2.2 Team Format
"team" may be in either of two formats:
```json
{
  "team": {
    "key": "",
    "format": ""
  },
  "team": ""
}
```
The first one is preferred. In that case, you would put the key for where the team is in your scouting data in the "key" field.
Then, you would put one of the following three options in the "format" field.

| Format | When to use |
| ---- | ---- |
| # | When the team is represented by their team number in your scouting data, for example, 4915 |
| frc# | When the team is represented by their team number preceded by "frc" in your scouting data, for example, frc4915 |
| name | When the team is represented by their team name in your scouting data, for example, Spartronics. This option is not recommended due to the easy chance of typos and mismatches |

If you use the second format for "team", just put the key in that spot. The format will automatically be detected.

NOTE: If you use the name format for your scouting data, The Blue Alliance API is required, and the FRC Scouting Tool will not work when you turn TBA off.

####3.2.2 Custom Table Columns

```json
{
  "team": "Team",
  "match": {
    "number": "Match Number"
  },
  "notes": "Notes/Comments",
  "scouter": "Your Name",
  "mapping_version": 1,
  "averages": {},
  "calculated": {},
  "calculated_averages": {},
  "graphs": {}
}
```

