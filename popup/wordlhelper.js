
browser.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var url = tabs[0].url

    if (url.includes("powerlanguage.co.uk/wordle")) {
        document.getElementById("error").hidden = true
        loadHelper()
    } else {
        document.getElementById("helper").hidden = true
    }
})

document.getElementById("github-image").onclick = function() {
    window.open("https://github.com/lucaalbinati/WordlHelper")
    window.close()
}

let HELPER_OPTIONS_KEY = "helperOptions"
const UNKNOWN_LETTERS_ONLY = "unknown-letters-only"
const INCLUDE_PRESENT_LETTERS = "include-present-letters"
const USE_CORRECT_LETTERS = "use-correct-letters"

let helperOptionDefaults = {}
helperOptionDefaults[UNKNOWN_LETTERS_ONLY] = false
helperOptionDefaults[INCLUDE_PRESENT_LETTERS] = false
helperOptionDefaults[USE_CORRECT_LETTERS] = false

let helperOptionNames = Object.keys(helperOptionDefaults)
console.log(helperOptionNames)

helperOptionNames.forEach(option => document.getElementById(option).onclick = checkHelperOptionsConsistency)
helperOptionNames.forEach(option => document.getElementById(option).onchange = updateHelperOptions)

function checkHelperOptionsConsistency(event) {
    switch (event.target.id) {
        case UNKNOWN_LETTERS_ONLY: {
            if (document.getElementById(UNKNOWN_LETTERS_ONLY).checked) {
                document.getElementById(INCLUDE_PRESENT_LETTERS).checked = false
                document.getElementById(USE_CORRECT_LETTERS).checked = false
            }
        }
        case INCLUDE_PRESENT_LETTERS: {
            if (document.getElementById(INCLUDE_PRESENT_LETTERS).checked) {
                document.getElementById(UNKNOWN_LETTERS_ONLY).checked = false
            }
        }
        case USE_CORRECT_LETTERS: {
            if (document.getElementById(USE_CORRECT_LETTERS).checked) {
                document.getElementById(UNKNOWN_LETTERS_ONLY).checked = false
            }
        }
    }
}

function updateHelperOptions() {
    let helperOptions = {}
    helperOptionNames.forEach(option => helperOptions[option] = document.getElementById(option).checked)
    browser.storage.sync.set({helperOptions})
    updateList()
}

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

function loadHelperOptions() {
    browser.storage.sync.get(HELPER_OPTIONS_KEY, function(result) {
        if (result == null || result[HELPER_OPTIONS_KEY] == null || !helperOptionNames.every(option => result[HELPER_OPTIONS_KEY][option] != undefined)) {
            console.log(`key '${HELPER_OPTIONS_KEY}' was either not in storage or was missing fields... resetting it to defaults`)
            let helperOptions = {}
            helperOptionNames.forEach(option => helperOptions[option] = helperOptionDefaults[option])
            browser.storage.sync.set({helperOptions})
        } else {
            console.log(`found '${HELPER_OPTIONS_KEY}' key in storage`)
            helperOptionNames.forEach(option => document.getElementById(option).checked = result[HELPER_OPTIONS_KEY][option])
        }
    })
}

function getLetterStates(callback) {
    browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
        browser.tabs.sendMessage(tabs[0].id, {command: "getLetterStates"}, function(message) {
            if (message.response) {
                console.log(message.response)
                callback(message.response)
            } else {
                console.log("didn't received the expected response for 'getLetterStates'")
            }
        })
    })

}

function updateList() {
    console.log("updating list...")

    getLetterStates(function(letter_states) {
        let helperOptions = {}
        helperOptionNames.forEach(option => helperOptions[option] = document.getElementById(option).checked)
        let customWord = constructCustomWord(letter_states, helperOptions)
        // updateWordCard(customWord)
        // updateWordList(customWord)
    })
}

function constructCustomWord(letter_states, helperOptions) {
    let alphabet = "abcdefghijklmnopqrstuvwxyz"

    let possible_letters_at_position = {
        0: new Set(Array.from(alphabet)),
        1: new Set(Array.from(alphabet)),
        2: new Set(Array.from(alphabet)),
        3: new Set(Array.from(alphabet)),
        4: new Set(Array.from(alphabet))
    }

    console.log(possible_letters_at_position)

    if (helperOptions[USE_CORRECT_LETTERS]) {
        for (let [letter, value] of Object.entries(letter_states)) {
            if (value == "absent") {
                continue
            }

            if ("correct" in value) {
                let position = letter_states[letter]["correct"][0]
                possible_letters_at_position[position] = letter
            }
        }
    }

    if (helperOptions[INCLUDE_PRESENT_LETTERS]) {
        for (let [letter, value] of Object.entries(letter_states)) {
            if (value == "absent") {
                continue
            }

            if ("present" in value) {
                let positions = letter_states[letter]["present"]
                let possible_positions = [0, 1, 2, 3, 4].filter(pos => !(pos in positions))
                console.log(positions)
                console.log(possible_letters_at_position)

                // for (let possible_position of possible_positions) {
                //     possible_letters_at_position[possible_position] = 
                // }
            }
        }
    }

    console.log(possible_letters_at_position)

}

const UNKNOWN_LETTER_COLOR = 0x787c7e
const PRESENT_LETTER_COLOR = 0xc9b458
const CORRECT_LETTER_COLOR = 0x6aaa64

function updateWordCard(customWord) {

}

function updateListWithLetterStates(letter_states) {
    let helperOptions = {}
    helperOptionNames.forEach(option => helperOptions[option] = document.getElementById(option).checked)
    filterWords(letter_states, helperOptions)
}

function filterWords(letter_states, helperOptions) {
    // var available_letters = Object.keys(letter_states)
    
    // if (helperOptions[UNKNOWN_LETTERS_ONLY]) {
    //     available_letters = available_letters.filter(letter => letter_states[letter] == "unknown")
    // }

    // if (!helperOptions[INCLUDE_PRESENT_LETTERS]) {
    //     available_letters = available_letters.filter(letter => letter_states[letter] != "present")
    // }

    // if (!helperOptions[USE_CORRECT_LETTERS]) {
    //     // TODO using correct letters should also consider the position (change how we gather the letters in 'content-script.js' by looking at the word grid instead)
    //     available_letters = available_letters.filter(letter => letter_states[letter] != "correct")
    // }

    // browser.storage.local.get("wordList", function(result) {
    //     if (result.wordList) {
    //         let filteredWords = result.wordList.filter(word => {
    //             for (const letter of word) {
    //                 if (!available_letters.includes(letter)) {
    //                     return false
    //                 }
    //             }
    //             return true
    //         })
    //         document.getElementById("possible-words").innerText = filteredWords.join("\n")
    //     }
    // })
}

function loadHelper() {
    loadWordList()
    loadHelperOptions()
    updateList()
}