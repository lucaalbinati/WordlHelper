
////////////////////////////////////
///////////  Constants  ////////////
////////////////////////////////////

const GET_LETTER_STATES_HEADER = "getLetterStates"

const ABSENT_LETTER_STATE = "absent"
const PRESENT_LETTER_STATE = "present"
const CORRECT_LETTER_STATE = "correct"

////////////////////////////////////
//////////////  MAIN  //////////////
////////////////////////////////////

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.header) {
        case GET_LETTER_STATES_HEADER:
            console.log(`received a '${GET_LETTER_STATES_HEADER}' message from '${sender.id}'`)
            let letter_states = getLetterStates()
            let words_tried = getWordsTried()
            console.log(`fetched 'letter_states' and 'words_tried' and sending the answer back to '${sender.id}'`)
            sendResponse({letterStates: letter_states, wordsTried: Array.from(words_tried)})
            break
        default:
            console.log(`received a message from '${sender.id}' with unknown header '${request.header}'`)
    }
})

////////////////////////////////////
///////  Fetch Letter States  //////
////////////////////////////////////

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}

function scrapeLetterStates() {
    let letter_states = {}
    let wordRows = getWordRows()

    for (let wordRow of wordRows) {
        if (wordRow.getAttribute("letters") == "") {
            break
        }

        let letters = wordRow.shadowRoot.children[1].children
        for (let i = 0; i < letters.length; ++i) {
            let letter = letters[i].getAttribute("letter")
            let evaluation = letters[i].getAttribute("evaluation")

            if (!(letter in letter_states)) {
                letter_states[letter] = {}
            }
            
            switch (evaluation) {
                case CORRECT_LETTER_STATE:
                case PRESENT_LETTER_STATE:
                    if (letter in letter_states && evaluation in letter_states[letter]) {
                        letter_states[letter][evaluation].push(i)
                    } else if (letter in letter_states && letter_states[letter] == CORRECT_LETTER_STATE) {
                        continue
                    } else {
                        letter_states[letter][evaluation] = [i]
                    }
                    break
                
                case ABSENT_LETTER_STATE:
                    if (!(letter in letter_states)) {
                        letter_states[letter] = evaluation
                    }
                    break
            }
        }
    }

    return letter_states
}

function cleanLetterStates(letter_states) {
    for (let [letter, value] of Object.entries(letter_states)) {
        if (value == ABSENT_LETTER_STATE) {
            continue
        }

        if (CORRECT_LETTER_STATE in value && PRESENT_LETTER_STATE in value) {
            // if we know where a letter is (i.e. "correct"), we can ignore the "present" position(s)
            delete letter_states[letter][PRESENT_LETTER_STATE]
        }

        if (PRESENT_LETTER_STATE in value && hasDuplicates(value[PRESENT_LETTER_STATE])) {
            // if a letter has been tried several times at the same position and it is "present", we can just keep one (ignore duplicates)
            letter_states[letter][PRESENT_LETTER_STATE] = Array.from(new Set(letter_states[letter][PRESENT_LETTER_STATE]))
        }
    }
}

function getLetterStates() {
    var letter_states = scrapeLetterStates()
    cleanLetterStates(letter_states)
    return letter_states
}

function getWordsTried() {
    let wordsTried = new Set()
    let wordRows = getWordRows()
    for (let wordRow of wordRows) {
        let wordTried = wordRow.getAttribute("letters")
        if (wordTried != "") {
            wordsTried.add(wordTried)
        }
    }
    return wordsTried
}

function getWordRows() {
    return document.getElementsByTagName("game-app")[0].shadowRoot.children[1].children[1].children[0].children[0].children
}