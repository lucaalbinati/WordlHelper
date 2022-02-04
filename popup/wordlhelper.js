
////////////////////////////////////
///////////  Constants  ////////////
////////////////////////////////////

const WILDCARDS = Array.from(document.getElementsByClassName("wildcard"))
const WILDWORD_LETTERS = Array.from(document.getElementsByClassName("wildword-letter"))

const WILDCARD_ALL = "wildcard-all"
const WILDCARD_UNKNOWN = "wildcard-unknown"
const WILDCARD_PRESENT = "wildcard-present"
const WILDCARD_CORRECT = "wildcard-correct"

let wildcardSelected = null

////////////////////////////////////
//////////////  MAIN  //////////////
////////////////////////////////////

var b = null

if (navigator.userAgent.includes("Chrome")) {
    b = chrome
    console.log("Recognized Chrome browser")
} else if (navigator.userAgent.includes("Firefox")) {
    b = browser
    console.log("Recognized Firefox browser")
}

b.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var url = tabs[0].url
    
    setupEventListeners()

    if (url.includes("powerlanguage.co.uk/wordle")) {
        document.getElementById("error").hidden = true
        loadWordList()
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
}

function setupGitHubEventListener() {
    document.getElementById("github-image").onclick = function() {
        window.open("https://github.com/lucaalbinati/WordlHelper")
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

////////////////////////////////////
////////  Word List Setup  /////////
////////////////////////////////////

function loadWordList() {
    b.storage.local.get("wordList", function(result) {
        if (result.wordList == null) {
            let textUrl = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"

            fetch(textUrl).then(r => r.text()).then(t => {
                let wordList = t.split("\r\n").filter(w => w.length == 5)
                b.storage.local.set({wordList}, () => console.log("loaded and stored 'wordList'"))
            })
        } else {
            console.log("'wordList' has already been loaded")
        }
    })
}

//////////////////////////////////////
//  Wildcard & Wildword Logic & UI  //
//////////////////////////////////////

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
        event.target.classList.toggle("selected")
        wildcardSelected = event.target
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
    event.target.classList.remove("unknown")
    event.target.classList.remove("present")
    event.target.classList.remove("correct")

    switch (wildcardSelected.id) {
        case WILDCARD_ALL:
            event.target.classList.add("all")
            event.target.children[0].innerText = "*"
            break
        case WILDCARD_UNKNOWN:
            event.target.classList.add("unknown")
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
                
            case WILDCARD_UNKNOWN:
                addPotentialToWildwordLetterIfNot("unknown")
                break
            
            case WILDCARD_PRESENT:
                b.storage.sync.get("letter_states", function(result) {
                    console.log(result.letter_states)

                    let present_letters_positions = new Set()

                    for (let [_, value] of Object.entries(result.letter_states)) {
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
                })

                break

            case WILDCARD_CORRECT:
                b.storage.sync.get("letter_states", function(result) {
                    console.log(result.letter_states)

                    let correct_letters_positions = new Set()

                    for (let [_, value] of Object.entries(result.letter_states)) {
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
                })

                break
        }
    }
}

function findAndSetPresentLettersAtPosition(position, element) {
    b.storage.sync.get("letter_states", function(result) {
        var present_letters = new Set()

        for (let [letter, value] of Object.entries(result.letter_states)) {
            if (value == "absent") {
                continue
            }

            if ("present" in value && !value["present"].includes(position)) {
                present_letters.add(letter)
            }
        }

        present_letters = Array.from(present_letters)
        console.log(present_letters)

        if (present_letters.length == 0) {
            throw new Error(`Couldn't find any present letter at position ${position} even though there should be one (at least)`)
        }
        
        element.innerText = present_letters.join("")
    })
}

function findAndSetCorrectLetterAtPosition(position, element) {
    b.storage.sync.get("letter_states", function(result) {
        for (let [letter, value] of Object.entries(result.letter_states)) {
            if (value == "absent") {
                continue
            }

            if ("correct" in value && value["correct"].includes(position)) {
                element.innerText = letter
                return
            }
        }

        throw new Error(`Couldn't find any correct letter at position ${position} even though there should be one`)
    })
}