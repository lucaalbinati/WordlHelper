import {
    GET_LETTER_STATES_HEADER,
    GITHUB_PROJECT_URL,
    WORD_LIST_URL
} from '../constants/constants.js'

import {
    WILDCARD_ID_ALL,
    WILDCARD_ID_UNUSED,
    WILDCARD_ID_CORRECT
} from '../constants/html-css-constants.js'

import {
    WILDCARD_ALL_TYPE,
    WILDCARD_CORRECT_TYPE,
    WILDCARD_UNUSED_TYPE
} from '../constants/state-constants.js'

import {
    State
} from '../model/state.js'

////////////////////////////////////
//////////////  MAIN  //////////////
////////////////////////////////////

document.getElementById("github-image").onclick = function() {
    window.open(GITHUB_PROJECT_URL)
    window.close()
}

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log(`sending message with header '${GET_LETTER_STATES_HEADER}' to tab id '${tabs[0].id}'`)

    chrome.tabs.sendMessage(tabs[0].id, {header: GET_LETTER_STATES_HEADER}, async function(response) {
        if (chrome.runtime.lastError || typeof response == 'undefined') {
            console.log(`an error occurred, probably because the content script is not injected (because the current tab is not Wordle); proceeding with error message load up`)
            document.getElementById("error").hidden = false
            return
        }

        console.log(`received positive response for '${GET_LETTER_STATES_HEADER}' message, proceeding with popup load up`)
        
        let wordList = await loadWordList()
        let letterStates = response.letterStates
        let state = new State(letterStates, wordList, onUpdateUICallback)

        await state.loadFromStorage()

        setupUI(state)
        onUpdateUICallback(state)
    })
})

////////////////////////////////////
////////  Word List Setup  /////////
////////////////////////////////////

async function loadWordList() {
    console.log(`loading word list for the first time`)
    document.getElementById("loading").hidden = false

    let start = new Date().getUTCMilliseconds()
    
    let p = new Promise(resolve => {
        chrome.storage.local.get("wordList", function(result) {
            if (result.wordList == null) {
                fetch(WORD_LIST_URL).then(r => r.text()).then(t => {
                    let wordList = t.split("\n").filter(word => word.length == 5)
                    chrome.storage.local.set({wordList}, () => {
                        console.log("loaded and stored 'wordList'")
                        resolve({"wordList": wordList, "wasAlreadyLoaded": false})
                    })
                })
            } else {
                console.log("'wordList' has already been loaded")
                resolve({"wordList": result.wordList, "wasAlreadyLoaded": true})
            }
        })
    })
    
    let wordListObj = await p.then(result => {
        return result
    })

    if (!wordListObj["wasAlreadyLoaded"]) {
        let time = new Date().getUTCMilliseconds() - start
        let waitTime = Math.max(0, 2000 - time)
        await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    document.getElementById("loading").hidden = true
    document.getElementById("helper").hidden = false

    return wordListObj["wordList"]
}

////////////////////////////////////
///////////  Setup UI  /////////////
////////////////////////////////////

function setupUI(state) {
    setupDocumentEventListener(state)
    setupResetWildwordEventListener(state)

    setupWildcardsUI(state)
    setupWildwordUI(state)
    // setupFilteredWordListUI(state)
}


function setupDocumentEventListener(state) {
    document.onclick = () => {
        console.log(`clicked outside of a wildcard`)
        state.unselectWildcard()
    }
}

function setupResetWildwordEventListener(state) {
    document.getElementById("trashcan-button").onclick = function() {
        state.resetWildword()
    }
}

function setupWildcardsUI(state) {
    setupPermanentWildcardsUI(state)
    setupPresentWildcardsUI(state)
}

function setupPermanentWildcardsUI(state) {
    document.getElementById(WILDCARD_ID_ALL).onclick = (event) => wildcardClicked(event, state)
    document.getElementById(WILDCARD_ID_UNUSED).onclick = (event) => wildcardClicked(event, state)
    document.getElementById(WILDCARD_ID_CORRECT).onclick = (event) => wildcardClicked(event, state)
}

function setupPresentWildcardsUI(state) {
    state.getPresentWildcards().forEach(presentWildcard => createPresentWildcardElements(presentWildcard, state))
}

function createPresentWildcardElements(presentWildcard, state) {
    let presentWildcardContainer = document.getElementsByClassName("present-wildcard-container")[0]
    let letter = presentWildcard.getLetter()

    // overall wildcard container element
    let wildcardContainerElement = document.createElement("div")
    wildcardContainerElement.classList = "wildcard-container"

    presentWildcardContainer.appendChild(wildcardContainerElement)

    // wildcard letter "icon"
    let presentWildcardDivElement = document.createElement("div")
    presentWildcardDivElement.classList = presentWildcard.getCssClasses().join(" ")

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
    input.id = `present-wildcard-${letter}-value`
    input.type = "checkbox"
    input.checked = presentWildcard.isToggled()

    let span = document.createElement("span")
    span.classList = "slider round"

    presentWildcardToggleSwitchElement.appendChild(input)
    presentWildcardToggleSwitchElement.appendChild(span)
    wildcardContainerElement.appendChild(presentWildcardToggleSwitchElement)

    presentWildcardToggleSwitchElement.onclick = (event) => presentWildcardToggleSwitchClicked(event, state)
}

function setupWildwordUI(state) {
    for (let [position, _] of Object.entries(state.getWildword().getWildwordLetters())) {
        document.getElementById(`wildword-letter-${position}`).onclick = (event) => wildwordLetterClicked(event, state)
    }
}

////////////////////////////////////
///////////  Update UI  ////////////
////////////////////////////////////

function onUpdateUICallback(state) {
    console.log("UI callback called, updating UI")

    updateWildcardUI(state)
    updatePresentWildcardUI(state)
    updateWildwordUI(state)
    updateFilteredWordListUI(state)
}

function updateWildcardUI(state) {
    document.getElementById(WILDCARD_ID_ALL).classList = state.getAllWildcard().getCssClasses().join(" ")
    document.getElementById(WILDCARD_ID_UNUSED).classList = state.getUnusedWildcard().getCssClasses().join(" ")
    document.getElementById(WILDCARD_ID_CORRECT).classList = state.getCorrectWildcard().getCssClasses().join(" ")
}

function updatePresentWildcardUI(state) {
    console.log("updating present wildcards UI")
    for (let presentWildcard of state.getPresentWildcards()) {
        document.getElementById(`present-wildcard-${presentWildcard.getLetter()}-value`).checked = presentWildcard.isToggled()
    }
}

function updateWildwordUI(state) {
    for (let [position, wildwordLetter] of Object.entries(state.getWildword().getWildwordLetters())) {
        document.getElementById(`wildword-letter-${position}`).classList = wildwordLetter.getCssClasses().join(" ")
        document.getElementById(`wildword-letter-label-${position}`).innerText = wildwordLetter.getLetter()
    }
}

function updateFilteredWordListUI(state) {
    let wordListLength = state.getFilteredWordList().length
    if (wordListLength > 0) {
        document.getElementById("possible-words-title").innerText = `${wordListLength} words match these wildcards`
    } else {
        document.getElementById("possible-words-title").innerText = "No words match these wildcards"
    }
    document.getElementById("possible-words-list").innerText = state.getFilteredWordList().join("\n")
}

////////////////////////////////////////////
//  Wildcards & Wildword Event Listeners  //
////////////////////////////////////////////

function wildcardClicked(event, state) {
    console.log(`wildcard (id='${event.target.id}') clicked`)

    switch (event.target.id) {
        case WILDCARD_ID_ALL:
            state.selectWildcard(WILDCARD_ALL_TYPE)
            break
        case WILDCARD_ID_UNUSED:
            state.selectWildcard(WILDCARD_UNUSED_TYPE)
            break
        case WILDCARD_ID_CORRECT:
            state.selectWildcard(WILDCARD_CORRECT_TYPE)
            break
    }

    event.stopPropagation()
}

function presentWildcardToggleSwitchClicked(event, state) {
    if (typeof event.target.checked == 'undefined') {
        return
    }

    let letter = event.target.parentElement.parentElement.children[0].children[0].innerText.toLowerCase()
    console.log(`present wildcard '${letter.toUpperCase()}' clicked`)
    state.togglePresentWildcard(letter)
    event.stopPropagation()
}

function wildwordLetterClicked(event, state) {
    console.log(`wildword letter (id='${event.target.id}') clicked`)
    let position = event.target.id.match(/\d+/)[0]    
    state.selectWildwordLetter(position)
    event.stopPropagation()
}