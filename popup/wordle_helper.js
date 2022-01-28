
browser.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var url = tabs[0].url

    if (url.includes("powerlanguage.co.uk/wordle")) {
        document.getElementById("error-content").hidden = true
        loadHelper()
    } else {
        document.getElementById("helper").hidden = true
    }
})


document.getElementById("unknown-letters-only-switch").onclick = function() {
    let useOnlyUnknownLetters = document.getElementById("unknown-letters-only-switch").checked
    browser.storage.sync.set({useOnlyUnknownLetters})
    console.log(`set 'useOnlyUnknownLetters' to '${useOnlyUnknownLetters}'`)

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
    browser.storage.sync.get("useOnlyUnknownLetters", function(result) {
        if (result.useOnlyUnknownLetters != null) {
            console.log(`found 'useOnlyUnknownLetters' in storage, with value '${result.useOnlyUnknownLetters}'`)
            document.getElementById("unknown-letters-only-switch").checked = result.useOnlyUnknownLetters
        } else {
            console.log("did not find 'useOnlyUnknownLetters' in storage")
            let useOnlyUnknownLetters = false
            browser.storage.sync.set({useOnlyUnknownLetters}, () => console.log(`set 'useOnlyUnknownLetters' to '${useOnlyUnknownLetters}'`))
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
    let useOnlyUnknownLetters = document.getElementById("unknown-letters-only-switch").checked
    filterWords(letter_states, useOnlyUnknownLetters)
}

function filterWords(letter_states, useOnlyUnknownLetters) {
    var available_letters = Object.keys(letter_states)
    
    if (useOnlyUnknownLetters) {
        available_letters = available_letters.filter(letter => letter_states[letter] == "unknown")
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