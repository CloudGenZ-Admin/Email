import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const SubmissionLog = sequelize.define(
  "SubmissionLog",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    formId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    clientIp: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    referrer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    formData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("SENT", "FAILED", "BLOCKED_RATE_LIMIT", "BLOCKED_SPAM"),
      allowNull: false,
      defaultValue: "SENT",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emailMessageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "submission_logs",
    indexes: [
      { fields: ["clientIp"] },
      { fields: ["formId"] },
      { fields: ["status"] },
      { fields: ["createdAt"] },
    ],
  }
);
