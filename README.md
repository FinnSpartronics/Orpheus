# Scouting Tool
 A WIP tool for scouting FRC events


### Mapping Format
```json
{
  "team": "",
  "notes": "",
  "scouter": "",
  "mapping_version": 1,
  "averages": {},
  "calculated": {},
  "calculated_averages": {}
}
```
Example (from Crescendo Season):
```json
{
  "team": "Team Number",
  "notes": "Other thoughts/Summary",
  "scouter": "Your Name",
  "mapping_version": 1,
  "averages": {
    "Rating": "Overall subjective ranking",
    "Bot Rating": "Bot rating",
    "Drive Rating": "Drive team rating"
  },
  "calculated": {
    "Total Amp Notes": ["Auto Amp Notes Scored", "+", "Amp notes scored"]
  },
  "calculated_averages": {
    "Av. Amp Notes": ["Auto Amp Notes Scored", "+", "Amp notes scored"],
    "Winrate": ["Result", "=", "Win"],
    "Av. Points": [[[["Auto Speaker Notes Scored", "*", 5], "+", ["Non amplified speaker notes scored", "*", 2]], "+", [["Auto Amp Notes Scored", "*", 2], "+", "Amp notes scored"]], "+", ["Amplified speaker notes scored", "*", 5]]
  }
}
```
First, put the title of the column, then the actual value (useful for renaming). 
There are three types of data:
- Averages - where every value is added and then divided by the total
- Calculated - where every calculated value is added to a total
- Calculated Averages - where every calculated value is added to a total and then divided by the total

Calculations format:
```json
    "Column Title": [a, operation, b]
```
Operations include the following:
Addition, subtraction, multiplication, division, and the equals sign. If the condition is true, it will be evaluated as 1, but if false it will be evaluated as 0.

You can nest the calculations inside of calculations, for example:
```json
    "Column Title": [[a, operation b], operation2, c]
```

Instead of putting a calculation, you may just put in a value, for example:
```json
    "Column Title": a
```

Apologies for the poor explanation