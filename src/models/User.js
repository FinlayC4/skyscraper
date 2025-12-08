import { DataTypes } from "sequelize";
import { sequelize } from "../db.js"; // import the connection

export const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(254),
    unique: true,
    allowNull: false
  }
}, {
  timestamps: true,       // optional: disable createdAt/updatedAt
  underscored: true
});
