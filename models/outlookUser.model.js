const {sequelize} = require('../db')
const { Sequelize, DataTypes } = require('sequelize');

const outlookUser = sequelize.define('OutlookUser', {
  OutlookId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  refreshToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = {outlookUser};