import {
    WILDWORD_LETTER_CLASS,
    WILDWORD_LETTER_ALL_CLASS,
    WILDWORD_LETTER_UNUSED_CLASS,
    WILDWORD_LETTER_CORRECT_CLASS,
    WILDWORD_LETTER_POTENTIAL_CLASS,
    LETTER_ALL,
    LETTER_UNUSED
} from '../constants/html-css-constants.js'

import {
    WILDWORD_STORAGE_KEY,
    WILDCARD_ALL_TYPE,
    WILDCARD_UNUSED_TYPE,
    WILDCARD_CORRECT_TYPE,
    CORRECT_LETTER_STATE
} from '../constants/state-constants.js'

import {
    isOutdated
} from './helper.js'

export class WildwordLetter {
    constructor(letter) {
        this.letter = letter
        this.updateCssClasses()
    }

    getLetter() {
        return this.letter
    }

    getCssClasses() {
        return this.cssClasses
    }

    getType() {
        switch (this.letter) {
            case LETTER_ALL:
                return WILDCARD_ALL_TYPE
            case LETTER_UNUSED:
                return WILDCARD_UNUSED_TYPE
            default:
                return WILDCARD_CORRECT_TYPE
        }
    }

    addClass(cssClass) {
        if (!(cssClass in this.cssClasses)) {
            this.cssClasses.push(cssClass)
        }
    }

    removeClass(cssClass) {
        let idx = this.cssClasses.indexOf(cssClass)
        if (idx >= 0) {
            this.cssClasses.splice(idx, 1)
        }
    }

    hasPotential() {
        return this.cssClasses.indexOf(WILDWORD_LETTER_POTENTIAL_CLASS) >= 0
    }

    replace(newLetter) {
        if (this.hasPotential()) {
            console.log(`replacing ${this.letter} with ${newLetter}`)
            this.letter = newLetter
            this.updateCssClasses()
        }
    }

    hasCorrectCssClass() {
        return this.cssClasses.indexOf(WILDWORD_LETTER_CORRECT_CLASS) >= 0
    }

    updateCssClasses() {
        this.cssClasses = [WILDWORD_LETTER_CLASS]
        switch (this.letter) {
            case LETTER_ALL:
                this.cssClasses.push(WILDWORD_LETTER_ALL_CLASS)
                break
            case LETTER_UNUSED:
                this.cssClasses.push(WILDWORD_LETTER_UNUSED_CLASS)
                break
            default:
                this.cssClasses.push(WILDWORD_LETTER_CORRECT_CLASS)
                break
        }
    }
}

export class Wildword {
    constructor(wildwordLetters=null) {
        this.updateLastModified()
        this.wildwordLetters = wildwordLetters == null ? this.getNewDefaultWildwordLetters() : wildwordLetters
    }

    getWildwordLetters() {
        return this.wildwordLetters
    }

    updateLastModified() {
        this.lastModified = new Date()
    }

    getWildwordLetter(position) {
        this.updateLastModified()
        return this.wildwordLetters[position]
    }

    updateWildwordLettersPotential(wildcardSelected, letterStates) {
        console.log("updating wildword letters potential")
        var hasAtLeastOnePotential = false

        if (wildcardSelected == null) {
            console.log(`no wildcard is selected, so we remove CSS class '${WILDWORD_LETTER_POTENTIAL_CLASS}' from all wildword letters`)
            this.removeWildwordLettersPotentialClass()
        } else {
            switch (wildcardSelected.wildcardType) {
                case WILDCARD_ALL_TYPE:
                case WILDCARD_UNUSED_TYPE:
                    for (let [_, wildwordLetter] of Object.entries(this.wildwordLetters)) {
                        if (wildwordLetter.getType() != wildcardSelected.getType()) {
                            wildwordLetter.addClass(WILDWORD_LETTER_POTENTIAL_CLASS)
                            hasAtLeastOnePotential = true
                        }
                    }
                    break
                case WILDCARD_CORRECT_TYPE:
                    this.getPositionsOfCorrectWildwordLetters(letterStates).forEach(position => {
                        if (!this.wildwordLetters[position].hasCorrectCssClass()) {
                            this.wildwordLetters[position].addClass(WILDWORD_LETTER_POTENTIAL_CLASS)
                            hasAtLeastOnePotential = true
                        }
                    })
                    break
            }
        }

        this.updateLastModified()
        return hasAtLeastOnePotential
    }

    getPositionsOfCorrectWildwordLetters(letterStates) {
        let positions = new Set()

        for (let [_, value] of Object.entries(letterStates)) {
            if (CORRECT_LETTER_STATE in value) {
                value[CORRECT_LETTER_STATE].forEach(position => positions.add(position))
            }
        }

        return positions
    }

    removeWildwordLettersPotentialClass() {
        for (let [_, wildwordLetter] of Object.entries(this.wildwordLetters)) {
            wildwordLetter.removeClass(WILDWORD_LETTER_POTENTIAL_CLASS)
        }
    }

    getNewDefaultWildwordLetters() {
        return {
            0: new WildwordLetter(LETTER_ALL),
            1: new WildwordLetter(LETTER_ALL),
            2: new WildwordLetter(LETTER_ALL),
            3: new WildwordLetter(LETTER_ALL),
            4: new WildwordLetter(LETTER_ALL)
        }
    }

    reset() {
        this.wildwordLetters = this.getNewDefaultWildwordLetters()
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
                let wildword = createWildwordStateInstance(result[WILDWORD_STORAGE_KEY])
                if (!isOutdated(wildword.lastModified) && Object.entries(letterStates).length > 0) {
                    console.log(`found '${WILDWORD_STORAGE_KEY}' in storage`)
                    resolve(wildword)
                    return
                } else if (isOutdated(wildword.lastModified)) {
                    console.log(`found '${WILDWORD_STORAGE_KEY}' in storage, but it is outdated; resetting it`)
                } else if (Object.entries(letterStates).length == 0) {
                    console.log(`found '${WILDWORD_STORAGE_KEY}' in storage, but the cookies have been deleted since; resetting it`)
                }
            } else {
                console.log(`did not find '${WILDWORD_STORAGE_KEY}' in storage`)
            }

            let wildword = new Wildword()
            chrome.storage.local.set(createStorageObjectFromState(wildword), () => {
                console.log(`reset '${WILDWORD_STORAGE_KEY}' in storage`)
                resolve(wildword)
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
    let wildwordFromJSON = JSON.parse(jsonString)
    let wildwordLetters = {
        0: new WildwordLetter(wildwordFromJSON.wildwordLetters[0].letter),
        1: new WildwordLetter(wildwordFromJSON.wildwordLetters[1].letter),
        2: new WildwordLetter(wildwordFromJSON.wildwordLetters[2].letter),
        3: new WildwordLetter(wildwordFromJSON.wildwordLetters[3].letter),
        4: new WildwordLetter(wildwordFromJSON.wildwordLetters[4].letter)
    }
    return new Wildword(wildwordLetters)
}