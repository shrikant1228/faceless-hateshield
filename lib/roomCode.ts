// Generates a short room code like PUBG/Free Fire lobby codes, e.g. "7K2P9X"
// Excludes visually-confusing characters (0/O, 1/I/L).

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
