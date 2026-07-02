const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'config.json');
let cachedConfig = null;

function loadConfig() {
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

function getConfig() {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }

  return cachedConfig;
}

function reloadConfig() {
  cachedConfig = loadConfig();
  return cachedConfig;
}

function saveConfig(config) {
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  cachedConfig = config;
  return cachedConfig;
}

function updateConfig(patch) {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    queue: {
      ...(current.queue || {}),
      ...(patch.queue || {})
    },
    cors: {
      ...(current.cors || {}),
      ...(patch.cors || {})
    }
  };

  return saveConfig(next);
}

module.exports = {
  getConfig,
  reloadConfig,
  saveConfig,
  updateConfig
};
