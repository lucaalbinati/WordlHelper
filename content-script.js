
function isAlphabetLetter(c) {
    return c.toLowerCase() != c.toUpperCase()
}

function handleMessage(request, sender, sendResponse) {
    if (request.command == "getLetterStates") {
        console.log("received 'getLetterStates' message")

        let letter_states = {}

        let rows = document.getElementsByTagName("game-app")[0].shadowRoot.children[1].children[0].children[2].shadowRoot.children[1].children

        for (let row of rows) {
            for (let button of row.children) {
                let letter = button.getAttribute("data-key")
                if (letter != null && isAlphabetLetter(letter)) {
                    let letter_state = button.getAttribute("data-state")
                    letter_states[letter] = letter_state ? letter_state : "unknown"
                } else {
                }
            }
        }

        console.log("sending 'letter_states'")
                
        sendResponse({response: letter_states})
    }
}

browser.runtime.onMessage.addListener(handleMessage)
