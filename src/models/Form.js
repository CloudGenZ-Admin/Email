import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Form = sequelize.define(
  "Form",
  {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "Form Submission",
    },
    recipients: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "America/Toronto",
    },
  },
  {
    tableName: "forms",
    timestamps: true,
  }
);
