const config = require("./config")
const db = require("./db.js")
const qs = require("querystring")
const SpotifyWebApi = require("spotify-web-api-node");
const polka = require('polka');

const spotifyApi = new SpotifyWebApi({
	clientId: config.clientId,
	clientSecret: config.clientSecret,
});
spotifyApi.setAccessToken(db.get("accessToken"))

let currentSong = {
	name: null,
	artists: null,
	image: null,
	url: null,
	duration: null,
	progress: null,
	update: null,
}

const getText = (paused, name, artists, url) => `${paused} <a href="${url}">${artists} — ${name}</a>`

const getMyCurrentPlaybackState = async () => {
	try {
		let data = await spotifyApi.getMyCurrentPlaybackState({})
		if (data.statusCode === 200 || data.statusCode === 204){
			let body = data.body
			let artists = body.item.artists.map(artist => artist.name).join(", ")
			currentSong = {
					name: body.item.name,
					artists: artists,
					url: body.item.external_urls.spotify,
					paused: data.statusCode === 204,
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
				let token = data.body["access_token"]
				spotifyApi.setAccessToken(token);
				db.set("accessToken", token)
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
		var icon = playbackState.paused? '⏸': '🎵'
		return getText(icon, playbackState.name, playbackState.artists, playbackState.url)
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
  .listen(process.env.PORT, err => {
    if (err) throw err;
    console.log(`> Running`);
  });