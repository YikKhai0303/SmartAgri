// Utils - ID Generator
// backend\utils\idGenerator.js

function generateId(prefix) {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substr(2, 2).toUpperCase();
  return (prefix + time + rand).slice(0, 8);
}

module.exports = generateId;
