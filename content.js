
////////////////////////////////////
///////////  Constants  ////////////
////////////////////////////////////

const GET_LETTER_STATES_HEADER = "getLetterStates"

const CORRECT = "correct"
const PRESENT = "present"
const ABSENT = "absent"

////////////////////////////////////
//////////////  MAIN  //////////////
////////////////////////////////////

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.header) {
        case GET_LETTER_STATES_HEADER:
            console.log(`received a '${GET_LETTER_STATES_HEADER}' message from '${sender.id}'`)
            let letter_states = getLetterStates()
            console.log(`fetched 'letter_states' and sending the answer back to '${sender.id}'`)
            sendResponse({letterStates: letter_states})
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
    let wordRows = document.getElementsByTagName("game-app")[0].shadowRoot.children[1].children[1].children[0].children[0].children

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
                case CORRECT:
                case PRESENT:
                    if (letter in letter_states && evaluation in letter_states[letter]) {
                        letter_states[letter][evaluation].push(i)
                    } else if (letter in letter_states && letter_states[letter] == CORRECT) {
                        continue
                    } else {
                        letter_states[letter][evaluation] = [i]
                    }
                    break
                
                case ABSENT:
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
        if (value == ABSENT) {
            continue
        }

        if (CORRECT in value && PRESENT in value) {
            // if we know where a letter is (i.e. "correct"), we can ignore the "present" position(s)
            delete letter_states[letter][PRESENT]
        }

        if (PRESENT in value && hasDuplicates(value[PRESENT])) {
            // if a letter has been tried several times at the same position and it is "present", we can just keep one (ignore duplicates)
            letter_states[letter][PRESENT] = Array.from(new Set(letter_states[letter][PRESENT]))
        }
    }
}

function getLetterStates() {
    var letter_states = scrapeLetterStates()
    cleanLetterStates(letter_states)
    return letter_states
}