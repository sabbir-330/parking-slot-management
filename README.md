# Parking Lot Management System (web demo)

A browser version of the C project `SDLC_main.c`. It follows the same rules:

- 50 slots, the first free slot is assigned (A-1, A-2, ...)
- Tk 100 per started hour, minimum 1 hour, same-day parking only
- Peak hours 08:00-10:00 and 17:00-20:00
- Admin login `admin` / `1234`: parked list, search, update vehicle ID, report

## Run
Open `index.html`. No build step.

## Files
```
demo/
  index.html
  css/   fonts.css, theme.css (colours), style.css
  js/    parking.js (logic), app.js (UI)
  assets/
```
