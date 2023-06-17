import cheerio from "cheerio"

export async function search({query, searchType='artists'}) {
    const searchPageUrl = new URL(`https://www.songkick.com/search`) // ?query=Stuck&type=artists`;
    searchPageUrl.searchParams.set('query', query);
    searchPageUrl.searchParams.set('type', searchType);

    console.log({searchPageUrl});

    const liClassBySearchType = {
	artists: 'artist',
	venues: 'venue'
    }

    const liClass = liClassBySearchType[searchType]

    const searchPageHtml = await fetch(searchPageUrl.toString()).then(response => response.text());

    const $ = cheerio.load(searchPageHtml);

    const searchResults = $(`.event-listings li.${liClass}`).map((_, resultTag) => {
	const songkickUrl = $(resultTag).find('.summary a').attr('href');
	const itemId = songkickUrl.split('/').at(-1);
	return {
	    name: $(resultTag).find('.summary a strong').text().trim(),
	    id: itemId,
	    type: liClass
	}
    }).get();

    return searchResults;
}

export async function getEventsHtmlForItem({itemId, itemType, pageNum=1}) {

    const pluralByItemType = {
	artist: 'artists',
	venue: 'venues',
    }

    const itemTypePlural = pluralByItemType[itemType]

    const eventsPageUrl = `https://www.songkick.com/${itemTypePlural}/${itemId}/gigography?page=${pageNum}`

    console.log({eventsPageUrl});
    
    const eventsPageHtml = await fetch(eventsPageUrl).then(response => response.text())

    return eventsPageHtml;
}

export async function lookupEventsForItem({itemId, itemType, pageNum=1}) {

    const eventsPageHtml = await getEventsHtmlForItem({itemId, itemType, pageNum});

    const $ = cheerio.load(eventsPageHtml);

    const jsonScripts = $('.event-listings .microformat script[type="application/ld+json"]');

    return jsonScripts.map((_, scriptTag) => {
	return JSON.parse(
	    $(scriptTag).text()
	)
    }).get()
}

export function getUniqueArtistsFromEvents({ events }) {
  const allArtists = events.flatMap((event) => event.performer);

  const uniqueArtists = [];

  for (const thisArtist of allArtists) {
    const existingArtist = uniqueArtists.find(
      (artist) => artist.sameAs === thisArtist.sameAs
    );

    if (existingArtist) {
      existingArtist.count++;
    } else {
      uniqueArtists.push({ ...thisArtist, count: 1 });
    }
  }

  uniqueArtists.sort((a, b) => b.count - a.count);

  return uniqueArtists;
}


export function getUniqueVenuesFromEvents({ events }) {
  const allVenues = events.map((event) => event.location);

  const knownVenues = [];

  for (const thisVenue of allVenues) {
    const knownVenue = knownVenues.find(
      (otherVenue) => otherVenue.name === thisVenue.name
    );

    if (knownVenue) {
      knownVenue.count++;
    } else {
      knownVenues.push({ ...thisVenue, count: 1 });
    }
  }

  knownVenues.sort((a, b) => b.count - a.count);

  return knownVenues;
}

export async function lookupDataForItem({itemId, itemType}) {

    const pageNums = [1,2,3]

    const eventsArrays = await Promise.all(pageNums.map(pageNum => lookupEventsForItem({itemId, itemType, pageNum})))

    const events = eventsArrays.flat(); 

    const artists = getUniqueArtistsFromEvents({events});

    const venues = getUniqueVenuesFromEvents({events});

    return {events, artists, venues}
}

export async function getItemNameFromId({itemId, itemType}) {

    const pluralByItemType = {
	artist: 'artists',
	venue: 'venues',
    }

    const itemTypePlural = pluralByItemType[itemType]

    const eventsPageUrl = `https://www.songkick.com/${itemTypePlural}/${itemId}`

    const eventsPageHtml = await fetch(eventsPageUrl).then(response => response.text())

    const $ = cheerio.load(eventsPageHtml);


    const selectorByItemType = {
    artist: '.artist-overview h1',
    venue: 'h1.h0.fn.org'
    }

    const selector = selectorByItemType[itemType]

    return $(selector).text().trim(); 

}

export function getItemPathFromUrl({url, itemType}) {
    // Remove query parameters from the URL
    const urlWithoutParams = url.split('?')[0];

    // Split the URL by slashes to get the artist ID
    const parts = urlWithoutParams.split('/');

    // Get the last part of the URL which should be the artist ID
    const itemId = parts.at(-1);

    // Construct the artist path
    const itemPath = `/songkick/${itemType}/${itemId}`;

    return itemPath;
}
