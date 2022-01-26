
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

// function findCorrectSpotLetters() {
//     browser.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
//         console.log(tabs[0].url)
//         console.log(tabs[0])
//         console.log(tabs[0].document.getElementById("a"))
//         console.log(tabs[0].document.getElementById("keyboard"))
//     })

// }

function loadHelper() {
    loadWordList()
    loadHelperOptions()

    // findCorrectSpotLetters()
    // findIncorrectSpotLetters()
    
    let useOnlyUnknownLetters = document.getElementById("unknown-letters-only-switch").checked
    filterWords(useOnlyUnknownLetters)
}

function filterWords(useOnlyUnknownLetters) {
    browser.storage.local.get("wordList", function(result) {
        if (result.wordList) {
            let filteredWords = result.wordList//.filter(w => w.includes("hack"))
            document.getElementById("possible-words").innerText = filteredWords.join("\n")
        }
    })
}