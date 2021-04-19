const select = require('./cdn');

(async function main() {
    const serve = await select();
    await serve('/news-politics');
})();

