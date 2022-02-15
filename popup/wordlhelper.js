
import {
    GET_LETTER_STATES_HEADER,
    GITHUB_PROJECT_URL,
    WORD_LIST_URL,
    ALPHABET,

    CORRECT,
    PRESENT,
    ABSENT
} from '../constants/constants.js'

import {
    WILDCARD_ID_ALL,
    WILDCARD_ID_UNUSED,
    WILDCARD_ID_CORRECT,

    WILDLETTER_ALL,
    WILDLETTER_UNUSED,

    CORRECT_CLASS,
    PRESENT_CLASS,
    UNUSED_CLASS,
    POTENTIAL_CLASS,
    SELECTED_CLASS,
    ALL_CLASS
} from '../constants/html-css-constants.js'

////////////////////////////////////
//////////////  MAIN  //////////////
////////////////////////////////////

const WILDCARDS = Array.from(document.getElementsByClassName("wildcard"))
const PRESENT_WILDCARDS = () => document.getElementsByClassName("present-wildcard-container")[0].children
const WILDWORD_LETTERS = Array.from(document.getElementsByClassName("wildword-letter"))

let wildcardSelected = null
var letterStates = null

setupEventListeners()

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log(`sending message with header '${GET_LETTER_STATES_HEADER}' to tab id '${tabs[0].id}'`)

    chrome.tabs.sendMessage(tabs[0].id, {header: GET_LETTER_STATES_HEADER}, async function(response) {
        if (chrome.runtime.lastError || typeof response == 'undefined') {
            console.log(`an error occurred, probably because the content script is not injected (because the current tab is not Wordle); proceeding with error message load up`)
            document.getElementById("error").hidden = false
            return
        }

        await loadWordList()

        console.log(`received positive response for '${GET_LETTER_STATES_HEADER}' message, proceeding with popup load up`)
        letterStates = response.letterStates
        await addPresentWildcardsToUI()

        await loadWildword()
        updateFilteredWords()
    })
})

////////////////////////////////////
//////  Event Listener Setup  //////
////////////////////////////////////

function setupEventListeners() {
    setupGitHubEventListener()
    setupWildcardsEventListener()
    setupDocumentEventListener()
    setupResetWildwordEventListener()
}

function setupGitHubEventListener() {
    document.getElementById("github-image").onclick = function() {
        window.open(GITHUB_PROJECT_URL)
        window.close()
    }
}

function setupWildcardsEventListener() {
    WILDCARDS.forEach(wildcard => wildcard.onclick = wildcardClicked)
    WILDWORD_LETTERS.forEach(letter => letter.onclick = wildwordLetterClicked)
}

function setupDocumentEventListener() {
    document.onclick = function(event) {
        if (WILDCARDS.every(wildcard => wildcard.id != event.target.id)) {
            if (wildcardSelected != null) {
                wildcardSelected.classList.toggle(SELECTED_CLASS)
                wildcardSelected = null
                updateWildwordLetters()
            }
        }
    }
}

function setupResetWildwordEventListener() {
    document.getElementById("trashcan-button").onclick = function() {
        WILDWORD_LETTERS.forEach(wildwordLetter => {
            wildwordLetter.classList = `wildword-letter ${ALL_CLASS}`
            wildwordLetter.children[0].innerText = WILDLETTER_ALL
        })
        saveWildword()
        updateFilteredWords()
    }
}

////////////////////////////////////
////////  Word List Setup  /////////
////////////////////////////////////

async function loadWordList() {
    document.getElementById("loading").hidden = false

    let start = new Date().getUTCMilliseconds()
    
    let p = new Promise(resolve => {
        chrome.storage.local.get("wordList", function(result) {
            if (result.wordList == null) {
                fetch(WORD_LIST_URL).then(r => r.text()).then(t => {
                    let wordList = t.split("\n")
                    chrome.storage.local.set({wordList}, () => {
                        console.log("loaded and stored 'wordList'")
                        resolve(1)
                    })
                })
            } else {
                console.log("'wordList' has already been loaded")
                resolve(0)
            }
        })
    })
    
    let isAlreadyLoaded = await p.then(result => {
        return result == 0
    })

    if (!isAlreadyLoaded) {
        let time = new Date().getUTCMilliseconds() - start
        let waitTime = Math.max(0, 2000 - time)
        await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    document.getElementById("loading").hidden = true
    document.getElementById("helper").hidden = false
}

////////////////////////////////////
//  Wildcards & Wildword Storage  //
////////////////////////////////////

function isOutdated(lastModified) {
    var todayDay = new Date()
    todayDay.setHours(0, 0, 0, 0)
    var lastModifiedDay = new Date(lastModified)
    lastModifiedDay.setHours(0, 0, 0, 0)
    return todayDay.toUTCString() != lastModifiedDay.toUTCString()
}

function saveWildword() {
    let wildword = {
        positions: {},
        lastModified: new Date().toUTCString()
    }

    for (let i = 0; i < WILDWORD_LETTERS.length; ++i) {
        wildword["positions"][i] = {
            "classListValues": Array.from(WILDWORD_LETTERS[i].classList.values()).join(" "),
            "letter": WILDWORD_LETTERS[i].children[0].innerText
        }
    }
    
    return new Promise(resolve => {
        chrome.storage.local.set({wildword}, () => {
            console.log("saved wildword state to storage")
            resolve()
        })
    })
}

function loadWildword() {
    return new Promise(resolve => {
        chrome.storage.local.get("wildword", function(result) {
            if (result.wildword != null && Object.entries(letterStates).length > 0 && !isOutdated(result.wildword.lastModified)) {
                for (let [position, data] of Object.entries(result.wildword.positions)) {
                    WILDWORD_LETTERS[position].classList = ""
                    data["classListValues"].split(" ").forEach(cls => WILDWORD_LETTERS[position].classList.add(cls))
                    WILDWORD_LETTERS[position].children[0].innerText = data["letter"]
                }
                console.log("loading wildword state from storage")
            } else if (result.wildword != null && (Object.entries(letterStates).length == 0 || isOutdated(result.wildword.lastModified))) {
                let wildword = {}
                chrome.storage.local.set({wildword}, () => console.log("reset wildword in storage"))
            } else {
                console.log("did not find wildword state in storage")
            }

            resolve()
        })
    })
}

function savePresentWildcardToggleState(event) {
    let letter = event.target.parentNode.parentNode.children[0].children[0].innerText.toLowerCase()
    let value = event.target.checked

    return new Promise(resolve => {
        chrome.storage.local.get("presentLetters", function(result) {
            let presentLetters = {
                letters: {},
                lastModified: new Date().toUTCString()
            }

            if (result.presentLetters != null) {
                console.log(`found 'presentLetters' in storage`)
                result.presentLetters.letters[letter] = value
                presentLetters.letters = result.presentLetters.letters
            } else {
                console.log(`did not find 'presentLetters' in storage, creating it`)
                presentLetters.letters[letter] = value
            }
            
            chrome.storage.local.set({presentLetters}, () => {
                console.log(`stored toggle switch value of '${letter}' to '${value}'`)
                resolve()
            })
        })
    })
}

async function loadPresentWildcardToggleState(letter) {
    return new Promise(resolve => {
        chrome.storage.local.get("presentLetters", function(result) {
            if (result.presentLetters != null && !isOutdated(result.presentLetters.lastModified) && letter in result.presentLetters.letters) {
                console.log(`found toggle switch value for '${letter}': '${result.presentLetters.letters[letter]}'`)
                resolve(result.presentLetters.letters[letter])
            } else {
                console.log(`did not find toggle switch value for '${letter}'`)
                resolve(false)
            }
        })
    })
}

//////////////////////////////////////
//  Wildcard & Wildword Logic & UI  //
//////////////////////////////////////

async function addPresentWildcardsToUI() {
    let presentWildcardContainer = document.getElementsByClassName("present-wildcard-container")[0]

    for (let [letter, value] of Object.entries(letterStates)) {
        if (value == ABSENT) {
            continue
        }

        if (PRESENT in value) {
            // load switch value (if present in storage)
            let checkedValue = await loadPresentWildcardToggleState(letter).then(value => {
                return value
            })

            // overall wildcard container element
            let wildcardContainerElement = document.createElement("div")
            wildcardContainerElement.classList = "wildcard-container"

            presentWildcardContainer.appendChild(wildcardContainerElement)

            // wildcard letter "icon"
            let presentWildcardDivElement = document.createElement("div")
            presentWildcardDivElement.classList = `wildcard ${PRESENT_CLASS}`

            let presentWildcardLabelElement = document.createElement("div")
            presentWildcardLabelElement.classList = "wildcard-label"
            let label = document.createTextNode(letter)

            presentWildcardLabelElement.appendChild(label)
            presentWildcardDivElement.appendChild(presentWildcardLabelElement)
            wildcardContainerElement.appendChild(presentWildcardDivElement)
            
            // wildcard toggle switch
            let presentWildcardToggleSwitchElement = document.createElement("label")
            presentWildcardToggleSwitchElement.classList = "switch"

            let input = document.createElement("input")
            input.type = "checkbox"
            input.checked = checkedValue

            let span = document.createElement("span")
            span.classList = "slider round"

            presentWildcardToggleSwitchElement.appendChild(input)
            presentWildcardToggleSwitchElement.appendChild(span)
            wildcardContainerElement.appendChild(presentWildcardToggleSwitchElement)

            presentWildcardToggleSwitchElement.onclick = function(event) {
                if (typeof event.target.checked != 'undefined') {
                    savePresentWildcardToggleState(event)
                    updateFilteredWords()
                }
            }
        }
    }
}

function wildcardClicked(event) {
    console.log(`wildcard (id='${event.target.id}') clicked`)

    if (wildcardSelected != null) {
        wildcardSelected.classList.toggle(SELECTED_CLASS)

        if (event.target.id == wildcardSelected.id) {
            wildcardSelected = null
        } else {
            event.target.classList.toggle(SELECTED_CLASS)
            wildcardSelected = event.target
        }

        removeWildwordLettersPotential()
    } else { 
        var nonEmptyPotentialLetters = false

        if (event.target.classList.contains(ALL_CLASS)) {
            nonEmptyPotentialLetters = !WILDWORD_LETTERS.every(wildwordLetter => wildwordLetter.classList.contains(ALL_CLASS))
        } else if (event.target.classList.contains(UNUSED_CLASS)) {
            nonEmptyPotentialLetters = !WILDWORD_LETTERS.every(wildwordLetter => wildwordLetter.classList.contains(UNUSED_CLASS))
        } else if (event.target.classList.contains(PRESENT_CLASS)) {
            nonEmptyPotentialLetters = Object.values(letterStates).some(letterStateValues => letterStateValues != ABSENT && PRESENT in letterStateValues)
        } else if (event.target.classList.contains(CORRECT_CLASS)) {
            nonEmptyPotentialLetters = Object.values(letterStates).some(letterStateValues => letterStateValues != ABSENT && CORRECT in letterStateValues)
        } else {
            throw new Error("Expected a wildcard with either 'all', 'unused', 'present' or 'correct' in its in classList, but found none")
        }

        if (nonEmptyPotentialLetters) {
            event.target.classList.toggle(SELECTED_CLASS)
            wildcardSelected = event.target
        } else {
            console.log("there are no potential positions for that wildcard")
        }
    }

    updateWildwordLetters()
}

function wildwordLetterClicked(event) {
    console.log(`wildword-letter (id='${event.target.id}') clicked`)

    if (wildcardSelected == null) {
        console.log("no wildcard is selected")
        return
    }

    if (!event.target.classList.contains(POTENTIAL_CLASS)) {
        console.log("can't place wildcard here")
        return
    }

    event.target.classList.remove(POTENTIAL_CLASS)
    event.target.classList.remove(ALL_CLASS)
    event.target.classList.remove(UNUSED_CLASS)
    event.target.classList.remove(CORRECT_CLASS)

    switch (wildcardSelected.id) {
        case WILDCARD_ID_ALL:
            event.target.classList.add(ALL_CLASS)
            event.target.children[0].innerText = WILDLETTER_ALL
            break
        case WILDCARD_ID_UNUSED:
            event.target.classList.add(UNUSED_CLASS)
            event.target.children[0].innerText = WILDLETTER_UNUSED
            break
        case WILDCARD_ID_CORRECT:
            event.target.classList.add(CORRECT_CLASS)
            var wildwordLetterPosition = WILDWORD_LETTERS.findIndex(wildwordLetter => wildwordLetter.id == event.target.id)
            findAndSetCorrectLetterAtPosition(wildwordLetterPosition, event.target.children[0])
            break
    }

    wildcardSelected.classList.toggle(SELECTED_CLASS)
    wildcardSelected = null

    updateWildwordLetters()
    saveWildword()
    updateFilteredWords()
}

function removeWildwordLettersPotential() {
    WILDWORD_LETTERS.forEach(wildwordLetter => wildwordLetter.classList.remove(POTENTIAL_CLASS))
}

function addPotentialToWildwordLetterIfNot(wildwordLetterClassType) {
    WILDWORD_LETTERS.forEach(wildwordLetter => {
        if (!wildwordLetter.classList.contains(wildwordLetterClassType)) {
            wildwordLetter.classList.add(POTENTIAL_CLASS)
        }
    })
}

function updateWildwordLetters() {
    console.log("updating wildword letters")

    if (wildcardSelected == null) {
        console.log("no wildcard is selected, so we remove all 'potential'")
        removeWildwordLettersPotential()
    } else {
        switch (wildcardSelected.id) {
            case WILDCARD_ID_ALL:
                addPotentialToWildwordLetterIfNot(ALL_CLASS)
                break
                
            case WILDCARD_ID_UNUSED:
                addPotentialToWildwordLetterIfNot(UNUSED_CLASS)
                break

            case WILDCARD_ID_CORRECT:
                let correct_letters_positions = new Set()

                for (let [_, value] of Object.entries(letterStates)) {
                    if (value == ABSENT) {
                        continue
                    }

                    if (CORRECT in value) {
                        value[CORRECT].forEach(position => correct_letters_positions.add(position))
                    }
                }
                
                for (let position of correct_letters_positions) {
                    if (!WILDWORD_LETTERS[position].classList.contains(CORRECT_CLASS)) {
                        WILDWORD_LETTERS[position].classList.add(POTENTIAL_CLASS)
                    }
                }

                break
        }
    }
}

function findAndSetCorrectLetterAtPosition(position, element) {
    for (let [letter, value] of Object.entries(letterStates)) {
        if (value == ABSENT) {
            continue
        }

        if (CORRECT in value && value[CORRECT].includes(position)) {
            element.innerText = letter
            return
        }
    }

    throw new Error(`Couldn't find any correct letter at position ${position} even though there should be one`)
}

function getAllowedLettersAtPosition() {
    let allowed_letters_at_position = {}

    // add letters by looking at the wildword's wildcards
    for (let position = 0; position < WILDWORD_LETTERS.length; ++position) {
        let wildwordLetter = WILDWORD_LETTERS[position]

        if (wildwordLetter.children[0].innerText == WILDLETTER_ALL) {
            allowed_letters_at_position[position] = new Set(ALPHABET)
        } else if (wildwordLetter.children[0].innerText == WILDLETTER_UNUSED) {
            let unused_letters = new Set(ALPHABET)
            for (let [letter, value] of Object.entries(letterStates)) {
                if (value != ABSENT) {
                    unused_letters.delete(letter)
                }
            }
            allowed_letters_at_position[position] = unused_letters
        } else {
            let allowed_letters = Array.from(wildwordLetter.children[0].innerText).map(letter => letter.toLowerCase())
            allowed_letters_at_position[position] = new Set(allowed_letters)
        }
    }

    // look at the toggled PRESENT letters
    for (let presentWildcard of PRESENT_WILDCARDS()) {
        let checked = presentWildcard.children[1].children[0].checked
        if (checked) {
            let presentLetter = presentWildcard.children[0].children[0].innerText.toLowerCase()
            for (let [letter, value] of Object.entries(letterStates)) {
                if (value == ABSENT) {
                    continue
                }
                if (letter == presentLetter && PRESENT in value) {
                    for (let position of value[PRESENT]) {
                        allowed_letters_at_position[position].delete(letter)
                        console.log(`deleted letter '${letter}' from position ${position}`)
                    }
                }
            }
        }
    }

    return allowed_letters_at_position
}

function updateFilteredWords() {
    console.log("filtering words")

    let allowed_letters_at_position = getAllowedLettersAtPosition()

    chrome.storage.local.get("wordList", function(result) {
        if (result.wordList == null) {
            throw new Error("'wordList' should be present and loaded, but couldn't find it")
        }

        let filteredWords = result.wordList.filter(word => {
            // on the first pass, filter the words enforcing which letters are allowed

            if (word.length != 5) {
                return false
            }

            for (let position = 0; position < word.length; ++position) {
                if (!allowed_letters_at_position[position].has(word[position])) {
                    return false
                }
            }
            return true
        }).filter(word => {
            // on the second pass, filter the words taking into account the PRESENT wildcards

            for (let presentWildcard of PRESENT_WILDCARDS()) {
                let checked = presentWildcard.children[1].children[0].checked
                let letter = presentWildcard.children[0].children[0].innerText.toLowerCase()
                if (checked && !word.includes(letter)) {
                    return false
                }
            }
            return true
        })

        if (filteredWords.length > 0) {
            document.getElementById("possible-words-title").innerText = `${filteredWords.length} words match these wildcards`
        } else {
            document.getElementById("possible-words-title").innerText = "No words match these wildcards"
        }
        document.getElementById("possible-words-list").innerText = filteredWords.join("\n")
    })
}