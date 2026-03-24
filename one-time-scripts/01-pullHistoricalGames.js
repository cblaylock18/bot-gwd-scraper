import mysql from 'mysql2/promise';
import puppeteer from 'puppeteer';
import { Answer, DailyGame } from '../game.js';
import { insertDailyGame } from '../db.js';

// Initialize objects to hold the scraped data
const games = [];

// Launch the browser and open a new blank page.
const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
  ],
});
// const browser = await puppeteer.launch({
//   args: [
//     '--no-sandbox',
//     '--disable-setuid-sandbox',
//     '--disable-blink-features=AutomationControlled',
//   ], headless: false, slowMo: 50
// }); // for debugging

const page = await browser.newPage();
page.setDefaultTimeout(60000);
await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
const startDate = "2026-03-20";
const endDate = "2026-03-22";

function getDatesArray(start, end) {
  const dates = [];
  // Create a new Date object from the start date to avoid modifying the original
  let currentDate = new Date(start);
  let endDate = new Date(end);

  // Calculate the number of days between the start and end dates
  const daysToAdd = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < daysToAdd; i++) {
    // Push a new Date object into the array to store a unique date instance
    dates.push(new Date(currentDate));
    // Increment the date by one day. JavaScript's Date object handles month/year rollovers automatically.
    currentDate.setDate(currentDate.getDate() + 1);
  }
  console.log(dates);
  return dates;
}

const dates = getDatesArray(startDate, endDate);

for (let m = 0; m < dates.length; m++) {
  // Navigate the page to a URL.
  const dateStr = dates[m].toISOString().split('T')[0];
  await page.goto(`https://thrice.geekswhodrink.com/stats?day=${dateStr}`, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Set screen size.
  await page.setViewport({ width: 1080, height: 1024 });

  // find the div with all the relevant info
  const infoDiv = await page.$('turbo-frame#day-view [data-controller="dropdown"]');

  const answers = [];

  for (let i = 0; i < 5; i++) {
    const answer = await infoDiv.evaluate((el, idx) => {
      const headers = el.querySelectorAll('[role="button"]');
      return headers[idx]?.querySelector('.flex.items-center.justify-between')?.firstChild?.textContent.trim();
    }, i);

    const questionDivs = await infoDiv.$$(`[data-dropdown-target="panel${i}"] .flex-grow.pl-1.border-l-8`);

    const questions = [];
    for (let j = 0; j < 3; j++) {
      const questionContent = await questionDivs[j].evaluate(el => el.textContent.trim());
      questions.push(questionContent);
    }

    answers.push(new Answer('', questions, answer));
  }

  await insertDailyGame(new DailyGame(dateStr, answers));
  console.log("Added game for " + dateStr);
}

await browser.close();