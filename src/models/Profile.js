import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Profile = sequelize.define(
  "Profile",
  {
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
      allowNull: false
    },

    jobTitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    profileUrl: {
      type: DataTypes.STRING(2048),
      allowNull: true
    },

    profileImageUrl: {
      type: DataTypes.STRING(2048),
      allowNull: true
    },
    
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    }
  },
  {
    tableName: "profiles",
    sequelize,
    timestamps: true,
    underscored: true
  }
);

// Fields that should be compared/updated when syncing scraped profiles
export const profileUpdatableFields = [
  "name",
  "jobTitle",
  "profileUrl",
  "profileImageUrl",
];