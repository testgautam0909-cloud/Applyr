const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer to be within the project directory.
    // This ensures that the browser is bundled with the application and available at runtime on Render.
    cacheDirectory: join(__dirname, '.puppeteer-cache'),
};
