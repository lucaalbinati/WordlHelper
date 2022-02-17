import {
    WILDCARD_ALL_TYPE,
    WILDCARD_UNUSED_TYPE,
    WILDCARD_CORRECT_TYPE,
    CORRECT_LETTER_STATE
} from '../constants/state-constants.js'

import {
    Wildcard
} from './wildcard.js'

import {
    savePresentWildcardsToStorage,
    loadPresentWildcardsFromStorage
} from './presentWildcard.js'

import {
    loadWildwordStateFromStorage
} from './wildword.js'
import { LETTER_ALL, LETTER_UNUSED } from '../constants/html-css-constants.js'

export class State {
    constructor(letterStates, updateUICallback) {
        this.letterStates = letterStates
        this.updateUICallback = () => {
            this.save()
            updateUICallback(this)
        }
        this.wildcards = {}
        this.wildcards[WILDCARD_ALL_TYPE] = new Wildcard(WILDCARD_ALL_TYPE)
        this.wildcards[WILDCARD_UNUSED_TYPE] = new Wildcard(WILDCARD_UNUSED_TYPE)
        this.wildcards[WILDCARD_CORRECT_TYPE] = new Wildcard(WILDCARD_CORRECT_TYPE)
        this.loadFromStorage()
    }

    getAllWildcard() {
        return this.wildcards[WILDCARD_ALL_TYPE]
    }

    getUnusedWildcard() {
        return this.wildcards[WILDCARD_UNUSED_TYPE]
    }
    
    getCorrectWildcard() {
        return this.wildcards[WILDCARD_CORRECT_TYPE]
    }

    getPresentWildcards() {
        return this.presentWildcards
    }

    getWildword() {
        return this.wildword
    }

    getSelectedWildcard() {
        let selectedWildcards = []
        Object.values(this.wildcards).forEach(wildcard => {
            if (wildcard.isSelected) {
                selectedWildcards.push(wildcard)
            }
        })

        switch (selectedWildcards.length) {
            case 0:
                return null
            case 1:
                return selectedWildcards[0]
            default:
                throw new Error(`There shouldn't be more than 1 wildcard selected at the same time, instead found ${selectedWildcards.length}`)
        }
    }

    selectWildcard(wilcardType) {
        if (this.getSelectedWildcard() != null) {
            this.wildword.removeWildwordLettersPotentialClass()

            if (wilcardType == this.getSelectedWildcard().getType()) {
                this.wildcards[wilcardType].unselect()
            } else {
                this.getSelectedWildcard().unselect()
                this.wildcards[wilcardType].select()
            }
        } else {
            this.wildcards[wilcardType].select()
        }

        if (!this.updateWildwordLettersPotential()) {
            this.unselectWildcard()
        }
        this.updateUICallback()
    }

    unselectWildcard() {
        if (this.getSelectedWildcard() != null) {
            this.getSelectedWildcard().unselect()
            this.updateWildwordLettersPotential()
            this.updateUICallback()
        }
    }

    selectWildwordLetter(position) {
        if (this.getSelectedWildcard() != null) {
            var newLetter = null
            switch (this.getSelectedWildcard().getType()) {
                case WILDCARD_ALL_TYPE:
                    newLetter = LETTER_ALL
                    break
                case WILDCARD_UNUSED_TYPE:
                    newLetter = LETTER_UNUSED
                    break
                case WILDCARD_CORRECT_TYPE:
                    for (let [letter, value] of Object.entries(this.letterStates)) {
                        if (CORRECT_LETTER_STATE in value) {
                            for (let pos of value[CORRECT_LETTER_STATE]) {
                                if (pos == position) {
                                    newLetter = letter
                                }
                            }
                        }
                    }
                    break
            }

            this.wildword.getWildwordLetter(position).replace(newLetter)
            this.unselectWildcard()
            this.wildword.removeWildwordLettersPotentialClass()
            this.updateUICallback()
        }
    }

    updateWildwordLettersPotential() {
        return this.wildword.updateWildwordLettersPotential(this.getSelectedWildcard(), this.letterStates)
    }

    togglePresentWildcard(letter) {
        for (let presentWildcard of this.getPresentWildcards()) {
            if (presentWildcard.getLetter() == letter) {
                presentWildcard.toggle()
                this.updateUICallback()
            }
        }
    }

    resetWildword() {
        this.wildword.reset()
        this.updateUICallback()
    }

    async save() {
        await savePresentWildcardsToStorage(this.presentWildcards)
        await this.wildword.save()
    }

    async loadFromStorage() {
        this.presentWildcards = await loadPresentWildcardsFromStorage(this.letterStates).then(result => {
            return result
        })
        this.wildword = await loadWildwordStateFromStorage(this.letterStates).then(result => {
            return result
        })
    }
}