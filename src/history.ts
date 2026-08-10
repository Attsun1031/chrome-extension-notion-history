import _ from "lodash";
import {format} from "date-fns";

type HistoryItem = chrome.history.HistoryItem;

export const msToString = (ms?: number): string => {
    if (ms == undefined) {
        return "No Date";
    } else {
        return format(new Date(ms), "yyyy/MM/dd");
    }
}

export const isHistoryItemMatchedWord = (word: string, h: chrome.history.HistoryItem): boolean => {
    if (_.isEmpty(word)) {
        return true;
    } else if (_.isEmpty(h.title)) {
        return false;
    } else {
        return h.title!!.toLowerCase().indexOf(word) >= 0;
    }
}

export const isHistoryItemMatchedWorkspace = (workspace: string, h: chrome.history.HistoryItem): boolean => {
    if (_.isEmpty(workspace)) {
        return true;
    }
    const parser = new URL(h.url!!);
    if (parser.host == `${workspace}.notion.site`) {
        return true
    }
    // pathname has header slash like "/path1/path2", so paths will become ["", "path1", path2"]
    const paths = parser.pathname.split("/");
    return paths.length > 1 && paths[1] == workspace;
}

// Notion moved its app domain from notion.so to notion.com, and the old host now
// 301s to the new one, so the browser records notion.com urls in the history.
// Both are kept because older history entries still carry the notion.so host.
const notionHosts = ["notion.so", "notion.com"];
export const isNotionHost = (host: string): boolean => {
    return notionHosts.some((h) => host == h || host.endsWith(`.${h}`));
}

const notionPageIdPattern = /^[\d\w]{32}$/
export const extractNotionPageIdFromUrl = (url: URL): (string | null) => {
    const lastPath = _.last(url.pathname.split("/"))?.trim()
    if (_.isEmpty(lastPath)) {
        return null
    }
    const pageId = _.last(lastPath!!.split("-"))?.trim();
    if (_.isEmpty(pageId)) {
        return null
    }
    if (notionPageIdPattern.test(pageId!!)) {
        return pageId!!
    }
    return null
}

export const chromeHistoriesToNotionItems = (histories: HistoryItem[]): HistoryItem[] => {
    const pages = new Set<string>();
    const items: chrome.history.HistoryItem[] = [];
    histories.forEach((h) => {
        if (_.isEmpty(h.url)) {
            return;
        }
        const parser = new URL(h.url!!);
        if (!isNotionHost(parser.host)) {
            return;
        }
        const pageId = extractNotionPageIdFromUrl(parser);
        if (_.isEmpty(pageId)) {
            return;
        }
        if (!pages.has(pageId!!)) {
            pages.add(pageId!!);
            items.push(h);
        }
    })
    return items;
}
