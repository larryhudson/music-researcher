import pMap from "p-map";

export async function getAuthToken({code}) {

    const {SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET} = import.meta.env
    const formData = new FormData();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('redirect_uri', 'http://localhost:3000/auth/spotify/callback');

    const encodedData = new URLSearchParams(formData).toString();

    const spotifyTokenUrl = `https://accounts.spotify.com/api/token` 
    const authCode = (new Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString('base64'))
    const spotifyResponse = await fetch(spotifyTokenUrl, {
	headers: {
	    'Authorization': `Basic ${authCode}`,
	    'Content-Type': 'application/x-www-form-urlencoded'
	},
	method: 'POST',
	body: encodedData
    }).then(response => response.json())

    return spotifyResponse.access_token;
}

export async function search({searchQuery, searchType, authToken}) {
    const spotifySearchUrl = new URL(`https://api.spotify.com/v1/search`);
    spotifySearchUrl.searchParams.set('q', searchQuery);
    spotifySearchUrl.searchParams.set('type', searchType);

    console.log(spotifySearchUrl.toString())

    const spotifyResponse = await fetch(spotifySearchUrl.toString(), {
	headers: {
	'Authorization': `Bearer ${authToken}`
    }})

    const searchResults = await spotifyResponse.json();

    return searchResults.artists.items;
}

export async function getFirstArtist({artistName, authToken}) {
    const searchResults = await search({searchQuery: artistName, searchType: 'artist', authToken});

    if (searchResults.length > 0) {
	const firstResult = searchResults[0];
	console.log(`Artist ID for artistName: ${firstResult.id}`);
	return searchResults[0]
    }
}

export async function lookupMultipleArtists({artistNames, authToken}) {
   const result = await pMap(artistNames, (artistName) => getFirstArtist({artistName, authToken}), {concurrency: 2}) 

    return result;
}


export async function lookupTopTrackIdsForArtist({artistId, numTracks, authToken}) {
    const spotifyTopTracksUrl = `https://api.spotify.com/v1/artists/${artistId}/top-tracks`

    const spotifyResponse = await fetch(spotifyTopTracksUrl, {headers: {Authorization: `Bearer ${authToken}`}});

    if (spotifyResponse.ok) {
	const spotifyData = await spotifyResponse.json();
	const trackIds = spotifyData.tracks.map(track => track.id).slice(0, numTracks);
	console.log("Track IDs:", trackIds);
	return trackIds
    }
}

export async function getTopTracksForMultipleArtists({artistIds, numTracksPerArtist, authToken}) {
    const result = await pMap(artistIds, (artistId) => lookupTopTrackIdsForArtist({artistId, numTracks: numTracksPerArtist, authToken}), {concurrency: 2})

    return result;
}

export async function createPlaylistWithArtists({playlistName, artistIds, authToken}) {
    const trackIds = await getTopTracksForMultipleArtists({artistIds, numTracksPerArtist: 3, authToken});
    
    // create the playlist
    // add the track ids to the playlist
}
