
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < ALPHABET.length; i++) {
    LOOKUP[ALPHABET.charCodeAt(i)] = i;
}

export function decodeBase64(base64) {
    let bufferLength = base64.length * 0.75,
        len = base64.length, i, p = 0,
        encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === "=") {
        bufferLength--;
        if (base64[base64.length - 2] === "=") {
            bufferLength--;
        }
    }

    let arrayBuffer = new ArrayBuffer(bufferLength),
        bytes = new Uint8Array(arrayBuffer);

    for (let i = 0; i < len; i += 4) {
        encoded1 = LOOKUP[base64.charCodeAt(i)];
        encoded2 = LOOKUP[base64.charCodeAt(i + 1)];
        encoded3 = LOOKUP[base64.charCodeAt(i + 2)];
        encoded4 = LOOKUP[base64.charCodeAt(i + 3)];

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6)  | (encoded4 & 63);
    }

    return arrayBuffer;
}
