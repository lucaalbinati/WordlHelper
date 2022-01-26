
f = open("word-list-raw.txt", "r")

new_file = open("word-list-5.txt", "w+")

for line in f.readlines():
    word = line.strip()
    if word.isalpha() and len(word) == 5:
        new_file.write(word + "\n")

f.close()
new_file.close()