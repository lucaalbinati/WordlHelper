
////////////////////////////////////
///////////  Constants  ////////////
////////////////////////////////////

const GET_LETTER_STATES_HEADER = "getLetterStates"

const GITHUB_PROJECT_URL = "https://github.com/lucaalbinati/WordlHelper"
const WORD_LIST_URL = "https://raw.githubusercontent.com/lucaalbinati/WordlHelper/main/words-sorted-by-frequency.txt"

const ALPHABET = Array.from("abcdefghijklmnopqrstuvwxyz")

const WILDCARDS = Array.from(document.getElementsByClassName("wildcard"))
const PRESENT_WILDCARDS = () => document.getElementsByClassName("present-wildcard-container")[0].children
const WILDWORD_LETTERS = Array.from(document.getElementsByClassName("wildword-letter"))

const WILDCARD_ALL = "wildcard-all"
const WILDCARD_UNUSED = "wildcard-unused"
const WILDCARD_PRESENT = "wildcard-present"
const WILDCARD_CORRECT = "wildcard-correct"

const WILDLETTER_ALL = "✽"
const WILDLETTER_UNUSED = "?"

let wildcardSelected = null

var letterStates = null

////////////////////////////////////
//////////////  MAIN  //////////////
////////////////////////////////////

setupEventListeners()

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log(`sending message with header '${GET_LETTER_STATES_HEADER}' to tab id '${tabs[0].id}'`)

    chrome.tabs.sendMessage(tabs[0].id, {header: GET_LETTER_STATES_HEADER}, async function(response) {
        if (chrome.runtime.lastError || typeof response == 'undefined') {
            console.log(`an error occurred, probably because the content script is not injected (because the current tab is not Wordle); proceeding with error message load up`)
            document.getElementById("error").hidden = false
            return
        }

        document.getElementById("loading").hidden = false
        await loadWordList()
        document.getElementById("loading").hidden = true
        document.getElementById("helper").hidden = false

        console.log(`received positive response for '${GET_LETTER_STATES_HEADER}' message, proceeding with popup load up`)
        letterStates = response.letterStates
        addPresentWildcardsToUI()

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
                wildcardSelected.classList.toggle("selected")
                wildcardSelected = null
                updateWildwordLetters()
            }
        }
    }
}

function setupResetWildwordEventListener() {
    document.getElementById("trashcan-button").onclick = function() {
        WILDWORD_LETTERS.forEach(wildwordLetter => {
            wildwordLetter.classList = "wildword-letter all"
            wildwordLetter.children[0].innerText = WILDLETTER_ALL
        })
        saveWildword()
        updateFilteredWords()
    }
}

////////////////////////////////////
////////  Word List Setup  /////////
////////////////////////////////////

function loadWordList() {
    return new Promise(resolve => {
        chrome.storage.local.get("wordList", function(result) {
            if (result.wordList == null) {
                fetch(WORD_LIST_URL).then(r => r.text()).then(t => {
                    let wordList = t.split("\n")
                    chrome.storage.local.set({wordList}, () => {
                        console.log("loaded and stored 'wordList'")
                        resolve()
                    })
                })
            } else {
                console.log("'wordList' has already been loaded")
                resolve()
            }
        })
    })
}

////////////////////////////////////
////////  Wildword Storage  ////////
////////////////////////////////////

function saveWildword() {
    return new Promise(resolve => {
        let wildword = {}

        for (let i = 0; i < WILDWORD_LETTERS.length; ++i) {
            wildword[i] = {
                "classListValues": Array.from(WILDWORD_LETTERS[i].classList.values()).join(" "),
                "letter": WILDWORD_LETTERS[i].children[0].innerText
            }
        }

        chrome.storage.local.set({wildword}, () => {
            console.log("saved wildword state to storage")
            resolve()
        })
    })
}

function loadWildword() {
    return new Promise(resolve => {
        chrome.storage.local.get("wildword", function(result) {
            if (result.wildword != null && Object.entries(letterStates).length > 0) {
                for (let [position, data] of Object.entries(result.wildword)) {
                    WILDWORD_LETTERS[position].classList = ""
                    data["classListValues"].split(" ").forEach(cls => WILDWORD_LETTERS[position].classList.add(cls))
                    WILDWORD_LETTERS[position].children[0].innerText = data["letter"]
                }
                console.log("loading wildword state from storage")
            } else if (result.wildword != null && Object.entries(letterStates).length == 0) {
                let wildword = {}
                chrome.storage.local.set({wildword}, () => console.log("reset wildword in storage"))
            } else {
                console.log("did not find wildword state in storage")
            }

            resolve()
        })
    })
}

//////////////////////////////////////
//  Wildcard & Wildword Logic & UI  //
//////////////////////////////////////

function addPresentWildcardsToUI() {
    let presentWildcardContainer = document.getElementsByClassName("present-wildcard-container")[0]

    for (let [letter, value] of Object.entries(letterStates)) {
        if (value == "absent") {
            continue
        }

        if ("present" in value) {
            let wildcardContainerElement = document.createElement("div")
            wildcardContainerElement.classList = "wildcard-container"

            let presentWildcardDivElement = document.createElement("div")
            presentWildcardDivElement.classList = "wildcard present"

            let presentWildcardLabelElement = document.createElement("div")
            presentWildcardLabelElement.classList = "wildcard-label"
            let label = document.createTextNode(letter)
            
            let template = document.createElement("template")
            template.innerHTML = '<label class="switch"><input type="checkbox"><span class="slider round"></span></label>'.trim()
            let presentWildcardToggleSwitchElement = template.content.firstChild            
            
            presentWildcardLabelElement.appendChild(label)
            presentWildcardDivElement.appendChild(presentWildcardLabelElement)
            wildcardContainerElement.appendChild(presentWildcardDivElement)
            wildcardContainerElement.appendChild(presentWildcardToggleSwitchElement)

            presentWildcardContainer.appendChild(wildcardContainerElement)

            presentWildcardToggleSwitchElement.onclick = function(event) {
                // saveToggleStates() TODO
                updateFilteredWords()
            }
        }
    }
}

function wildcardClicked(event) {
    console.log(`wildcard (id='${event.target.id}') clicked`)

    if (wildcardSelected != null) {
        wildcardSelected.classList.toggle("selected")

        if (event.target.id == wildcardSelected.id) {
            wildcardSelected = null
        } else {
            event.target.classList.toggle("selected")
            wildcardSelected = event.target
        }

        removeWildwordLettersPotential()
    } else { 
        var nonEmptyPotentialLetters = false

        if (event.target.classList.contains("all")) {
            nonEmptyPotentialLetters = !WILDWORD_LETTERS.every(wildwordLetter => wildwordLetter.classList.contains("all"))
        } else if (event.target.classList.contains("unused")) {
            nonEmptyPotentialLetters = !WILDWORD_LETTERS.every(wildwordLetter => wildwordLetter.classList.contains("unused"))
        } else if (event.target.classList.contains("present")) {
            nonEmptyPotentialLetters = Object.values(letterStates).some(letterStateValues => letterStateValues != "absent" && "present" in letterStateValues)
        } else if (event.target.classList.contains("correct")) {
            nonEmptyPotentialLetters = Object.values(letterStates).some(letterStateValues => letterStateValues != "absent" && "correct" in letterStateValues)
        } else {
            throw new Error("Expected a wildcard with either 'all', 'unused', 'present' or 'correct' in its in classList, but found none")
        }

        if (nonEmptyPotentialLetters) {
            event.target.classList.toggle("selected")
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

    if (!event.target.classList.contains("potential")) {
        console.log("can't place wildcard here")
        return
    }

    event.target.classList.remove("potential")
    event.target.classList.remove("all")
    event.target.classList.remove("unused")
    event.target.classList.remove("correct")

    switch (wildcardSelected.id) {
        case WILDCARD_ALL:
            event.target.classList.add("all")
            event.target.children[0].innerText = WILDLETTER_ALL
            break
        case WILDCARD_UNUSED:
            event.target.classList.add("unused")
            event.target.children[0].innerText = WILDLETTER_UNUSED
            break
        case WILDCARD_CORRECT:
            event.target.classList.add("correct")
            var wildwordLetterPosition = WILDWORD_LETTERS.findIndex(wildwordLetter => wildwordLetter.id == event.target.id)
            findAndSetCorrectLetterAtPosition(wildwordLetterPosition, event.target.children[0])
            break
    }

    wildcardSelected.classList.toggle("selected")
    wildcardSelected = null

    updateWildwordLetters()
    saveWildword()
    updateFilteredWords()
}

function removeWildwordLettersPotential() {
    WILDWORD_LETTERS.forEach(wildwordLetter => wildwordLetter.classList.remove("potential"))
}

function addPotentialToWildwordLetterIfNot(wildwordLetterType) {
    WILDWORD_LETTERS.forEach(wildwordLetter => {
        if (!wildwordLetter.classList.contains(wildwordLetterType)) {
            wildwordLetter.classList.add("potential")
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
            case WILDCARD_ALL:
                addPotentialToWildwordLetterIfNot("all")
                break
                
            case WILDCARD_UNUSED:
                addPotentialToWildwordLetterIfNot("unused")
                break

            case WILDCARD_CORRECT:
                let correct_letters_positions = new Set()

                for (let [_, value] of Object.entries(letterStates)) {
                    if (value == "absent") {
                        continue
                    }

                    if ("correct" in value) {
                        value["correct"].forEach(position => correct_letters_positions.add(position))
                    }
                }
                
                for (let position of correct_letters_positions) {
                    if (!WILDWORD_LETTERS[position].classList.contains("correct")) {
                        WILDWORD_LETTERS[position].classList.add("potential")
                    }
                }

                break
        }
    }
}

function findAndSetCorrectLetterAtPosition(position, element) {
    for (let [letter, value] of Object.entries(letterStates)) {
        if (value == "absent") {
            continue
        }

        if ("correct" in value && value["correct"].includes(position)) {
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
                if (value != "asbent") {
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
            console.log(`checked for ${presentLetter}`)
            for (let [letter, value] of Object.entries(letterStates)) {
                if (value == "asbent") {
                    continue
                }
                if (letter == presentLetter && "present" in value) {
                    for (let position of value["present"]) {
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