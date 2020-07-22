# Most Played for Spotify

**Available at [Most Played for Spotify](https://mostplayed.kushagr.net)**

Shows a listener their top 50 tracks and artists over 3 time periods.

![Screenshot](https://i.imgur.com/1yFXRhh.png)

### Allows a user to export their top tracks from a given period to a playlist

![Screenshot](https://i.imgur.com/9syCfp3.png)

### Technial Details

Uses the spotify API to fetch a user's top tracks and artists. Written entirely in client-side Javascript (Vue.js). There is no database for this app (other than Spotify itself). The implicit-grant auth flow is used.

No external dependencies are required to run a version of the website locally, however the Spotify API token used is tied to my dashboard account.
