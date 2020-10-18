const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    const model = sequelize.define("User", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        login: {
            type: Sequelize.STRING,
        },
        password: {
            type: Sequelize.STRING,
        },
        isAdmin: {
            type: Sequelize.BOOLEAN,
        },
        token: {
            type: Sequelize.STRING,
        },
    }, { timestamps: false });

    return model;
};