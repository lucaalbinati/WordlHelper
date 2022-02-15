import {
    isOutdated
} from './helper.js'

const WILDWORD_STORAGE_KEY = "wildword"

export class WildwordLetterState {
    constructor(letterType="all", cssClasses=[]) {
        this.letterType = letterType
        this.cssClasses = cssClasses
    }

    setLetterType(newLetterType) {
        this.letterType = newLetterType
    }

    addClass(cssClass) {
        if (!(cssClass in this.cssClasses)) {
            this.cssClasses.push(cssClass)
        }
    }
}

export class WildwordState {
    constructor() {
        this.updateLastModified()
        this.wildwordLetters = {
            0: new WildwordLetterState(),
            1: new WildwordLetterState(),
            2: new WildwordLetterState(),
            3: new WildwordLetterState(),
            4: new WildwordLetterState()
        }
    }

    updateLastModified() {
        this.lastModified = new Date()
    }

    getWildwordLetter(position) {
        this.updateLastModified()
        return this.wildwordLetters[position]
    }

    async save() {
        this.updateLastModified()
        return new Promise(resolve => {
            chrome.storage.local.set(createStorageObjectFromState(this), () => {
                console.log(`saved '${WILDWORD_STORAGE_KEY}' to storage`)
                resolve()
            })
        })
    }
}

export async function loadWildwordStateFromStorage(letterStates) {
    return new Promise(resolve => {
        chrome.storage.local.get(WILDWORD_STORAGE_KEY, function(result) {
            if (result[WILDWORD_STORAGE_KEY] != null) {
                let wildwordState = createWildwordStateInstance(result[WILDWORD_STORAGE_KEY])
                if (!isOutdated(wildwordState.lastModified) && Object.entries(letterStates).length > 0) {
                    console.log(`found '${WILDWORD_STORAGE_KEY}' in storage`)
                    resolve(wildwordState)
                    return
                } else if (isOutdated(wildwordState.lastModified)) {
                    console.log(`found '${WILDWORD_STORAGE_KEY}' in storage, but it is outdated; resetting it`)
                } else if (Object.entries(letterStates).length == 0) {
                    console.log(`found '${WILDWORD_STORAGE_KEY}' in storage, but the cookies have been deleted since; resetting it`)
                }
            } else {
                console.log(`did not find '${WILDWORD_STORAGE_KEY}' in storage`)
            }

            let wildwordState = new WildwordState()
            chrome.storage.local.set(createStorageObjectFromState(wildwordState), () => {
                console.log(`reset '${WILDWORD_STORAGE_KEY}' in storage`)
                resolve(wildwordState)
            })
        })
    })
}

function createStorageObjectFromState(wildwordState) {
    let obj = {}
    obj[WILDWORD_STORAGE_KEY] = JSON.stringify(wildwordState)
    return obj
}

function createWildwordStateInstance(jsonString) {
    let wildwordStateFromJSON = JSON.parse(jsonString)
    return new WildwordState(wildwordStateFromJSON.lastModified, wildwordStateFromJSON.wildwordLetters)
}