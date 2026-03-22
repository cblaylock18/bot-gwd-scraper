import puppeteer from 'puppeteer';
import { Answer, DailyGame } from './game.js';
import { insertDailyGame } from './db.js';

// Initialize objects to hold the scraped data
const answers = [];

// Launch the browser and open a new blank page.
const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
  ],
});
// const browser = await puppeteer.launch({ headless: false }); // for debugging

const page = await browser.newPage();
page.setDefaultTimeout(60000);
await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', {
  architecture: 'x86',
  platform: 'Linux x86_64',
  fullVersionList: [{ brand: 'Chrome', version: '120.0.0.0' }],
});

// Navigate the page to a URL.
await page.goto('https://thrice.geekswhodrink.com/', {
  waitUntil: 'networkidle2',
  timeout: 60000
});

// Set screen size.
await page.setViewport({ width: 1080, height: 1024 });

// click play the game
await page.locator('a::-p-text("Play the game")').click();

// wait for the modal to be gone before proceeding
await page.waitForSelector('[data-modal-target="body"]', { hidden: true });

for (let i = 0; i < 5; i++) {
  // repeat 5 times to account for each round
  // find the element with "Category:" and grab the text next to it
  const span = await page.waitForSelector('span::-p-text("Category:")');
  const category = await span.evaluate(el => el.nextSibling.textContent.trim());

  const questions = [];

  for (let j = 0; j < 3; j++) {
    // repeat 3 times for each individual round
    // grab the text of the question
    const question = await page.waitForSelector('div.clue-text');
    const questionContent = await question.evaluate(el => el.textContent.trim());

    questions.push(questionContent);

    // click "Submit" to show the next question
    await page.locator('button::-p-text("Submit")').click();

    if (j < 2) {
      // wait for clue text to change before grabbing the next one
      await page.waitForFunction(
        (prev) => document.querySelector('div.clue-text')?.textContent.trim() !== prev,
        {},
        questionContent
      );
    }
  }
  // if this is the last question, grab the answer and click "Next Question (or close the browser)"
  const answerDiv = await page.waitForSelector('::-p-text("The answer is")');
  const answerSpan = await answerDiv.$('span.font-bold');
  const answer = await answerSpan.evaluate(el => el.textContent.trim());

  // add info to the answers array
  answers.push(new Answer(category, questions, answer));

  if (i < 4) {
    await page.locator('a::-p-text("Next Question")').click();
    await page.waitForNetworkIdle(); // wait for the next question to load before proceeding
  }


}
await browser.close();

// create game object and return json
const game = new DailyGame(new Date(), answers);

await insertDailyGame(game);


