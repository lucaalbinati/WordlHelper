#!/bin/bash

WORDLE_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd $WORDLE_DIR

function zip_source() {
    ZIP_FILENAME="WordlHelper$1.zip"

    zip -r $ZIP_FILENAME . > /dev/null

    zip -d $ZIP_FILENAME "__MACOSX*" > /dev/null
    zip -d $ZIP_FILENAME "*.DS_Store" > /dev/null

    echo "Created '$ZIP_FILENAME'"
}

if [[ $# -eq 0 ]]; then
    zip_source
elif [[ $# -eq 1 ]]; then
    if [[ "$1" == "--chrome" ]]; then
        sed -i '' 's/"manifest_version": 2/"manifest_version": 3/g' manifest.json
        sed -i '' 's/"browser_action":/"action":/g' manifest.json
        zip_source "_Chrome"
        sed -i '' 's/"manifest_version": 3/"manifest_version": 2/g' manifest.json
        sed -i '' 's/"action":/"browser_action":/g' manifest.json
    else
        echo "Unknown argument: $1"
    fi 
else
  echo "Unexpected number of arguments: expecting 0 or 1, instead got $#"
fi