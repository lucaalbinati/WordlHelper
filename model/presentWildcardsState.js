import {
    isOutdated
} from './helper.js'

const PRESENT_WILDCARDS_STORAGE_KEY = "presentWildcards"

export class PresentWildcardState {
    constructor(letter, toggled=false) {    
        this.letter = letter.toLowerCase()
        this.toggled = toggled
    }

    equals(o) {
        if (o != null && typeof o == typeof this) {
            return this.letter == o.letter && this.toggled == o.toggled
        } else {
            return false
        }
    }
}

export class PresentWildcardsState {
    constructor() {
        this.updateLastModified()
        this.presentWildcards = []
    }

    updateLastModified() {
        this.lastModified = new Date()
    }

    add(presentWildcard) {
        let contains = this.presentWildcards.some(wildcard => wildcard.equals(presentWildcard))
        if (!contains) {
            this.presentWildcards.push(presentWildcard)
            this.updateLastModified()
        }
    }

    async save() {
        this.updateLastModified()
        return new Promise(resolve => {
            chrome.storage.local.set(createStorageObjectFromState(this), () => {
                console.log(`saved '${PRESENT_WILDCARDS_STORAGE_KEY}' to storage`)
                resolve()
            })
        })
    }
}

export async function loadPresentWildcardsFromStorage() {
    return new Promise(resolve => {
        chrome.storage.local.get(PRESENT_WILDCARDS_STORAGE_KEY, function(result) {
            if (result[PRESENT_WILDCARDS_STORAGE_KEY] != null) {
                let presentWildcardsState = createPresentWildcardsStateInstance(result[PRESENT_WILDCARDS_STORAGE_KEY])
                if (!isOutdated(presentWildcardsState.lastModified)) {
                    console.log(`found '${PRESENT_WILDCARDS_STORAGE_KEY}' in storage`)
                    resolve(presentWildcardsState)
                    return
                } else {
                    console.log(`found '${PRESENT_WILDCARDS_STORAGE_KEY}' in storage, but it is outdated; resetting it`)
                }
            } else {
                console.log(`did not find '${PRESENT_WILDCARDS_STORAGE_KEY}' in storage`)
            }

            let presentWildcardsState = new PresentWildcardsState()
            chrome.storage.local.set(createStorageObjectFromState(presentWildcardsState), () => {
                console.log(`reset '${PRESENT_WILDCARDS_STORAGE_KEY}' in storage`)
                resolve(presentWildcardsState)
            })
        })
    })
}

function createStorageObjectFromState(presentWildcardState) {
    let obj = {}
    obj[PRESENT_WILDCARDS_STORAGE_KEY] = JSON.stringify(presentWildcardState)
    return obj
}

function createPresentWildcardsStateInstance(jsonString) {
    let presentWildcardsStateFromJSON = JSON.parse(jsonString)
    return new PresentWildcardsState(presentWildcardsStateFromJSON.lastModified, presentWildcardsStateFromJSON.presentWildcards)
}