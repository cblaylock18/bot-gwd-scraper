import mysql from 'mysql2/promise';

let db;
try {
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
        socketPath: `/cloudsql/quizgame-491018:us-west1:quizgame`,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
  );

  const [result] = await db.execute(
    'UPDATE games SET date = DATE_ADD(date, INTERVAL 1 DAY) WHERE id > 2 ORDER BY id DESC'
  );
  console.log(`Updated ${result.affectedRows} rows`);
} catch (err) {
  console.error(err);
} finally {
  if (db) await db.end();
}