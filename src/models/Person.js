import { DataTypes } from "sequelize";
import { sequelize } from "../db.js"; // import the connection

export const Person = sequelize.define("Person", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },

  skyId: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false
  },

  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  jobTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Leaving out 'section' for now

  profileUrl: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },

  profileImageUrl: {
    type: DataTypes.STRING(512),
    allowNull: true,
  }
}, {
  timestamps: true,       // optional: disable createdAt/updatedAt
  underscored: true
});
