
////////////////////////////////////
///////////  Constants  ////////////
////////////////////////////////////

const WORDLE_URL = "powerlanguage.co.uk/wordle"
const GITHUB_PROJECT_URL = "https://github.com/lucaalbinati/WordlHelper"
const WORD_LIST_URL = "https://raw.githubusercontent.com/lucaalbinati/WordlHelper/main/words-sorted-by-frequency.txt"

const WILDCARDS = Array.from(document.getElementsByClassName("wildcard"))
const WILDWORD_LETTERS = Array.from(document.getElementsByClassName("wildword-letter"))

const WILDCARD_ALL = "wildcard-all"
const WILDCARD_UNUSED = "wildcard-unused"
const WILDCARD_PRESENT = "wildcard-present"
const WILDCARD_CORRECT = "wildcard-correct"

let wildcardSelected = null

var letterStates = null

////////////////////////////////////
//////////////  MAIN  //////////////
////////////////////////////////////

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, async function (tabs) {
    var url = tabs[0].url
    
    setupEventListeners()

    if (url.includes(WORDLE_URL)) {
        document.getElementById("error").hidden = true
        await Promise.all([loadWordList(), updateLetterStates(), loadWildword()])
        updateFilteredWords()
    } else {
        document.getElementById("helper").hidden = true
    }
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
            wildwordLetter.children[0].innerText = "*"
        })
        saveWildword()
        updateFilteredWords()
    }
}

////////////////////////////////////
//////  Update Letter States  //////
////////////////////////////////////

function updateLetterStates() {
    return new Promise(resolve => {
        chrome.storage.local.get("letter_states", function(result) {
            console.log("updated 'letterStates'")
            letterStates = result.letter_states
            resolve()
        })
    })
}

////////////////////////////////////
////////  Word List Setup  /////////
////////////////////////////////////

function loadWordList() {
    return new Promise(resolve => {
        chrome.storage.local.get("wordList", function(result) {
            if (result.wordList == null) {
                let textUrl = WORD_LIST_URL

                fetch(textUrl).then(r => r.text()).then(t => {
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
            if (result.wildword != null) {
                for (let [position, data] of Object.entries(result.wildword)) {
                    WILDWORD_LETTERS[position].classList = ""
                    data["classListValues"].split(" ").forEach(cls => WILDWORD_LETTERS[position].classList.add(cls))
                    WILDWORD_LETTERS[position].children[0].innerText = data["letter"]
                }
                console.log("loading wildword state from storage")
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

async function wildcardClicked(event) {
    console.log(`wildcard (id='${event.target.id}') clicked`)

    await updateLetterStates()

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
    event.target.classList.remove("present")
    event.target.classList.remove("correct")

    switch (wildcardSelected.id) {
        case WILDCARD_ALL:
            event.target.classList.add("all")
            event.target.children[0].innerText = "*"
            break
        case WILDCARD_UNUSED:
            event.target.classList.add("unused")
            event.target.children[0].innerText = "?"
            break
        case WILDCARD_PRESENT:
            event.target.classList.add("present")
            var wildwordLetterPosition = WILDWORD_LETTERS.findIndex(wildwordLetter => wildwordLetter.id == event.target.id)
            findAndSetPresentLettersAtPosition(wildwordLetterPosition, event.target.children[0])
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
            
            case WILDCARD_PRESENT:
                let present_letters_positions = new Set()

                for (let [_, value] of Object.entries(letterStates)) {
                    if (value == "absent") {
                        continue
                    }

                    if ("present" in value) {
                        value["present"].forEach(position => {
                            [0, 1, 2, 3, 4].filter(p => p != position).forEach(pos => present_letters_positions.add(pos))
                        })
                    }
                }

                for (let position of present_letters_positions) {
                    if (!WILDWORD_LETTERS[position].classList.contains("present")) {
                        WILDWORD_LETTERS[position].classList.add("potential")
                    }
                }

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

function findAndSetPresentLettersAtPosition(position, element) {
    var present_letters = new Set()

    for (let [letter, value] of Object.entries(letterStates)) {
        if (value == "absent") {
            continue
        }

        if ("present" in value && !value["present"].includes(position)) {
            present_letters.add(letter)
        }
    }

    present_letters = Array.from(present_letters)

    if (present_letters.length == 0) {
        throw new Error(`Couldn't find any present letter at position ${position} even though there should be one (at least)`)
    }
    
    element.innerText = present_letters.join("")
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

function updateFilteredWords() {
    console.log("filtering words")

    let alphabet = Array.from("abcdefghijklmnopqrstuvwxyz")

    let allowed_letters_at_position = {}
    for (let position = 0; position < WILDWORD_LETTERS.length; ++position) {
        let wildwordLetter = WILDWORD_LETTERS[position]

        if (wildwordLetter.children[0].innerText == "*") {
            allowed_letters_at_position[position] = new Set(alphabet)
        } else if (wildwordLetter.children[0].innerText == "?") {
            let unused_letters = new Set(alphabet)
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

    chrome.storage.local.get("wordList", function(result) {
        if (result.wordList == null) {
            throw new Error("'wordList' should be present and loaded, but couldn't find it")
        }

        let filteredWords = result.wordList.filter(word => {
            if (word.length != 5) {
                return false
            }

            for (let position = 0; position < word.length; ++position) {
                if (!allowed_letters_at_position[position].has(word[position])) {
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