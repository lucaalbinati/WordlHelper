import {
    WILDCARD_CLASS,
    WILDCARD_PRESENT_CLASS
} from '../constants/html-css-constants.js'

import {
    PRESENT_WILDCARDS_STORAGE_OBJECT_KEY,
    PRESENT_WILDCARDS_KEY,
    LAST_MODIFIED_KEY,
    PRESENT_LETTER_STATE
} from '../constants/state-constants.js'

import {
    isOutdated
} from './helper.js'

export class PresentWildcard {
    constructor(letter, toggled=false) {    
        this.letter = letter.toLowerCase()
        this.toggled = toggled
        this.cssClasses = [WILDCARD_CLASS, WILDCARD_PRESENT_CLASS]
    }

    getLetter() {
        return this.letter
    }

    isToggled() {
        return this.toggled
    }

    getCssClasses() {
        return this.cssClasses
    }

    toggle() {
        this.toggled = !this.toggled
    }

    equals(o) {
        if (o != null && typeof o == typeof this) {
            return this.letter == o.letter && this.toggled == o.toggled
        } else {
            return false
        }
    }
}

class PresentWildcardsStorageObject {
    constructor(presentWildcards) {
        this.presentWildcards = presentWildcards
        this.lastModified = new Date()
    }
}

export async function savePresentWildcardsToStorage(presentWildcards) {
    return new Promise(resolve => {
        chrome.storage.local.set(createStorageObjectFromList(presentWildcards), () => {
            console.log(`saved '${PRESENT_WILDCARDS_STORAGE_OBJECT_KEY}' to storage`)
            resolve()
        })
    })
}

export async function loadPresentWildcardsFromStorage(letterStates) {
    return new Promise(resolve => {
        chrome.storage.local.get(PRESENT_WILDCARDS_STORAGE_OBJECT_KEY, function(result) {
            if (result[PRESENT_WILDCARDS_STORAGE_OBJECT_KEY] != null) {
                let presentWildcardsObjs = result[PRESENT_WILDCARDS_STORAGE_OBJECT_KEY][PRESENT_WILDCARDS_KEY]
                let lastModified = result[PRESENT_WILDCARDS_STORAGE_OBJECT_KEY][LAST_MODIFIED_KEY]

                if (!isOutdated(lastModified)) {
                    console.log(`found '${PRESENT_WILDCARDS_KEY}' in storage`)
                    resolve(convertToObjects(presentWildcardsObjs))
                    return
                } else {
                    console.log(`found '${PRESENT_WILDCARDS_KEY}' in storage, but it is outdated; resetting it`)
                }
            } else {
                console.log(`did not find '${PRESENT_WILDCARDS_KEY}' in storage`)
            }

            let presentWildcards = getPresentWildcardsFromLetterStates(letterStates)
            chrome.storage.local.set(createStorageObjectFromList(presentWildcards), () => {
                console.log(`reset '${PRESENT_WILDCARDS_KEY}' in storage`)
                resolve(presentWildcards)
            })
        })
    })
}

function createStorageObjectFromList(presentWildcards) {
    let presentWildcardsStorageObject = {}
    presentWildcardsStorageObject[PRESENT_WILDCARDS_STORAGE_OBJECT_KEY] = new PresentWildcardsStorageObject(presentWildcards)
    return presentWildcardsStorageObject
}

function convertToObjects(presentWildcardsObjs) {
    let presentWildcards = []
    presentWildcardsObjs.forEach(obj => {
        presentWildcards.push(new PresentWildcard(obj.letter, obj.toggled))
    })
    return presentWildcards
}

function getPresentWildcardsFromLetterStates(letterStates) {
    let presentWildcards = []
    for (let [letter, value] of Object.entries(letterStates)) {
        if (PRESENT_LETTER_STATE in value) {
            presentWildcards.push(new PresentWildcard(letter))
            console.log(`adding present wildcard with letter '${letter}'`)
        }
    }
    return presentWildcards
}