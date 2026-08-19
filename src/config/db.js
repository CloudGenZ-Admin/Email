import { Sequelize } from "sequelize";
import mysql from "mysql2/promise";
import { config } from "./env.js";
import "../models/Form.js";
import "../models/SubmissionLog.js";

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
    },
  }
);

export async function connectDB() {
  try {
    const connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.name}\`;`);
    await connection.end();

    await sequelize.authenticate();
    console.log(`[Database] MySQL connected to '${config.db.name}' on ${config.db.host}:${config.db.port}`);

    await sequelize.sync({ alter: true });
    console.log("[Database] Models synchronized successfully.");
  } catch (error) {
    console.warn(`[Database] MySQL connection failed (${error.message}).`);
  }
}
