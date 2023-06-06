import cheerio from "cheerio"

export async function search({query}) {
    const searchPageUrl = new URL(`https://www.songkick.com/search`) // ?query=Stuck&type=artists`;
    searchPageUrl.searchParams.set('query', query);
    searchPageUrl.searchParams.set('type', 'artists');

    const searchPageHtml = await fetch(searchPageUrl.toString()).then(response => response.text());

    const $ = cheerio.load(searchPageHtml);

    const searchResults = $('.event-listings li.artist').map((_, resultTag) => {
	const songkickUrl = $(resultTag).find('.summary a').attr('href');
	const artistId = songkickUrl.split('/').at(-1);
	return {
	    name: $(resultTag).find('.summary a strong').text().trim(),
	    id: artistId 
	}
    }).get();

    return searchResults;
}

export async function getEventsHtmlForArtist({artistId, pageNum=1}) {

    const eventsPageUrl = `https://www.songkick.com/artists/${artistId}/gigography?page=${pageNum}`

    const eventsPageHtml = await fetch(eventsPageUrl).then(response => response.text())

    return eventsPageHtml;
}

export async function lookupEventsForArtist({artistId, pageNum=1}) {

    const eventsPageHtml = await getEventsHtmlForArtist({artistId, pageNum});

    const $ = cheerio.load(eventsPageHtml);

    const jsonScripts = $('.event-listings .microformat script[type="application/ld+json"]');

    return jsonScripts.map((_, scriptTag) => {
	return JSON.parse(
	    $(scriptTag).text()
	)
    }).get()
}

export function getUniqueArtistsFromEvents({events}) {
    // each event has a 'performer' key which is an array of artists

    const allArtists = events.map(event => event.performer).flat();

    const uniqueArtists = [];

    for (const thisArtist of allArtists) {
	const isKnown = uniqueArtists.some(otherArtist => {
	    return otherArtist.sameAs === thisArtist.sameAs; 
	});

	if (!isKnown) {
	    uniqueArtists.push(thisArtist);
	}
    }

    return uniqueArtists;
}

export async function lookupDataForArtist({artistId}) {

    const pageNums = [1,2,3]

    const eventsArrays = await Promise.all(pageNums.map(pageNum => lookupEventsForArtist({artistId, pageNum})))

    const events = eventsArrays.flat(); 

    const artists = getUniqueArtistsFromEvents({events});

    return {events, artists}
}

export async function getArtistNameFromId({artistId}) {

    const eventsPageUrl = `https://www.songkick.com/artists/${artistId}`

    const eventsPageHtml = await fetch(eventsPageUrl).then(response => response.text())

    const $ = cheerio.load(eventsPageHtml);

    return $('.artist-overview h1').text().trim(); 

}

export function getArtistPathFromURL(url) {
    // Remove query parameters from the URL
    const urlWithoutParams = url.split('?')[0];

    // Split the URL by slashes to get the artist ID
    const parts = urlWithoutParams.split('/');

    // Get the last part of the URL which should be the artist ID
    const artistID = parts[parts.length - 1];

    // Construct the artist path
    const artistPath = `/songkick/artist/${artistID}`;

    return artistPath;
}

