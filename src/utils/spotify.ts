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

    const resultKeyByType = {
	'artist': 'artists',
	'album': 'albums',
    }

    const resultKey = resultKeyByType[searchType]

    return searchResults[resultKey].items;
}

export async function lookupTracksForAlbumByQuery({artistName, albumName, authToken}) {
    const searchQuery = artistName + " " + albumName;
    const searchResults = await search({searchQuery, searchType: 'album', authToken});

    // TODO: check that the first result is actually correct? 
    const firstResult = searchResults[0]

    const albumId = firstResult.id;

    const albumTracksUrl = `https://api.spotify.com/v1/albums/${albumId}/tracks`
    const albumTracksResponse = await fetch(albumTracksUrl, {headers: {Authorization: `Bearer ${authToken}`}});

    if (!albumTracksResponse.ok) {
	const responseText = await albumTracksResponse.text();
	throw new Error(responseText);
    }

    const albumTracksJson = await albumTracksResponse.json();

    return albumTracksJson.items;
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
    console.log("Looking up top tracks for artist with ID", artistId);
    console.log({artistId, numTracks, authToken})
    const spotifyTopTracksUrl = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=AU`

    const spotifyResponse = await fetch(spotifyTopTracksUrl, {headers: {Authorization: `Bearer ${authToken}`}});

    if (spotifyResponse.ok) {
	const spotifyData = await spotifyResponse.json();
	const trackIds = spotifyData.tracks.map(track => track.id).slice(0, numTracks);
	console.log("Track IDs:", trackIds);
	return trackIds
    } else {
	const responseText = await spotifyResponse.text();
	console.log(responseText);
    }
}

export async function getTopTracksForMultipleArtists({artistIds, numTracksPerArtist, authToken}) {
    const trackIdArrays = await pMap(artistIds, (artistId) => lookupTopTrackIdsForArtist({artistId, numTracks: numTracksPerArtist, authToken}), {concurrency: 2})
    const trackIds = trackIdArrays.flat();
    return trackIds;
}

async function getCurrentUserId({authToken}) {
    const spotifyCurrentUserUrl = `https://api.spotify.com/v1/me`

    const spotifyResponse = await fetch(spotifyCurrentUserUrl, {headers: {Authorization: `Bearer ${authToken}`}})

    if (spotifyResponse.ok) {
	const responseJson = await spotifyResponse.json();
	return responseJson.id;
    } else {
	const responseText = await spotifyResponse.text();
	throw new Error(responseText);
    }
}

async function createEmptyPlaylist({playlistName, description, authToken}) {

    const userId = await getCurrentUserId({authToken})
    
    const spotifyCreatePlaylistUrl = `https://api.spotify.com/v1/users/${userId}/playlists`

    const requestData = {
	name: playlistName,
	description,
	public: false,
    }

    const spotifyResponse = await fetch(spotifyCreatePlaylistUrl, {
	method: 'POST',
	body: JSON.stringify(requestData),
	headers: {
	    'Content-Type': 'application/json',
	    'Authorization': `Bearer ${authToken}`
	}
    });

    if (spotifyResponse.ok) {
	const responseJson = await spotifyResponse.json();
	console.log("Created playlist!")
	console.log(responseJson)
	return responseJson.id;
    } else {
	const responseText = await spotifyResponse.text();
	console.log(responseText);
	throw new Error(responseText);
}
}

function chunkArray(array, chunkSize) {
  const chunkedArray = [];
  let index = 0;

  while (index < array.length) {
    chunkedArray.push(array.slice(index, index + chunkSize));
    index += chunkSize;
  }

  return chunkedArray;
}

async function addTrackChunkToPlaylist({playlistId, trackIds, authToken}) {
    const trackUris = trackIds.map(trackId => `spotify:track:${trackId}`);

    const spotifyAddTracksUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`

    const spotifyResponse = await fetch(spotifyAddTracksUrl, {
	method: 'POST',
	headers: {
	'Content-Type': 'application/json',
	'Authorization': `Bearer ${authToken}`
	},
	body: JSON.stringify({uris: trackUris})
    })

    if (spotifyResponse.ok) {
	console.log("Added tracks to playlist");
	return true;
    } else {
	const responseText = await spotifyResponse.text();
	throw new Error(responseText);
    }

}
async function addTracksToPlaylist({playlistId, trackIds, authToken}) {

    const chunksOfTrackIds = chunkArray(trackIds, 100)

    const result = await pMap(chunksOfTrackIds, (chunkOfTrackIds) => addTrackChunkToPlaylist({playlistId, trackIds: chunkOfTrackIds, authToken}), {concurrency: 1});

    console.log(result);
}

export async function createPlaylistWithArtists({playlistName, artistIds, authToken}) {
    const trackIds = await getTopTracksForMultipleArtists({artistIds, numTracksPerArtist: 3, authToken});
    
    const playlistId = await createEmptyPlaylist({playlistName, description: "Testing", authToken});

    const done = await addTracksToPlaylist({playlistId, trackIds, authToken});

    return done;
}
