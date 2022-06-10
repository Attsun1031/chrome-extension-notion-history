import formatISO from 'date-fns/formatISO'
import _ from "lodash";

interface Favorite {
    title: string,
    url: string,
    createdAt: Date
}

const KEY = "favorites"

export function saveOneFavorite(fav: Favorite, callback: () => void = () => {
}) {
    chrome.storage.local.get([KEY], (obj) => {
        let favorites = obj[KEY]
        favorites[fav.url] = {
            title: fav.title,
            url: fav.url,
            createdAt: formatISO(fav.createdAt)
        }
        chrome.storage.local.set({[KEY]: favorites}, callback);
    })
}

export function getFavorites(callback: (favs: Favorite[]) => void) {
    chrome.storage.local.get([KEY], (obj: any) => {
        callback(_.values(obj[KEY]))
    });
}
