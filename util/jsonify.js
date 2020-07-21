const through = require('through2');

module.exports = function(file) {
    const prefix = 'JSON.parse(';
    return through(function(buf, enc, next) {
        let text = buf.toString('utf8');
        let prefixBegins = text.indexOf(prefix);

        while (prefixBegins >= 0) {
            let firstApostrophe = text.indexOf('"', prefixBegins + prefix.length);
            if (firstApostrophe < 0) {
                break;
            }

            let spaces = text.substr(prefixBegins + prefix.length, firstApostrophe - prefixBegins - prefix.length);
            if (spaces.trim().length !== 0) {
                prefixBegins = text.indexOf(prefix, firstApostrophe + 1);
                continue;
            }

            let escaped = false;
            let lastApostrophe = -1;

            for (let i = firstApostrophe + 1; i < text.length; i++) {
                if (escaped) {
                    escaped = false;
                    continue;
                }

                let c = text.charCodeAt(i);
                switch (c) {
                    case 92: { // Backslash
                        escaped = true;
                        continue;
                    }
                    case 34: { // Apostrophe
                        lastApostrophe = i;
                        break;
                    }
                    default: continue;
                }

                break;
            }

            if (lastApostrophe >= 0) {
                let endParanthesis = text.indexOf(')', lastApostrophe);

                if (endParanthesis >= 0) {
                    spaces = text.substr(lastApostrophe + 1, endParanthesis - lastApostrophe - 1);
                    let json = text.substr(firstApostrophe, lastApostrophe - firstApostrophe + 1);
                    if (spaces.trim().length === 0) {
                        let parsed = JSON.parse(json);
                        text = text.substr(0, prefixBegins) +
                               parsed +
                               text.substr(endParanthesis + 1);
                        prefixBegins = text.indexOf(prefix, prefixBegins + parsed.length + 1);
                        continue;
                    }
                }
            }

            break;
        }

        this.push(text);
        next();
    });
};
