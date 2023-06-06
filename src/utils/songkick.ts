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

export async function lookupEventsForArtist({artistId}) {
const eventsPageUrl = `https://www.songkick.com/artists/${artistId}/gigography`

const eventsPageHtml = await fetch(eventsPageUrl).then(response => response.text())

const $ = cheerio.load(eventsPageHtml);

const jsonScripts = $('.event-listings .microformat script[type="application/ld+json"]');

return jsonScripts.map((_, scriptTag) => {
    return JSON.parse(
	$(scriptTag).text()
    )
}).get()
}

export async function getArtistNameFromId({artistId}) {

    const eventsPageUrl = `https://www.songkick.com/artists/${artistId}`

    const eventsPageHtml = await fetch(eventsPageUrl).then(response => response.text())

    const $ = cheerio.load(eventsPageHtml);

    return $('.artist-overview h1').text().trim(); 
}
