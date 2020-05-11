const CLIENT_ID = '83f31bdab709444fa604b90eb05addd6';
const REDIRECT_URI = (window.location.href.indexOf('localhost') >= 0)
                        ? 'http://localhost:8888/'
                        : 'https://kushagr.net/spotify-most-played/';
const BASEURL = 'https://api.spotify.com/v1';
const PLAYLIST_BUTTON_TEXT = 'Make playlist';

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
        types: {
            tracks: 'Top Tracks',
            artists: 'Top Artists'
        },
        terms: {
            short: 'Short Term (~4 weeks)',
            medium: 'Medium Term (~6 months)',
            long: 'Long Term (All time)'
        },
        state: {
            type: 'tracks',
            term: 'short'
        },
        playlist_btn: {
            original: PLAYLIST_BUTTON_TEXT,
            during: 'Working...',
            done: 'Done!',
            current: PLAYLIST_BUTTON_TEXT
        }
    },
    computed: {
        user_image: function() {
            if (this.userinfo.images && this.userinfo.images[0] && this.userinfo.images[0].url) {
                return this.userinfo.images[0].url;
            }
            return null;
        },
        country_flag: function() {
            return (this.userinfo.country) ? countryCodeFlag(this.userinfo.country) : '';
        }
    },
    watch: {
        'state.type': function() {
            this.playlist_btn.current = this.playlist_btn.original;
        },
        'state.term': function() {
            this.playlist_btn.current = this.playlist_btn.original;
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
            var scope = 'user-read-private user-top-read';
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
        create_playlist: function() {
            if (!this.axios) { return }
            this.playlist_btn.current = this.playlist_btn.during;
            let term_description = (this.state.term === 'short') ? "over the past 4 weeks"
                            : (this.state.term === 'medium') ? "over the past 6 months"
                            : "from all time";
            this.axios.post(`/users/${this.userinfo.id}/playlists`, {
                name: `Most Played: ${this.terms[this.state.term]}, ${new Date().toJSON().slice(0,10).split('-').reverse().join('/')}`,
                description: `Your 50 most played tracks ${term_description}. Made at kushagr.net/spotify-most-played`
            })
            .then((response) => {
                console.log(response);
                let id = response.data.id;
                // console.log(id)
                this.axios.post(`/playlists/${id}/tracks`, {
                    uris: this.top.tracks[this.state.term].items.map(x => x.uri)
                }).then((response) => {
                    this.playlist_btn.current = this.playlist_btn.done;
                });
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

/*
    Converts ISO 3166-1 alpha-2 country code to emoji flag.
    https://medium.com/binary-passion/lets-turn-an-iso-country-code-into-a-unicode-emoji-shall-we-870c16e05aad
*/
const countryCodeFlag = cc => String(cc).toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0)+127397));

var stateKey = 'spotify_auth_state';

var params = getHashParams();

var access_token = params.access_token,
    state = params.state,
    storedState = localStorage.getItem(stateKey);

if (!access_token || state == null || state !== storedState) {
    // If there was an error, reauthorise.
    app.authorise();
}
else {
    localStorage.removeItem(stateKey);
    if (access_token) { app.access_token = access_token }
}

