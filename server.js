const SpotifyWebApi = require("spotify-web-api-node");
const polka = require('polka');

const port = process.env.PORT || 3000;


var scopes = ['user-read-currently-playing'],
  redirectUri = 'http://localhost',
  state = 'now-playing';

// 1. Get Client ID and Client Secret by creating Spotify API App
// https://developer.spotify.com/dashboard/applications
// I'll put it on ENV, but you can just change it in code.

const spotifyApi = new SpotifyWebApi({
	redirectUri: redirectUri,
	clientId: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
});


// 2. Uncoment this section, get the link and and grant permission, 
// than take a look at the URL bar.
// console.log(spotifyApi.createAuthorizeURL(scopes, state));

// 3. Use the code that's returned as a query parameter to the redirect URI.
// It's one-time code! You need to refresh it in case of something went wrong
// by link from step 2
// Retrieve an access token and a refresh token with this part
// var code = '';
// spotifyApi.authorizationCodeGrant(code).then(
//   function(data) {
//     console.log('The token expires in ' + data.body['expires_in']);
//     console.log('The access token is ' + data.body['access_token']);
//     console.log('The refresh token is ' + data.body['refresh_token']);
//     // Set the access token on the API object to use it in later calls
//     spotifyApi.setAccessToken(data.body['access_token']);
//     spotifyApi.setRefreshToken(data.body['refresh_token']);
//     process.env.accessToken = data.body['access_token'];
//     process.env.refreshToken = data.body['refresh_token'];
//   },
//   function(err) {
//     console.log('Something went wrong!', err);
//   }
// );

spotifyApi.setAccessToken(process.env.accessToken)
spotifyApi.setRefreshToken(process.env.refreshToken)

let currentSong = {
	name: null,
	artists: null,
	image: null,
	url: null,
	duration: null,
	progress: null,
	update: null,
}

const getText = (name, artists, url) => `<a href="${url}">${artists} — ${name}</a>`

const getMyCurrentPlaybackState = async () => {
	try {
		let data = await spotifyApi.getMyCurrentPlayingTrack({})
		if (data.statusCode === 200){
			let body = data.body
			let artists = body.item.artists.map(artist => artist.name).join(", ")
			currentSong = {
					name: body.item.name,
					artists: artists,
					url: body.item.external_urls.spotify,
          paused: false,
					ok: true
				}
				return currentSong 
			}
    else if (data.statusCode === 204){
			currentSong = {
          paused: true,
					ok: true
				}
				return currentSong 
			}
		else {
				return {ok: false,
					message: "Status code is not 200",
					data: data
				}
		}
	}
	catch(err) {
		if (err.statusCode === 401) {
			try {
				let data = await spotifyApi.refreshAccessToken()
				spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
				process.env.accessToken = data.body['access_token'];
        process.env.refreshToken = data.body['refresh_token'];
				console.log("The access token has been refreshed!");
				//retrying
				return await getMyCurrentPlaybackState()
			}
			catch(err) {
				return {ok: false,
					message: "Could not refresh access token",
					data: err
				}
			}
		}
		else {//can't fix
			return {ok: false,
					message: "Something went wrong",
					data: err
			}
		}
	}
}


const showNowPlaying = async () => {
	var playbackState = await getMyCurrentPlaybackState();
	if (playbackState.ok) {
    if (playbackState.paused) {return 'paused'}
		return getText(playbackState.name, playbackState.artists, playbackState.url)
	}
	else {
		console.log(playbackState.message)
		console.log(playbackState.data)
		return '⚠️ Error, try again later'
	}
}


polka()
  .get('/', async (req, res) => {
     res.writeHead(200, {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"});
    res.end(await showNowPlaying());
  })
  .listen(port, err => {
    if (err) throw err;
    console.log(`> Running`);
  });
