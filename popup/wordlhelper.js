
////////////////////////////////////
///////////  Constants  ////////////
////////////////////////////////////

const WILDCARDS = Array.from(document.getElementsByClassName("wildword-box-selectable"))
const WILDWORD_LETTERS = Array.from()


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
    wildcards.forEach(element => {
        element.onclick = wildwordBoxSelected
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
//////  Wildword Logic & UI  ///////
////////////////////////////////////

function wildwordBoxSelected(event) {
    switch (event.target.id) {
        case "wildword-box-all":
        case "wildword-box-unknown":
            
            break
        
        case "wildword-box-present":
        case "wildword-box-correct":
    }
}





                
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