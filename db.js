import mysql from 'mysql2/promise';


export async function insertDailyGame(game) {
  let db;
  try {
    // create the connection to database
    db = await mysql.createConnection(
      process.env.DB_HOST
        ? {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        }
        : {
          socketPath: process.env.DB_SOCKET_PATH || `/cloudsql/quizgame-491018:us-west1:quizgame`,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        }
    );

    // execute will internally call prepare and query
    // insert game
    const [gameResult] = await db.execute(
      'INSERT INTO games (date) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
      [game.date]
    );
    const gameId = gameResult.insertId;

    // insert answers and questions
    for (let i = 0; i < game.answers.length; i++) {
      const a = game.answers[i];
      const [answerResult] = await db.execute(
        'INSERT INTO answers (game_id, category, answer, sort_order) VALUES (?, ?, ?, ?)',
        [gameId, a.category, a.answer, i]
      );
      const answerId = answerResult.insertId;

      for (let j = 0; j < a.questions.length; j++) {
        await db.execute(
          'INSERT INTO questions (answer_id, question, difficulty) VALUES (?, ?, ?)',
          [answerId, a.questions[j], j + 1]
        );
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    // Close the connection
    if (db) await db.end();
  }
}
