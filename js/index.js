const CLIENT_ID = '83f31bdab709444fa604b90eb05addd6';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const BASEURL = 'https://api.spotify.com/v1';

Vue.use(VueLazyload);

var app = new Vue({
    el: '#app',
    data: {
        access_token: null,
        axios: null,
        loaded: false,
        userinfo: {},
        top: {
            tracks: {
                short: {},
                medium: {},
                long: {}
            },
            artists: {
                short: {},
                medium: {},
                long: {}
            }
        },
        state: {
            type: 'tracks',
            term: 'short'
        },
        types: {
            tracks: 'Tracks',
            artists: 'Artists'
        },
        terms: {
            short: {
                name: 'Short Term (~4 weeks)',
                description: "the past 4 weeks",
            },
            medium: {
                name: 'Medium Term (~6 months)',
                description: "the past 6 months",
            },
            long: {
                name: 'Long Term (All time)',
                description: "all time",
            }
        },
        playlist_generation: {
            public: true,
            in_progress: false,
            url: '',
            error: '',
        },
    },
    computed: {
        user_image: function() {
            return (this.userinfo.images 
                    && this.userinfo.images[0] 
                    && this.userinfo.images[0].url)
                ? this.userinfo.images[0].url
                : null;
        },
        country_flag: function() {
            /* https://medium.com/binary-passion/lets-turn-an-iso-country-code-into-a-unicode-emoji-shall-we-870c16e05aad */
            return (this.userinfo.country)
                ? String(this.userinfo.country).toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0)+127397))
                : '';
        },
        locale_date: function() {
            let dateArray = new Date().toJSON().slice(0,10).split('-').reverse();
            if (navigator.language.toLowerCase() == "en-us") {
                [dateArray[0], dateArray[1]] = [dateArray[1], dateArray[0]];
            }
            return dateArray.join('/');
        },
        playlist_name: function() {
            return `Most Played: ${ this.terms[this.state.term].name }, ${ this.locale_date }`
        },
        playlist_description: function() {
            return `Your most played tracks from ${ this.terms[this.state.term].description }.`
        }
    },
    watch: {
        'state.term': function() {
            this.playlist_generation.url = this.playlist_generation.error = '';
        },
        access_token: function() {
            if (!access_token) { return }
            this.axios = axios.create({
                baseURL: BASEURL,
                timeout: 3600,
                headers: { 'Authorization': 'Bearer ' + access_token }
            });
            this.axios.get('/me').then((response) => { this.userinfo = response.data; });
            for (let type of Object.keys(this.top)) {
                for (let term of Object.keys(this.terms)) {
                    this.axios.get(`/me/top/${type}/?limit=50&time_range=${term}_term`)
                    .then((response) => {
                        this.top[type][term] = response.data;
                    });
                }
            }
            this.loaded = true;
        }
    },
    methods: {
        authorise: function() {
            var state = generateRandomString(16);
            localStorage.setItem(stateKey, state);
            var scope = 'user-read-private user-top-read playlist-modify-private playlist-modify-public';
            var url = 'https://accounts.spotify.com/authorize';
            url += '?response_type=token';
            url += '&client_id=' + encodeURIComponent(CLIENT_ID);
            url += '&scope=' + encodeURIComponent(scope);
            url += '&redirect_uri=' + encodeURIComponent(REDIRECT_URI);
            url += '&state=' + encodeURIComponent(state);
            // Redirect to Spotify login page.
            window.location = url;
        },
        second_last_image: function(images) {
            let index = (images.length >= 2)
                    ? images.length - 2
                    : images.length - 1;
            if (index >= 0) {
                return images[index].url
            }
            return '';
        },
        spotify_url: function(obj) {
            return obj.external_urls.spotify ? obj.external_urls.spotify : '';
        },
        ms_to_duration: function(ms) {
            const seconds = Math.round(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            return `${ minutes }:${ String(seconds % 60).padStart(2, '0') }`
        },
        playlist_preview_images: function(tracks) {
            let imgArray = [];
            for (let track of tracks) {
                if (imgArray.length >= 4) break;
                let img = this.second_last_image(track.album.images).toLowerCase();
                if (img && !imgArray.includes(img)) {
                    imgArray.push(img);
                }
            }
            return imgArray;
        },
        playlist_runtime: function(tracks) {
            const sum_ms = tracks.map(x => x.duration_ms).reduce((a,b) => a + b, 0);
            const hours = Math.floor(sum_ms / 3600000);
            const minutes = Math.round(sum_ms / 60000) % 60;
            return `${hours} hr ${minutes} min`
        },
        create_playlist: function() {
            if (!this.axios) { return }
            this.playlist_generation.in_progress = true;
            this.playlist_generation.error = '';
            this.axios.post(`/users/${this.userinfo.id}/playlists`, {
                name: this.playlist_name,
                description: `${this.playlist_description} Made at https://mostplayed.kushagr.net/`,
                public: this.playlist_generation.public,
            })
            .then((response) => {
                console.log(response);
                if (!(response.status == 200 || response.status == 201)) {
                    this.playlist_generation.error = `Error code ${response.status}. Please try again later.`
                }
                else {
                    const playlistResponse = response;
                    const id = response.data.id;
                    this.axios.post(`/playlists/${id}/tracks`, {
                        uris: this.top.tracks[this.state.term].items.map(x => x.uri)
                    }).then((response) => {
                        console.log(response);
                        this.playlist_generation.in_progress = false;
                        if (!(response.status == 200 || response.status == 201)) {
                            this.playlist_generation.error = `${response.status}`
                        }
                        else {
                            this.playlist_generation.url = playlistResponse.data.external_urls.spotify;
                        }
                    });
                }
            });
        }
    }
});

/**
 * Obtains parameters from the hash of the URL
 * @return Object
 */
function getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    history.replaceState("", document.title, window.location.pathname + window.location.search);
    return hashParams;
}

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
function generateRandomString(length) {
    var text = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
        text += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return text;
}

/* main(): authorise app on start. */
var stateKey = 'spotify_auth_state';
var params = getHashParams();
var access_token = params.access_token,
    state = params.state,
    storedState = localStorage.getItem(stateKey);

if (!access_token || state == null || state !== storedState) {
    app.authorise();
}
else {
    localStorage.removeItem(stateKey);
    if (access_token) { app.access_token = access_token }
}

