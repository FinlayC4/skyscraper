import { DataTypes } from "sequelize";
import { sequelize } from "../db.js"; // import the connection

export const Profile = sequelize.define("Profile", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },

  profileId: {
    type: DataTypes.INTEGER.UNSIGNED,
    unique: true,
    allowNull: false
  },

  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  jobTitle: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  // Leaving out 'section' for now

  profileUrl: {
    type: DataTypes.STRING(2048),
    allowNull: true,
  },

  profileImageUrl: {
    type: DataTypes.STRING(2048),
    allowNull: true,
  }
}, {
  timestamps: true,       // optional: disable createdAt/updatedAt
  underscored: true
});
