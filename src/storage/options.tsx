interface Options {
    daysBefore: number
    workspace: string
}

const KEY = "options"

export function saveOptions(opts: Options, callback: () => void = () => {
}) {
    chrome.storage.local.set({[KEY]: opts}, callback);
}

export function getOptions(defaultOpts: Options, callback: (opts: any) => void) {
    chrome.storage.local.get([KEY], (obj: any) => {
        callback(obj[KEY])
    });
}
