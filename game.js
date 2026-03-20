export class Answer {
  constructor(category, questions, answer) {
    this.category = category;       // string
    this.questions = questions;     // array of 3 strings, index 0 = hardest
    this.answer = answer; // string
  }

  print() {
    console.log(`Category: ${this.category}`);
    console.log(`Questions: ${this.questions.join(' | ')}`);
    console.log(`Answer: ${this.answer}`);
  }

}

export class DailyGame {
  constructor(date, answers) {
    this.date = date;       // Date or date string
    this.answers = answers; // array of 5 Answer instances
  }

  print() {
    console.log(`Date: ${this.date}`);
    this.answers.forEach((answer, i) => {
      console.log(`\n--- Answer ${i + 1} ---`);
      answer.print();
    });
  }

  getJSON() {
    return JSON.stringify(this);
  }
}