# FRC Scouting Tool

This tool isn't intended to help with the collection of data,
but rather to help teams look at the data they've collected with the help of other tools.

### 1. APIs

#### 1.1 What is an API?
This tool makes use of a few APIs, which are basically websites that store a collection of data that other websites or apps, like this one, can access at any time.

| API | A brief explanation | Features that depend on this API |
| ---- | ---- | ---- |
| The Blue Alliance | TBA is a collection of a bunch of data on the First Robotics Competition (FRC). This is used for data on each team, and the event as a whole. | Team names and information other than icon and number, Event-specific information,  |
| The Blue Alliance (Matches) | This is part of the above API, but can be disabled even while using the main API. It requires that the above is enabled for this one to be enabled. This is used for data on individual matches that each team is a part of. | Team winrate calculations, as well as matches, what alliance a team was on, who they were with, and who they were against. |
| Desmos | Desmos is an amazing online graphing calculator with a plethora of features. | Graphs of team data |
| FRC Colors | FRC Colors has information on most team's primary and secondary colors, but they also host a copy of each of those teams' icons, which is what this tool uses FRC Colors for. | Team icons |

#### 1.2 The Blue Alliance API Key

You'll need to provide your own API key for The Blue Alliance, which can be obtained by following the following steps:
1. Go to https://www.thebluealliance.com/account and create an account or sign in
2. Scroll down to **Read  API Keys**
3. Type anything in the field for **Description**. I suggest something like "Scouting Analysis", but its up to you.
4. Press **+ Add New Key**
5. The page will reload, and you need to scroll back down to **Read API Keys**, where you can now copy the odd string of text and numbers underneath **X-TBA-Auth-Key**

Now that you have your API key, return to the FRC Scouting Tool, press the **APIs** button at the top of the screen, and then **Set TBA API Key**.
You will be prompted for your API Key. Paste it in the pop-up, and then press enter or the confirmation button. This will be automatically saved in your browser for future sessions.

If you are prompted with the lack of a TBA API key, follow the previous instructions to (if needed) obtain one, and re-paste it into the tool.

#### 1.3 Enabling and Disabling APIs
If the FRC Scouting tool encounters a strange error, you may want to enable or disable an API. 
They can be toggled on or off in the **APIs** menu at the top of the screen.

### 2. Event and Year

Event and Year settings will not apply if TBA API is disabled.

####2.1 Event
You can set what event you are looking at by finding whatever your event code is, for example:

WABON - PNW District Bonney Lake Event,

and typing that event code into the **Set Event** button located inside of the **Event** menu. 
If you have previously entered an event, the **Set Event** button will instead show the event code for that previous event.

####2.2 Year
When you first load the FRC Scouting Tool, the year will be assumed based on the current year, 
but you can change the year by going into the **Event** menu and clicking on the year button, which will display whatever the currently selected year is.

### 3. Data and Data Mappings

