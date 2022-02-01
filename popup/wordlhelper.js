
browser.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var url = tabs[0].url

    if (url.includes("powerlanguage.co.uk/wordle")) {
        document.getElementById("error-content").hidden = true
        loadHelper()
    } else {
        document.getElementById("helper").hidden = true
    }
})

const HELPER_OPTIONS_KEY = "helperOptions"
let helperOptionDefaults = {
    "unknown-letters-only": false,
    "include-present-letters": false,
    "include-correct-letters": false
}
let helperOptionNames = Object.keys(helperOptionDefaults)

helperOptionNames.forEach(option => document.getElementById(option).onclick = checkHelperOptionsConsistency)
helperOptionNames.forEach(option => document.getElementById(option).onchange = updateHelperOptions)

function checkHelperOptionsConsistency(event) {
    switch (event.target.id) {
        case "unknown-letters-only": {
            if (document.getElementById("unknown-letters-only").checked) {
                document.getElementById("include-present-letters").checked = false
                document.getElementById("include-correct-letters").checked = false
            }
        }
        case "include-present-letters": {
            if (document.getElementById("include-present-letters").checked) {
                document.getElementById("unknown-letters-only").checked = false
            }
        }
        case "include-correct-letters": {
            if (document.getElementById("include-correct-letters").checked) {
                document.getElementById("unknown-letters-only").checked = false
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
        updateListWithLetterStates(letter_states)
    })
}

function updateListWithLetterStates(letter_states) {
    let helperOptions = {}
    helperOptionNames.forEach(option => helperOptions[option] = document.getElementById(option).checked)
    filterWords(letter_states, helperOptions)
}

function filterWords(letter_states, helperOptions) {
    var available_letters = Object.keys(letter_states)
    
    if (helperOptions["unknown-letters-only"]) {
        available_letters = available_letters.filter(letter => letter_states[letter] == "unknown")
    }

    if (!helperOptions["include-presentt-letters"]) {
        available_letters = available_letters.filter(letter => letter_states[letter] != "present")
    }

    if (!helperOptions["include-correct-letters"]) {
        // TODO using correct letters should also consider the position (change how we gather the letters in 'content-script.js' by looking at the word grid instead)
        available_letters = available_letters.filter(letter => letter_states[letter] != "correct")
    }

    browser.storage.local.get("wordList", function(result) {
        if (result.wordList) {
            let filteredWords = result.wordList.filter(word => {
                for (const letter of word) {
                    if (!available_letters.includes(letter)) {
                        return false
                    }
                }
                return true
            })
            document.getElementById("possible-words").innerText = filteredWords.join("\n")
        }
    })
}

function loadHelper() {
    loadWordList()
    loadHelperOptions()
    updateList()
}