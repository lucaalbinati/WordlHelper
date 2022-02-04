
console.log("in here")

////////////////////////////////////
///////////  Constants  ////////////
////////////////////////////////////

const WILDCARDS = Array.from(document.getElementsByClassName("wildcard"))
const WILDWORD_LETTERS = Array.from(document.getElementById("wildword-letters").children)

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
        if (WILDCARDS.all(wildcard => wildcard.id != event.target.id)) {
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
    console.log("wildcard clicked")

    if (wildcardSelected != null) {
        wildcardSelected.classList.toggle("selected")

        if (event.target.id == wildcardSelected.id) {
            wildcardSelected = null
        } else {
            event.target.classList.toggle("selected")
            wildcardSelected = event.target
        }
    } else {
        event.target.classList.toggle("selected")
        wildcardSelected = event.target
    }

    updateWildwordLetters()
}

function updateWildwordLetters() {
    console.log("updating wildword letters")

    if (wildcardSelected == null) {
        WILDWORD_LETTERS.forEach(wildwordLetter => {
            if (!wildwordLetter.classList.contains("full")) {
                wildwordLetter.classList = "wildword-letter empty"
                wildwordLetter.children[0].innerText = ""
            } else {
                console.log(wildwordLetter)
            }
        })
    } else {
        switch (wildcardSelected.id) {
            case WILDCARD_ALL:
            case WILDCARD_UNKNOWN:
                WILDWORD_LETTERS.forEach(wildwordLetter => {
                    wildwordLetter.classList.remove("empty")
                    wildwordLetter.classList.add("potential")
                })
                break
            
            case WILDCARD_PRESENT:
                b.storage.sync.get("letter_states", function(result) {
                    console.log(result.letter_states)

                    let present_letters_positions = new Set()

                    for (let [letter, value] of Object.entries(result.letter_states)) {
                        if (value == "absent") {
                            continue
                        }

                        if ("present" in value) {
                            value["present"].forEach(position => present_letters_positions.add(position))
                        }
                    }

                    for (let position of present_letters_positions) {
                        WILDWORD_LETTERS[position].classList.add("potential")
                    }
                })

                break

            case WILDCARD_CORRECT:
                b.storage.sync.get("letter_states", function(result) {
                    console.log(result.letter_states)

                    let letter_at_positions = {}

                    for (let [letter, value] of Object.entries(result.letter_states)) {
                        if (value == "absent") {
                            continue
                        }

                        if ("correct" in value) {
                            value["correct"].forEach(position => letter_at_positions[letter] = position)
                        }
                    }
                    
                    for (let [letter, position] of Object.entries(letter_at_positions)) {
                        WILDWORD_LETTERS[position].classList.add("potential")
                        WILDWORD_LETTERS[position].classList.add("correct")
                        WILDWORD_LETTERS[position].children[0].innerText = letter
                    }
                })

                break
        }
    }
}

function wildwordLetterClicked(event) {
    console.log("wildword-letter clicked")

    if (wildcardSelected == null) {
        console.log("no wildcard is selected")
        return
    }

    if (!event.target.classList.contains("potential")) {
        console.log("can't place wildcard here")
        return
    }

    event.target.classList.remove("potential")
    event.target.classList.add("full")

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
            event.target.children[0].innerText = "p"
            break
        case WILDCARD_CORRECT:
            event.target.classList.add("correct")
            event.target.children[0].innerText = "c"
            break
    }

    wildcardSelected.classList.toggle("selected")
    wildcardSelected = null

    updateWildwordLetters()
}



                
// document.onclick = function() {
//     b.storage.sync.get("letter_states", function(result) {
//         console.log("found in storage:")
//         console.log(result)
//         console.log(result.letter_states)
//     })
// }
                
// const UNKNOWN_LETTER_COLOR = "#787c7e"
// const PRESENT_LETTER_COLOR = "#c9b458"
// const CORRECT_LETTER_COLOR = "#6aaa64"

// function updateWordCard(possible_letters_at_position) {
//     for (let [position, letters] of Object.entries(possible_letters_at_position)) {
//         if (letters.length == 1) {
//             document.getElementById("wildword-box-text-" + position).innerText = letters[0]
//             document.getElementById("wildword-box-text-" + position).parentElement.style.backgroundColor = CORRECT_LETTER_COLOR
//             document.getElementById("wildword-box-text-" + position).parentElement.style.outline = "0px"
//         }
//     }
// }

// function updateListWithLetterStates(letter_states) {
//     let helperOptions = {}
//     helperOptionNames.forEach(option => helperOptions[option] = document.getElementById(option).checked)
//     filterWords(letter_states, helperOptions)
// }

// function filterWords() {
//     // TODO
//     return
// }