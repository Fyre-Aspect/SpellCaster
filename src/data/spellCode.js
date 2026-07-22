// Code incantations for the "Code spells" battle style. Each entry pairs a
// real JavaScript line with a plain-English synopsis shown while you type.
// Tiers match the word-spell lengths: short ~15-30 chars, medium ~35-55,
// long ~60-90.

export const CODE_SPELLS = {
  short: [
    { code: "arr.filter(Boolean)", synopsis: "Drops every falsy value from the array" },
    { code: "Math.max(...nums)", synopsis: "Finds the biggest number in the list" },
    { code: "[...new Set(list)]", synopsis: "Removes duplicates from the list" },
    { code: "str.trim().length", synopsis: "Counts the characters after cutting outer spaces" },
    { code: "nums.sort((a, b) => a - b)", synopsis: "Sorts the numbers from smallest to largest" },
    { code: "Object.keys(obj).length", synopsis: "Counts how many properties the object has" },
  ],
  medium: [
    {
      code: "const evens = nums.filter(n => n % 2 === 0);",
      synopsis: "Keeps only the even numbers",
    },
    {
      code: "const total = prices.reduce((a, b) => a + b, 0);",
      synopsis: "Adds every price together into one total",
    },
    {
      code: "const names = users.map(u => u.name.trim());",
      synopsis: "Collects each user's name with spaces trimmed off",
    },
    {
      code: "const [first, ...rest] = queue.slice();",
      synopsis: "Splits the queue into its first item and the rest",
    },
    {
      code: "if (!seen.has(id)) seen.add(id);",
      synopsis: "Records the id only if it hasn't been seen yet",
    },
    {
      code: "const found = items.find(i => i.id === id);",
      synopsis: "Finds the first item with a matching id",
    },
  ],
  long: [
    {
      code: "const sorted = [...players].sort((a, b) => b.score - a.score);",
      synopsis: "Copies the players list and ranks it from highest score down",
    },
    {
      code: "fetch(url).then(res => res.json()).then(data => render(data));",
      synopsis: "Downloads data from a URL and draws it on screen",
    },
    {
      code: "const byId = Object.fromEntries(tags.map(t => [t.id, t]));",
      synopsis: "Turns a list of tags into a quick lookup table by id",
    },
    {
      code: "setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);",
      synopsis: "Refreshes the on-screen clock once every second",
    },
    {
      code: "const words = text.toLowerCase().split(/\\s+/).filter(Boolean);",
      synopsis: "Breaks the text into lowercase words, skipping blanks",
    },
  ],
};
