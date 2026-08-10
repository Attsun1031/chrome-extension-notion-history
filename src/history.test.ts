import {
    chromeHistoriesToNotionItems,
    extractNotionPageIdFromUrl,
    isHistoryItemMatchedWord,
    isHistoryItemMatchedWorkspace,
    isNotionHost,
    msToString
} from "./history";

// A 32 char id as notion puts at the end of a page url.
const pageId = "0123456789abcdef0123456789abcdef";
const otherPageId = "fedcba9876543210fedcba9876543210";

const historyItem = (url?: string, title?: string): chrome.history.HistoryItem => ({
    id: url ?? "no-url",
    url: url,
    title: title
});

describe("msToString", () => {
    it("falls back to a placeholder when there is no timestamp", () => {
        expect(msToString(undefined)).toBe("No Date");
    });

    // Built from a local Date so the expectation holds in any timezone.
    it("formats a timestamp as yyyy/MM/dd in local time", () => {
        expect(msToString(new Date(2024, 0, 15, 12, 0, 0).getTime())).toBe("2024/01/15");
    });
});

describe("isHistoryItemMatchedWord", () => {
    it("matches everything when the word is empty", () => {
        expect(isHistoryItemMatchedWord("", historyItem(undefined, "anything"))).toBe(true);
    });

    it("does not match an item without a title", () => {
        expect(isHistoryItemMatchedWord("notion", historyItem())).toBe(false);
    });

    it("matches case insensitively", () => {
        expect(isHistoryItemMatchedWord("release", historyItem(undefined, "Release Notes"))).toBe(true);
    });

    it("does not match an unrelated title", () => {
        expect(isHistoryItemMatchedWord("release", historyItem(undefined, "Meeting Notes"))).toBe(false);
    });

    // The caller lowercases the input box, so an uppercase word can never match.
    it("cannot match when the word itself is uppercase", () => {
        expect(isHistoryItemMatchedWord("Release", historyItem(undefined, "Release Notes"))).toBe(false);
    });
});

describe("isHistoryItemMatchedWorkspace", () => {
    it("matches everything when the workspace is empty", () => {
        expect(isHistoryItemMatchedWorkspace("", historyItem("https://www.notion.so/other/page"))).toBe(true);
    });

    it("matches a published notion.site subdomain", () => {
        expect(isHistoryItemMatchedWorkspace("myteam", historyItem("https://myteam.notion.site/page"))).toBe(true);
    });

    it("matches the workspace in the first path segment", () => {
        expect(isHistoryItemMatchedWorkspace("myteam", historyItem("https://www.notion.so/myteam/page"))).toBe(true);
    });

    it("does not match another workspace", () => {
        expect(isHistoryItemMatchedWorkspace("myteam", historyItem("https://www.notion.so/other/page"))).toBe(false);
    });

    it("does not match a url without a workspace segment", () => {
        expect(isHistoryItemMatchedWorkspace("myteam", historyItem("https://www.notion.so/"))).toBe(false);
    });
});

describe("isNotionHost", () => {
    it("accepts the legacy notion.so host", () => {
        expect(isNotionHost("www.notion.so")).toBe(true);
    });

    // notion.so now 301s here, so this is what the history actually records.
    it("accepts the current notion.com host", () => {
        expect(isNotionHost("www.notion.com")).toBe(true);
    });

    it("accepts a bare host without a subdomain", () => {
        expect(isNotionHost("notion.com")).toBe(true);
    });

    // A plain suffix check would let this through.
    it("rejects a host that merely ends with the same letters", () => {
        expect(isNotionHost("evilnotion.com")).toBe(false);
    });

    it("rejects an unrelated host", () => {
        expect(isNotionHost("example.com")).toBe(false);
    });

    // Published sites are a separate domain and stay out of the list.
    it("rejects a published notion.site host", () => {
        expect(isNotionHost("myteam.notion.site")).toBe(false);
    });
});

describe("extractNotionPageIdFromUrl", () => {
    it("reads the id from a bare page url", () => {
        expect(extractNotionPageIdFromUrl(new URL(`https://www.notion.so/${pageId}`))).toBe(pageId);
    });

    it("reads the id that trails a slugified title", () => {
        expect(extractNotionPageIdFromUrl(new URL(`https://www.notion.so/My-Page-Title-${pageId}`))).toBe(pageId);
    });

    it("returns null for a url with no path", () => {
        expect(extractNotionPageIdFromUrl(new URL("https://www.notion.so/"))).toBeNull();
    });

    it("returns null when the trailing segment is not a 32 char id", () => {
        expect(extractNotionPageIdFromUrl(new URL("https://www.notion.so/My-Page-Title"))).toBeNull();
    });

    it("returns null for an id of the wrong length", () => {
        expect(extractNotionPageIdFromUrl(new URL("https://www.notion.so/0123456789abcdef"))).toBeNull();
    });

    it("reads the id from a notion.com url", () => {
        expect(extractNotionPageIdFromUrl(new URL(`https://www.notion.com/myteam/My-Page-${pageId}`))).toBe(pageId);
    });

    // The query string is not part of pathname, so a shared link still resolves.
    it("ignores a trailing query string", () => {
        expect(extractNotionPageIdFromUrl(new URL(`https://www.notion.com/${pageId}?source=copy_link`))).toBe(pageId);
    });
});

describe("chromeHistoriesToNotionItems", () => {
    it("keeps notion pages and drops everything else", () => {
        const notionPage = historyItem(`https://www.notion.so/${pageId}`, "Page");
        const items = chromeHistoriesToNotionItems([
            notionPage,
            historyItem(`https://example.com/${pageId}`, "Not notion"),
            historyItem(undefined, "No url"),
            historyItem("https://www.notion.so/no-page-id", "No page id")
        ]);
        expect(items).toEqual([notionPage]);
    });

    it("keeps only the first visit of a page", () => {
        const first = historyItem(`https://www.notion.so/${pageId}`, "First visit");
        const items = chromeHistoriesToNotionItems([
            first,
            historyItem(`https://www.notion.so/Renamed-Title-${pageId}`, "Same page, later visit")
        ]);
        expect(items).toEqual([first]);
    });

    it("keeps distinct pages", () => {
        const items = chromeHistoriesToNotionItems([
            historyItem(`https://www.notion.so/${pageId}`, "One"),
            historyItem(`https://www.notion.so/${otherPageId}`, "Two")
        ]);
        expect(items).toHaveLength(2);
    });

    // Published sites live on a separate domain and are not included.
    it("drops notion.site pages", () => {
        const items = chromeHistoriesToNotionItems([
            historyItem(`https://myteam.notion.site/${pageId}`, "Published")
        ]);
        expect(items).toEqual([]);
    });

    // notion.so redirects to notion.com, so this is what the history now holds.
    it("keeps notion.com pages", () => {
        const notionPage = historyItem(`https://www.notion.com/myteam/My-Page-${pageId}`, "Page");
        expect(chromeHistoriesToNotionItems([notionPage])).toEqual([notionPage]);
    });

    // A workspace visited across the migration must not show up twice.
    it("deduplicates the same page seen on both domains", () => {
        const first = historyItem(`https://www.notion.com/myteam/My-Page-${pageId}`, "New domain");
        const items = chromeHistoriesToNotionItems([
            first,
            historyItem(`https://www.notion.so/myteam/My-Page-${pageId}`, "Old domain")
        ]);
        expect(items).toEqual([first]);
    });
});
