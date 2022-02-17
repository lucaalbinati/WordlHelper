import {
    WILDCARD_CLASS,
    WILDCARD_ALL_CLASS,
    WILDCARD_UNUSED_CLASS,
    WILDCARD_CORRECT_CLASS,
    WILDCARD_SELECTED_CLASS
} from "../constants/html-css-constants.js"

import {
    WILDCARD_ALL_TYPE,
    WILDCARD_CORRECT_TYPE,
    WILDCARD_UNUSED_TYPE
} from "../constants/state-constants.js"

export class Wildcard {
    constructor(wildcardType, isSelected=false, cssClasses=null) {
        this.wildcardType = wildcardType
        this.isSelected = isSelected
        if (cssClasses == null) {
            this.cssClasses = [WILDCARD_CLASS, getCssClassForWildcardType(wildcardType)]
        } else {
            this.cssClasses = cssClasses
        }
    }

    getType() {
        return this.wildcardType
    }

    getCssClasses() {
        return this.cssClasses
    }

    select() {
        this.isSelected = true
        this.cssClasses.push(WILDCARD_SELECTED_CLASS)
    }

    unselect() {
        this.isSelected = false
        let idx = this.cssClasses.indexOf(WILDCARD_SELECTED_CLASS)
        this.cssClasses.splice(idx, 1)
    }
}

function getCssClassForWildcardType(wildcardType) {
    switch (wildcardType) {
        case WILDCARD_ALL_TYPE:
            return WILDCARD_ALL_CLASS
        case WILDCARD_UNUSED_TYPE:
            return WILDCARD_UNUSED_CLASS
        case WILDCARD_CORRECT_TYPE:
            return WILDCARD_CORRECT_CLASS
        default:
            throw new Error(`Unknown wildcard type '${wildcardType}'`)
    }
}