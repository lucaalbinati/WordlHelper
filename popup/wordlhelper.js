
////////////////////////////////////
///////////  Constants  ////////////
////////////////////////////////////

const WILDCARDS = Array.from(document.getElementsByClassName("wildcard selectable"))
const WILDWORD_LETTERS = Array.from(document.getElementById("wildword-letters").children)

const WILDCARD_ALL = "wildcard-all"
const WILDCARD_UNKNOWN = "wildcard-unknown"
const WILDCARD_PRESENT = "wildcard-present"
const WILDCARD_CORRECT = "wildcard-correct"

let wildcardSelected = null

////////////////////////////////////
//////////////  MAIN  //////////////
////////////////////////////////////

browser.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var url = tabs[0].url

    if (url.includes("powerlanguage.co.uk/wordle")) {
        document.getElementById("error").hidden = true
        setupEventListeners()
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
    setupWildwordSelectablesEventListener()
}

function setupGitHubEventListener() {
    document.getElementById("github-image").onclick = function() {
        window.open("https://github.com/lucaalbinati/WordlHelper")
        window.close()
    }
}

function setupWildwordSelectablesEventListener() {
    WILDCARDS.forEach(wildcard => {
        wildcard.onclick = wildcardClicked
        
    })    
}

////////////////////////////////////
////////  Word List Setup  /////////
////////////////////////////////////

function loadWordList() {
    browser.storage.local.get("wordList", function(result) {
        if (result.wordList == null) {
            let textUrl = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"

            fetch(textUrl).then(r => r.text()).then(t => {
                let wordList = t.split("\r\n").filter(w => w.length == 5)
                browser.storage.local.set({wordList}, () => console.log("loaded and stored 'wordList'"))
            })
        } else {
            console.log("'wordList' has already been loaded")
        }
    })
}

////////////////////////////////////
//////  Wildcard Logic & UI  ///////
////////////////////////////////////

function wildcardClicked(event) {
    if (wildcardSelected != null) {
        wildcardSelected.classList.remove("selected")
        wildcardSelected.classList.add("selectable")

        if (event.target == wildcardSelected) {
            wildcardSelected = null
        } else {
            event.target.classList.add("selected")
            event.target.classList.remove("selectable")
            wildcardSelected = event.target
        }
    } else {
        event.target.classList.add("selected")
        event.target.classList.remove("selectable")
        wildcardSelected = event.target
    }

    updateWildwordLetters()
}

function updateWildwordLetters() {
    if (wildcardSelected == null) {
        throw new Exception(`Expected 'wildcardSelected' to be non-null`)
    }

    if (wildcardSelected == null) {
        WILDWORD_LETTERS.forEach(wildwordLetter => {
            wildwordLetter.classList.remove("potential")
            console.log(wildwordLetter.classList)
        })
    } else {
        switch (wildcardSelected.id) {
            case WILDCARD_ALL:
            case WILDCARD_UNKNOWN:
                WILDWORD_LETTERS.forEach(wildwordLetter => {
                    wildwordLetter.classList.add("potential")
                })
                break
            
            case WILDCARD_PRESENT:
                browser.storage.sync.get("letter_states", function(result) {
                    console.log(result.letter_states)
                    console.info(result.letter_states)
                    console.warn(result.letter_states)

                    // let present_letters_positions = new Set()

                    // for (let [letter, value] of Object.entries(result.letter_states)) {
                    //     if (value == "absent") {
                    //         continue
                    //     }

                    //     if ("present" in value) {
                    //         value["present"].forEach(position => present_letters_positions.add(position))
                    //     }
                    // }

                    // for (let position of present_letters_positions) {
                    //     WILDWORD_LETTERS[position].classList.add("potential")
                    // }
                })

                break

            case WILDCARD_CORRECT:

                break
        }
    }
}

// function wildcardSelected(event) {
//     console.log(event.target)
//     // event.target.checked = true
//     console.log(event.target.checked)
//     // event.target.className = event.target.className.replace("selectable", "selected")

//     switch (event.target.id) {
//         case WILDCARD_ALL:
//         case WILDCARD_UNKNOWN:
//             WILDWORD_LETTERS.forEach(wildwordLetter => {
//                 wildwordLetter.className += " potential"
//             })
//             break
        
//         case WILDCARD_PRESENT:

//             break

//         case WILDCARD_CORRECT:

//             break
//     }

//     // event.target.checked = false
// }





                
// document.onclick = function() {
//     browser.storage.sync.get("letter_states", function(result) {
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